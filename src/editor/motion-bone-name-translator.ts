import { MmdAnimation } from "babylon-mmd/esm/Loader/Animation/mmdAnimation";
import {
    buildMmdAnimationFromEditorMotion,
    createEditorModelMotionFromMmdAnimation,
} from "./mmd-animation-builder";
import type { EditorBoneTrack, EditorIkStateTrack } from "./motion-document";
import type { ModelInfo } from "../types";

const STANDARD_BONE_NAME_ALIASES: Readonly<Record<string, readonly string[]>> = {
    "センター": ["center"], "グルーブ": ["groove"], "上半身": ["upper body", "upperbody"],
    "上半身2": ["upper body2", "upperbody2"], "下半身": ["lower body", "lowerbody"],
    "首": ["neck"], "頭": ["head"], "両目": ["eyes", "both eyes"],
    "左目": ["left eye", "lefteye", "eye_l"], "右目": ["right eye", "righteye", "eye_r"],
    "左肩": ["left shoulder", "leftshoulder", "shoulder_l"], "右肩": ["right shoulder", "rightshoulder", "shoulder_r"],
    "左腕": ["left arm", "leftarm", "arm_l"], "右腕": ["right arm", "rightarm", "arm_r"],
    "左ひじ": ["left elbow", "leftelbow", "elbow_l"], "右ひじ": ["right elbow", "rightelbow", "elbow_r"],
    "左手首": ["left wrist", "leftwrist", "wrist_l"], "右手首": ["right wrist", "rightwrist", "wrist_r"],
    "左足": ["left leg", "leftleg", "leg_l"], "右足": ["right leg", "rightleg", "leg_r"],
    "左ひざ": ["left knee", "leftknee", "knee_l"], "右ひざ": ["right knee", "rightknee", "knee_r"],
    "左足首": ["left ankle", "leftankle", "ankle_l"], "右足首": ["right ankle", "rightankle", "ankle_r"],
    "左足ＩＫ": ["left leg ik", "leftlegik", "legik_l"], "右足ＩＫ": ["right leg ik", "rightlegik", "legik_r"],
    "左つま先ＩＫ": ["left toe ik", "lefttoeik", "toeik_l"], "右つま先ＩＫ": ["right toe ik", "righttoeik", "toeik_r"],
};

export type BoneNameTranslationResult = {
    animation: MmdAnimation;
    translatedBoneTrackCount: number;
    translatedIkStateCount: number;
};

export function getPreferredEnglishBoneDisplayName(name: string, englishName?: string): string {
    return englishName?.trim() || STANDARD_BONE_NAME_ALIASES[name]?.[0] || name;
}

export function translateAnimationBoneNamesForModel(
    animation: MmdAnimation,
    modelInfo: Pick<ModelInfo, "boneNames" | "boneControlInfos"> | null | undefined,
): BoneNameTranslationResult {
    if (!modelInfo) return { animation, translatedBoneTrackCount: 0, translatedIkStateCount: 0 };

    const resolve = createBoneNameResolver(modelInfo);
    const motion = createEditorModelMotionFromMmdAnimation(animation.name, animation, modelInfo);
    let translatedBoneTrackCount = 0;
    const tracks = new Map<string, EditorBoneTrack>();
    for (const track of motion.boneTracks.values()) {
        const name = resolve(track.name);
        if (name !== track.name) translatedBoneTrackCount += 1;
        const translatedTrack = name === track.name ? track : { ...track, name };
        const existing = tracks.get(name);
        tracks.set(name, existing ? { ...existing, keys: [...existing.keys, ...translatedTrack.keys] } : translatedTrack);
    }
    motion.boneTracks = tracks;

    let translatedIkStateCount = 0;
    const ikStates = new Map<string, EditorIkStateTrack>();
    for (const ikState of motion.propertyTrack.ikStates) {
        const boneName = resolve(ikState.boneName);
        if (boneName !== ikState.boneName) translatedIkStateCount += 1;
        if (!ikStates.has(boneName)) ikStates.set(boneName, boneName === ikState.boneName ? ikState : { ...ikState, boneName });
    }
    motion.propertyTrack.ikStates = [...ikStates.values()];

    if (translatedBoneTrackCount === 0 && translatedIkStateCount === 0) {
        return { animation, translatedBoneTrackCount, translatedIkStateCount };
    }
    return {
        animation: buildMmdAnimationFromEditorMotion(animation.name, motion, modelInfo, animation.cameraTrack),
        translatedBoneTrackCount,
        translatedIkStateCount,
    };
}

function createBoneNameResolver(modelInfo: Pick<ModelInfo, "boneNames" | "boneControlInfos">): (name: string) => string {
    const aliases = new Map<string, string>();
    const add = (alias: string | undefined, actualName: string): void => {
        const normalized = normalizeBoneName(alias);
        if (normalized && !aliases.has(normalized)) aliases.set(normalized, actualName);
    };
    for (const name of modelInfo.boneNames) add(name, name);
    for (const bone of modelInfo.boneControlInfos ?? []) {
        add(bone.name, bone.name);
        add(bone.englishName, bone.name);
        for (const alias of STANDARD_BONE_NAME_ALIASES[bone.name] ?? []) add(alias, bone.name);
    }
    return (name) => aliases.get(normalizeBoneName(name)) ?? name;
}

function normalizeBoneName(name: string | undefined): string {
    return (name ?? "").normalize("NFKC").trim().toLowerCase().replace(/[\s_-]/g, "");
}
