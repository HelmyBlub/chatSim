import { ChatterDogPaintValues, drawPawsWithAngles, resetToSitting } from "../drawChatterDog.js";
import { Chatter, State } from "../mainModels.js";
import { checkIsTextCloseTo } from "./commands.js";

const AUDIO_PEWPEWPEW = "sounds/pewpewpew.mp3";
export const COMMAND_PEW_PEW_PEW = "PewPewPew";

export function commandAddPewPewPew(state: State) {
    state.commands[COMMAND_PEW_PEW_PEW] = {
        isCommand: isCommand,
        preventChatBubble: preventChatBubble,
        drawPaw: drawPewPewPew,
    }
    state.sounds[AUDIO_PEWPEWPEW] = new Audio(AUDIO_PEWPEWPEW);
}

function preventChatBubble(message: string): boolean {
    return message === COMMAND_PEW_PEW_PEW;
}

function isCommand(message: string, chatter: Chatter): boolean {
    if (message === COMMAND_PEW_PEW_PEW || checkIsTextCloseTo(message, COMMAND_PEW_PEW_PEW)) {
        if (chatter.draw.pawAnimation !== COMMAND_PEW_PEW_PEW) chatter.draw.pawAnimationStart = undefined;
        chatter.draw.pawAnimation = COMMAND_PEW_PEW_PEW;
        return true;
    }
    return false;
}

function drawPewPewPew(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number) {
    let rotationValue = 0;
    const toPositionTime = 500;
    let animateDuration = 950;
    const rotationTarget = 2.5;
    let pewInterval = 100;
    let pawLengthScaleMod = 0;
    if (timePassed < toPositionTime) {
        rotationValue = rotationTarget * (timePassed / toPositionTime);
    } else if (timePassed < toPositionTime + animateDuration) {
        if (!chatter.draw.pawAnimationSoundPlayed) {
            chatter.draw.pawAnimationSoundPlayed = true;
            state.sounds[AUDIO_PEWPEWPEW].play();
        }
        rotationValue = rotationTarget;
        pawLengthScaleMod = Math.sin((timePassed - toPositionTime) / pewInterval) / 2 * 1.25;

    } else if (timePassed < toPositionTime * 2 + animateDuration) {
        rotationValue = rotationTarget * (toPositionTime - (timePassed - toPositionTime - animateDuration)) / toPositionTime;
    } else {
        rotationValue = 0;
        resetToSitting(chatter, state);
    }
    drawPawsWithAngles(ctx, paintValues, rotationValue, -rotationValue, 1 + pawLengthScaleMod, 1 - pawLengthScaleMod, state);
}