import { ChatSimState, Position } from "./chatSimModels.js";
import { calculateDistance3D, nextRandom } from "./main.js";
import { mapGetVisionBorderPositionClosestToPoint, mapIsPositionVisible, PaintDataMap } from "./map.js";

type SoundData = {
    audio: HTMLAudioElement[],
    volumeFactor: number,
}

export const SOUNDS: { [key: string]: SoundData } = {
}

export const SOUND_PATH_CUT = "sounds/553254__t-man95__axe-cutting-wood_chop";
export const SOUND_PATH_SNORE = "sounds/500803__khenshom__light-snores-of-a-man-sleeping_snore";
export const SOUND_PATH_HAMMER = "sounds/496262__16gpanskatoman_kristian__hammer-wood_shortened.mp3";
export const SOUND_PATH_PICKUP = "sounds/343097__edsward__plopenhanced.wav";
export const SOUND_PATH_TREE_FALL = "sounds/441617__danielajq__38-arbol-cayendo.wav";

export function loadChatSimSounds() {
    loadAudio(SOUND_PATH_CUT, 1, 5, "mp3");
    loadAudio(SOUND_PATH_SNORE, 1, 3, "mp3");
    loadAudio(SOUND_PATH_HAMMER, 1.2);
    loadAudio(SOUND_PATH_PICKUP, 0.6);
    loadAudio(SOUND_PATH_TREE_FALL, 1);
}

function loadAudio(path: string, volumeFactor: number = 1, soundVariations: number = 1, format: string | undefined = undefined) {
    const data: SoundData = {
        audio: [],
        volumeFactor: volumeFactor,
    }
    if (soundVariations === 1 && format === undefined) {
        data.audio.push(new Audio(path));
    } else {
        for (let i = 0; i < soundVariations; i++) {
            data.audio.push(new Audio(`${path}_${i + 1}.${format}`));
        }
    }
    SOUNDS[path] = data;
}

export function playChatSimSound(audioPath: string, soundMapLocation: Position, state: ChatSimState, volumeAmplify: number = 1, maxHearingDistance: number = 300) {
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
    if (distance > maxHearingDistance) return;
    const distanceVolumeFactor = 1 - Math.log(adjustedDistance) / Math.log(maxHearingDistance);
    const soundData = SOUNDS[audioPath];
    const volume = 1 * distanceVolumeFactor * state.soundVolume * volumeAmplify * soundData.volumeFactor;
    if (soundData.audio.length === 1) {
        playSound(soundData.audio[0], state.gameSpeed, volume);
    } else {
        const randomSoundVariation = Math.floor(Math.random() * soundData.audio.length);
        playSound(soundData.audio[randomSoundVariation], state.gameSpeed, volume);
    }
}

export function playSound(audio: HTMLAudioElement, playbackRate: number, volume: number) {
    if (volume <= 0) return;
    if (playbackRate > 5) return;
    const tempAudio = audio.cloneNode() as HTMLAudioElement;
    tempAudio.playbackRate = playbackRate;
    tempAudio.volume = volume;
    tempAudio.play();
}