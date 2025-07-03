import { ChatterDogPaintValues, drawPawsWithAngles, resetToSitting } from "../drawChatterDog.js";
import { Chatter, State } from "../mainModels.js";
import { checkIsTextCloseTo } from "./commands.js";

export const COMMAND_NOT_LIKE_THIS = "NotLikeThis";

export function commandAddNotLikeThis(state: State) {
    state.commands[COMMAND_NOT_LIKE_THIS] = {
        isCommand: isCommand,
        preventChatBubble: preventChatBubble,
        drawPaw: drawCommand,
    }
}

function preventChatBubble(message: string): boolean {
    return message === COMMAND_NOT_LIKE_THIS;
}

function isCommand(message: string, chatter: Chatter, state: State): boolean {
    if (message === COMMAND_NOT_LIKE_THIS || checkIsTextCloseTo(message, COMMAND_NOT_LIKE_THIS)) {
        chatter.draw.pawAnimationStart = undefined;
        chatter.draw.pawAnimation = COMMAND_NOT_LIKE_THIS;
        return true;
    }
    return false;
}

function drawCommand(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number) {
    const targetValue = Math.PI;
    let rotationValue = 0;
    const emoteToPositionTime = 500;
    const emoteDuration = 4000;
    let pawLengthScaling = 1;
    const targetPawLengthScaling = 1.7;
    if (timePassed < emoteToPositionTime) {
        rotationValue = (timePassed / emoteToPositionTime) * targetValue;
        pawLengthScaling = 1 + (timePassed / emoteToPositionTime) * (targetPawLengthScaling - 1);
    } else if (timePassed < emoteToPositionTime + emoteDuration) {
        rotationValue = targetValue;
        pawLengthScaling = targetPawLengthScaling;
    } else if (timePassed < emoteToPositionTime * 2 + emoteDuration) {
        rotationValue = targetValue - ((timePassed - emoteDuration - emoteToPositionTime) / emoteToPositionTime) * targetValue;
        pawLengthScaling = 1 + (1 - (timePassed - emoteDuration - emoteToPositionTime) / emoteToPositionTime) * (targetPawLengthScaling - 1);
    } else {
        rotationValue = 0;
        resetToSitting(chatter, state);
    }
    drawPawsWithAngles(ctx, paintValues, rotationValue * 0.98, -rotationValue * 0.94, pawLengthScaling, pawLengthScaling, state);

}

