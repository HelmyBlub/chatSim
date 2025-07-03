import { chatterDogDrawClap, ChatterDogPaintValues } from "../drawChatterDog.js";
import { Chatter, State } from "../mainModels.js";
import { checkIsTextCloseTo } from "./commands.js";

export const COMMAND_KAPPA = "Kappa";

export function commandAddKappa(state: State) {
    state.commands[COMMAND_KAPPA] = {
        isCommand: isCommand,
        preventChatBubble: preventChatBubble,
        drawPaw: drawCommand,
    }
}

function preventChatBubble(message: string): boolean {
    return message === COMMAND_KAPPA;
}

function isCommand(message: string, chatter: Chatter, state: State): boolean {
    if (message === COMMAND_KAPPA || checkIsTextCloseTo(message, COMMAND_KAPPA)) {
        chatter.draw.pawAnimation = COMMAND_KAPPA;
        chatter.draw.pawAnimationStart = undefined;
        return true;
    }
    return false;
}

function drawCommand(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number) {
    chatterDogDrawClap(ctx, chatter, state, paintValues, timePassed, true);
}

