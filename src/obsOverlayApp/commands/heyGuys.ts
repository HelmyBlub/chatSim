import { ChatterDogPaintValues, drawPawsWithAngles, resetToSitting } from "../drawChatterDog.js";
import { AUDIO_HEYGUYS } from "../main.js";
import { Chatter, State } from "../mainModels.js";
import { checkIsTextCloseTo } from "./commands.js";

export const COMMAND_HEY_GUYS = "HeyGuys";

export function commandAddHeyGuys(state: State) {
    state.commands[COMMAND_HEY_GUYS] = {
        isCommand: isCommand,
        preventChatBubble: preventChatBubble,
        drawPaw: drawCommand,
    }
}

function preventChatBubble(message: string): boolean {
    return message === COMMAND_HEY_GUYS;
}

function isCommand(message: string, chatter: Chatter, state: State): boolean {
    if (message === COMMAND_HEY_GUYS || checkIsTextCloseTo(message, COMMAND_HEY_GUYS)) {
        chatter.draw.pawAnimation = COMMAND_HEY_GUYS;
        chatter.draw.pawAnimationStart = undefined;
        return true;
    }
    return false;
}

function drawCommand(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number) {
    if (!chatter.draw.pawAnimationSoundPlayed) {
        chatter.draw.pawAnimationSoundPlayed = true;
        state.sounds[AUDIO_HEYGUYS].play();
    }
    let rotationValue = 0;
    const waveToPositionTime = 500;
    const wavingDuration = 2200;
    if (timePassed < waveToPositionTime) {
        rotationValue = -(timePassed / 200);
    } else if (timePassed < waveToPositionTime + wavingDuration) {
        const waveMiddleAngle = -2.5;
        rotationValue = waveMiddleAngle - Math.sin((timePassed - waveToPositionTime) / 100);
    } else if (timePassed < waveToPositionTime * 2 + wavingDuration) {
        rotationValue = -2.5 + (timePassed - waveToPositionTime - wavingDuration) / 200;
    } else {
        rotationValue = 0;
        resetToSitting(chatter, state);
    }
    drawPawsWithAngles(ctx, paintValues, 0, rotationValue, 1, 1, state);
}

