import { chatterDogDrawClap, ChatterDogPaintValues } from "../drawChatterDog.js";
import { Chatter, State } from "../mainModels.js";
import { checkIsTextCloseTo } from "./commands.js";

export const COMMAND_CLAP = "clap";

export function commandAddClap(state: State) {
    state.commands[COMMAND_CLAP] = {
        isCommand: isCommand,
        preventChatBubble: preventChatBubble,
        drawPaw: drawCommand,
    }
}

function preventChatBubble(message: string): boolean {
    return message === COMMAND_CLAP;
}

function isCommand(message: string, chatter: Chatter, state: State): boolean {
    if (message === COMMAND_CLAP || checkIsTextCloseTo(message, COMMAND_CLAP)) {
        chatter.draw.pawAnimation = COMMAND_CLAP;
        chatter.draw.pawAnimationStart = undefined;
        return true;
    }
    return false;
}

function drawCommand(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number) {
    chatterDogDrawClap(ctx, chatter, state, paintValues, timePassed, false);
}

