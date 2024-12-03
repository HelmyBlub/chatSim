import { ChatSimState, Position } from "./chatSimModels.js";
import { calculateDistance, calculateDistance3D } from "./main.js";
import { mapGetVisionBorderPositionClosestToPoint, mapIsPositionVisible, PaintDataMap } from "./map.js";

export const SOUNDS: { [key: string]: HTMLAudioElement } = {
}

export const SOUND_PATH_CUT = "sounds/cut.mp3";
export const SOUND_PATH_HAMMER = "sounds/hammer.mp3";
export const SOUND_PATH_PICKUP = "sounds/pickup.mp3";

export function loadChatSimSounds() {
    SOUNDS[SOUND_PATH_CUT] = new Audio(SOUND_PATH_CUT);
    SOUNDS[SOUND_PATH_HAMMER] = new Audio(SOUND_PATH_HAMMER);
    SOUNDS[SOUND_PATH_PICKUP] = new Audio(SOUND_PATH_PICKUP);
}

export function playChatSimSound(audioPath: string, soundMapLocation: Position, state: ChatSimState, volumeAmplify: number = 1) {
    if (state.soundVolume === undefined || state.soundVolume <= 0) return;
    const zoom = state.paintData.map.zoom;
    const zoomZ = (1 / zoom) * 200;
    //everything i see is distance 0 without z
    let distance = 0;
    if (mapIsPositionVisible(soundMapLocation, state.paintData.map)) {
        distance = zoomZ;
    } else {
        // find out how far away from visible area
        const visionBorder = mapGetVisionBorderPositionClosestToPoint(soundMapLocation, state.paintData.map);
        const visionTempMiddle = { ...visionBorder, z: zoomZ };
        distance = calculateDistance3D({ ...soundMapLocation, z: 0 }, visionTempMiddle);
    }
    const adjustedDistance = Math.max(distance, 1);
    const maxHearingDistance = 300;
    if (distance > maxHearingDistance) return;
    const distanceVolumeFactor = 1 - Math.log(adjustedDistance) / Math.log(maxHearingDistance);
    const volume = 1 * distanceVolumeFactor * state.soundVolume;
    playSound(SOUNDS[audioPath], 1, volume);
}

export function playSound(audio: HTMLAudioElement, playbackRate: number, volume: number) {
    if (volume <= 0) return;
    if (playbackRate > 3) return;
    const tempAudio = audio.cloneNode() as HTMLAudioElement;
    tempAudio.playbackRate = playbackRate;
    tempAudio.volume = volume;
    tempAudio.play();
}