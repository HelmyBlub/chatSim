import { IMAGE_PATH_COOKIE } from "../draw.js";
import { ChatterDogPaintValues, drawPawsWithAngles, resetToSitting } from "../drawChatterDog.js";
import { Chatter, State } from "../mainModels.js";
import { checkIsTextCloseTo } from "./commands.js";

export const COMMAND_EAT_COOKIE = "eat cookie";

export function commandAddEatCookie(state: State) {
    state.commands[COMMAND_EAT_COOKIE] = {
        isCommand: isCommand,
        preventChatBubble: preventChatBubble,
        drawPaw: drawCommand,
    }
}

function preventChatBubble(message: string): boolean {
    return message === COMMAND_EAT_COOKIE;
}

function isCommand(message: string, chatter: Chatter, state: State): boolean {
    if (message === COMMAND_EAT_COOKIE || checkIsTextCloseTo(message, COMMAND_EAT_COOKIE)) {
        if (chatter.draw.pawAnimation !== COMMAND_EAT_COOKIE && state.gamesData.cookieGame.cookieCounter > 0) {
            chatter.draw.pawAnimation = COMMAND_EAT_COOKIE;
            chatter.draw.pawAnimationStart = undefined;
            state.gamesData.cookieGame.cookieCounter--;
        }
        return true;
    }
    return false;
}

function drawCommand(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number) {
    const targetValue = Math.PI / 2;
    let rotationValue = 0;
    const emoteToPositionTime = 500;
    const emoteDuration = 5000;
    let pawLengthScaling = 1;
    let cookieYOffset = 0;
    let cookieTargetYOffset = -40;
    const targetPawLengthScaling = 0.3;
    let cookieFrame = 0;
    if (timePassed < emoteToPositionTime) {
        rotationValue = (timePassed / emoteToPositionTime) * targetValue;
        pawLengthScaling = 1 + (timePassed / emoteToPositionTime) * (targetPawLengthScaling - 1);
        cookieYOffset = (timePassed / emoteToPositionTime) * cookieTargetYOffset;
    } else if (timePassed < emoteToPositionTime + emoteDuration) {
        rotationValue = targetValue;
        pawLengthScaling = targetPawLengthScaling;
        cookieFrame = Math.floor((timePassed - emoteToPositionTime) / emoteDuration * 3);
        cookieYOffset = cookieTargetYOffset;
        chatter.draw.mouthAnimation = "eating";
    } else if (timePassed < emoteToPositionTime * 2 + emoteDuration) {
        cookieFrame = 3;
        rotationValue = targetValue - ((timePassed - emoteDuration - emoteToPositionTime) / emoteToPositionTime) * targetValue;
        pawLengthScaling = 1 + (1 - (timePassed - emoteDuration - emoteToPositionTime) / emoteToPositionTime) * (targetPawLengthScaling - 1);
    } else {
        cookieFrame = 3;
        rotationValue = 0;
        chatter.draw.mouthAnimation = "closed";
        resetToSitting(chatter, state);
    }
    drawPawsWithAngles(ctx, paintValues, rotationValue * 0.98, -rotationValue * 0.94, pawLengthScaling, pawLengthScaling, state);
    const cookieImage = state.images[IMAGE_PATH_COOKIE];
    const cookieSize = 60;
    if (cookieFrame < 3) ctx.drawImage(cookieImage, 0 + cookieFrame * 80, 0, 80, 80, paintValues.pawsMiddleX - cookieSize / 2, paintValues.pawsTopY + cookieYOffset, cookieSize, cookieSize);
}

