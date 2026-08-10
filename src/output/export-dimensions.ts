export type ExportDimensions = {
    width: number;
    height: number;
};

const MIN_EXPORT_WIDTH = 320;
const MIN_EXPORT_HEIGHT = 180;
const MAX_EXPORT_DIMENSION = 8192;

export const scaleExportDimensions = (
    width: number,
    height: number,
    qualityScale: number,
): ExportDimensions => {
    const normalizedWidth = Number.isFinite(width)
        ? Math.max(MIN_EXPORT_WIDTH, Math.floor(width))
        : MIN_EXPORT_WIDTH;
    const normalizedHeight = Number.isFinite(height)
        ? Math.max(MIN_EXPORT_HEIGHT, Math.floor(height))
        : MIN_EXPORT_HEIGHT;
    const normalizedScale = Number.isFinite(qualityScale)
        ? Math.max(0.25, Math.min(4, qualityScale))
        : 1;
    const maximumScale = Math.min(
        MAX_EXPORT_DIMENSION / normalizedWidth,
        MAX_EXPORT_DIMENSION / normalizedHeight,
    );
    const appliedScale = Math.min(normalizedScale, maximumScale);

    return {
        width: Math.max(MIN_EXPORT_WIDTH, Math.round(normalizedWidth * appliedScale)),
        height: Math.max(MIN_EXPORT_HEIGHT, Math.round(normalizedHeight * appliedScale)),
    };
};
