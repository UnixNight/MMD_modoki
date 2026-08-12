import { describe, expect, it } from "vitest";
import {
    classifyWebmExportFailure,
    selectWebmExportRendererBackend,
} from "./webm-export-reliability";

describe("selectWebmExportRendererBackend", () => {
    it("uses the compatibility renderer for sustained 4K 60 fps exports", () => {
        expect(selectWebmExportRendererBackend({
            width: 3840,
            height: 2160,
            fps: 60,
            totalFrames: 12_326,
        })).toEqual({
            backend: "webgl2",
            reason: "sustained-uhd-high-fps",
        });
    });

    it("keeps the normal renderer for short or lower-load exports", () => {
        expect(selectWebmExportRendererBackend({
            width: 3840,
            height: 2160,
            fps: 60,
            totalFrames: 600,
        }).backend).toBe("auto");
        expect(selectWebmExportRendererBackend({
            width: 1920,
            height: 1080,
            fps: 60,
            totalFrames: 12_326,
        }).backend).toBe("auto");
    });
});

describe("classifyWebmExportFailure", () => {
    it("recognizes the device-loss errors observed during WebGPU readback", () => {
        expect(classifyWebmExportFailure(new DOMException(
            "A valid external Instance reference no longer exists.",
            "AbortError",
        )).code).toBe("gpu-device-lost");
        expect(classifyWebmExportFailure(new RangeError(
            "createBuffer failed, size (16384) is too large for the implementation when mappedAtCreation == true",
        )).code).toBe("gpu-device-lost");
    });

    it("keeps unrelated failures generic", () => {
        expect(classifyWebmExportFailure(new Error("No supported WebM codec available")).code).toBe("unknown");
    });
});
