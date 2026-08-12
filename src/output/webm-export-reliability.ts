import type { WebmExportFailureCode, WebmRendererBackend } from "../types";

const UHD_PIXEL_COUNT = 3840 * 2160;
const HIGH_LOAD_MIN_FPS = 50;
const HIGH_LOAD_MIN_DURATION_SECONDS = 60;

export type WebmRendererDecision = {
    backend: WebmRendererBackend;
    reason: "default" | "sustained-uhd-high-fps";
};

export type WebmExportFailureClassification = {
    code: WebmExportFailureCode;
    technicalMessage: string;
};

export function selectWebmExportRendererBackend(input: {
    width: number;
    height: number;
    fps: number;
    totalFrames: number;
}): WebmRendererDecision {
    const width = Math.max(1, Math.floor(input.width));
    const height = Math.max(1, Math.floor(input.height));
    const fps = Math.max(1, Math.floor(input.fps));
    const totalFrames = Math.max(1, Math.floor(input.totalFrames));
    const durationSeconds = totalFrames / fps;
    const isSustainedUhdHighFps = width * height >= UHD_PIXEL_COUNT
        && fps >= HIGH_LOAD_MIN_FPS
        && durationSeconds >= HIGH_LOAD_MIN_DURATION_SECONDS;

    if (isSustainedUhdHighFps) {
        return {
            backend: "webgl2",
            reason: "sustained-uhd-high-fps",
        };
    }
    return {
        backend: "auto",
        reason: "default",
    };
}

export function classifyWebmExportFailure(error: unknown): WebmExportFailureClassification {
    const technicalMessage = getErrorText(error);
    const normalized = technicalMessage.toLowerCase();
    const isKnownDeviceLoss = normalized.includes("valid external instance reference no longer exists")
        || normalized.includes("webm gpu device lost")
        || normalized.includes("gpudevice was lost")
        || normalized.includes("gpu device was lost")
        || (
            normalized.includes("createbuffer failed")
            && normalized.includes("mappedatcreation")
            && normalized.includes("too large for the implementation")
        );

    return {
        code: isKnownDeviceLoss ? "gpu-device-lost" : "unknown",
        technicalMessage,
    };
}

function getErrorText(error: unknown): string {
    if (error instanceof Error) {
        return [error.name, error.message, error.stack]
            .filter((part): part is string => typeof part === "string" && part.length > 0)
            .join("\n");
    }
    return String(error);
}
