import { describe, expect, it } from "vitest";
import { MmdAnimation } from "babylon-mmd/esm/Loader/Animation/mmdAnimation";
import {
    MmdBoneAnimationTrack,
    MmdCameraAnimationTrack,
    MmdMovableBoneAnimationTrack,
    MmdPropertyAnimationTrack,
} from "babylon-mmd/esm/Loader/Animation/mmdAnimationTrack";
import {
    getPreferredEnglishBoneDisplayName,
    translateAnimationBoneNamesForModel,
} from "../../src/editor/motion-bone-name-translator";

describe("translateAnimationBoneNamesForModel", () => {
    it("uses PMX English labels and standard English fallbacks for the imported model UI", () => {
        expect(getPreferredEnglishBoneDisplayName("左腕", "Left Arm")).toBe("Left Arm");
        expect(getPreferredEnglishBoneDisplayName("センター")).toBe("center");
    });

    it("maps PMX English bone names and standard MMD aliases to target model names", () => {
        const armTrack = new MmdBoneAnimationTrack("Left Arm", 1);
        armTrack.frameNumbers[0] = 10;
        armTrack.rotations[3] = 1;
        const centerTrack = new MmdMovableBoneAnimationTrack("center", 1);
        centerTrack.rotations[3] = 1;
        const animation = new MmdAnimation(
            "incoming",
            [armTrack],
            [centerTrack],
            [],
            new MmdPropertyAnimationTrack(0, []),
            new MmdCameraAnimationTrack(0),
        );

        const result = translateAnimationBoneNamesForModel(animation, {
            boneNames: ["左腕", "センター"],
            boneControlInfos: [
                { name: "左腕", englishName: "Left Arm", movable: false, rotatable: true },
                { name: "センター", movable: true, rotatable: true },
            ],
        });

        expect(result.translatedBoneTrackCount).toBe(2);
        expect(result.animation.boneTracks.map((track) => track.name)).toEqual(["左腕"]);
        expect(result.animation.movableBoneTracks.map((track) => track.name)).toEqual(["センター"]);
    });
});
