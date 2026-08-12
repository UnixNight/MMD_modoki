# WebM 出力の GPU loss 対応

更新日: 2026-08-11

## 背景

packaged build 0.2.3 で、3840x2160 / 60 FPS / 約 12,000 出力フレームの WebM 出力が数分進んだ後に失敗する事例を確認した。

主なログは次の組み合わせだった。

- `GPUDevice.createBuffer()` が `mappedAtCreation == true` の 16 KiB buffer を「大きすぎる」として失敗
- 続く `GPUBuffer.mapAsync()` が `A valid external Instance reference no longer exists` で失敗
- exporter が低レベルの `AbortError` だけを UI に返す

16 KiB は通常の buffer 制限として大きくない。この組み合わせは、長時間の WebGPU readback 中に device / external instance が失われ、その後の Babylon resource rebuild と readback が連鎖的に失敗したものとして扱う。

WebGPU の `GPUDevice.lost` は device lifetime 中 pending になり、device loss 時に理由を伴って resolve する。device は driver update や browser resource management などでも失われ得るため、アプリケーション側で明示的に扱う必要がある。

一次情報:

- [MDN: GPUDevice.lost](https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/lost)

## 対応

- WebM exporter が WebGPU engine の `GPUDevice.lost` を監視する。
- device loss を専用エラーへ変換し、app log に reason / message を残す。
- exporter failure progress に、失敗分類、最後に処理した frame、encoded / captured frame 数を残す。
- main UI は exporter window の close と前後しても terminal progress を受け取り、平易な failure toast と status を表示する。
- device loss 時は「graphics driver reset」「使用可能な動画は作成されていない」「1080p または 30 FPS で再試行」を案内する。
- 4K 以上、50 FPS 以上、60 秒以上の継続負荷になる WebM 出力は、hidden exporter だけを WebGL2 compatibility renderer で起動する。通常 viewport の renderer は変更しない。

## 判断理由

失敗後に同じ WebGPU 経路を frame 0 から自動再試行すると、ユーザーがさらに長時間待った後に同じ driver reset を踏む可能性がある。今回の再現条件では、開始前に既存の WebGL2 exporter 経路へ切り替える方を優先する。

短い 4K clip、1080p、30 FPS などは従来どおり `auto` renderer を使う。compatibility renderer の適用範囲は、実ログで失敗した sustained 4K/60 workload に限定する。

## 確認項目

- sustained 4K/60 request が `rendererBackend: "webgl2"` になる。
- 短い 4K/60 と長い 1080p/60 は `rendererBackend: "auto"` のままになる。
- 実ログで観測した `createBuffer` / `mapAsync` error を `gpu-device-lost` に分類する。
- terminal failure progress が実際の frame / encoded / captured 数を保持する。
- model asset や project file は変更しない。

## 実行結果

- `npm.cmd run lint`: 成功。
- `npm.cmd run test:unit`: 46 files / 313 tests 成功。
- `npm.cmd run smoke:launch`: WebGPU renderer 初期化と stability monitor を含め成功。
- `typecheck:critical` wrapper は sandbox の `spawnSync cmd.exe EPERM` で起動できなかった。`tsc` を直接実行し、変更対象ファイルおよび `TS2304` / `TS2552` に該当する新規 error がないことを確認した。既知の baseline error は残る。
- `test:e2e -- export-render-surface.spec.mjs`: 3 件とも app hook 待機前に Vite / PostCSS loader の `load hook ... got null` で timeout。WebM 実行経路へ到達していないため、compatibility renderer の実機 E2E は未確認。
