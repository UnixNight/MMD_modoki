import { describe, expect, it } from "vitest";

import { scaleExportDimensions } from "./export-dimensions";

describe("scaleExportDimensions", () => {
    it("applies the configured quality scale to both dimensions", () => {
        expect(scaleExportDimensions(1920, 1080, 2)).toEqual({ width: 3840, height: 2160 });
    });

    it("preserves the aspect ratio when the maximum output dimension is reached", () => {
        expect(scaleExportDimensions(3840, 2160, 4)).toEqual({ width: 8192, height: 4608 });
    });
});
