import { drawTextWithOutline, loadImage } from "../../drawHelper.js";
import { CHATTER_IMAGE_WIDTH } from "../drawChatterDog.js";
import { Chatter, State } from "../mainModels.js";
import { checkIsTextCloseTo, checkIsTextCloseToEndIndex } from "./commands.js";

export const COMMAND_PRISON = "prison";
export type Prison = {
    chatterName?: string,
    voteEndTime?: number,
    guiltyVotes?: number,
    notGuilyVotes?: number,
    guiltyTime?: number,
    votedChatters: string[];
}
const IMAGE_PRISON = "images/prison.png";

export function createPrison(): Prison {
    return { votedChatters: [] };
}

export function commandAddPrison(state: State) {
    state.commands[COMMAND_PRISON] = {
        isCommand: isCommand,
        preventChatBubble: preventChatBubble,
    }
    state.images[IMAGE_PRISON] = loadImage(IMAGE_PRISON);
}

function prisonVote(message: string, chatter: Chatter, state: State): boolean {
    if (state.prison.chatterName === undefined) return false;
    if (checkIsTextCloseTo(message, "not guilty")) {
        const hasVoted = state.prison.votedChatters.find((c) => c === chatter.name);
        if (!hasVoted) {
            state.prison.notGuilyVotes!++;
            state.prison.votedChatters.push(chatter.name);
        }
        return true;
    } else if (checkIsTextCloseTo(message, "guilty")) {
        const hasVoted = state.prison.votedChatters.find((c) => c === chatter.name);
        if (!hasVoted) {
            state.prison.guiltyVotes!++;
            state.prison.votedChatters.push(chatter.name);
        }
        return true;
    }
    return false;

}

export function tickPrison(state: State) {
    const moveDuration = 8000;
    if (state.prison.chatterName === undefined) return;
    if (state.prison.voteEndTime && state.prison.voteEndTime > performance.now()) return;
    if (state.prison.guiltyTime === undefined) {
        if (state.prison.guiltyVotes! > state.prison.notGuilyVotes!) {
            state.prison.guiltyTime = performance.now();
            state.prison.voteEndTime = undefined;
        } else {
            state.prison.chatterName = undefined
        }

    } else {
        let chatter = state.chatters.find((c) => c.name === state.prison.chatterName);
        if (chatter) {
            if (state.prison.guiltyTime + moveDuration > performance.now()) {
                chatter.posY += 220 / moveDuration * 16;
            } else {
                chatter.posX = -200;
                chatter.state = "leaving";
            }
        }
    }
}

export function drawPrison(ctx: CanvasRenderingContext2D, state: State) {
    if (state.prison.chatterName === undefined) return;
    let chatter: Chatter | undefined = undefined;
    for (let chatterIt of state.chatters) {
        if (chatterIt.name === state.prison.chatterName) {
            chatter = chatterIt;
            break;
        }
    }
    if (chatter) {
        ctx.drawImage(state.images[IMAGE_PRISON], 0, 0, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_WIDTH,
            chatter.posX, ctx.canvas.height - CHATTER_IMAGE_WIDTH + chatter.posY + 20, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_WIDTH);
        const fontSize = 20;
        ctx.font = `${fontSize}px Arial`;
        drawTextWithOutline(ctx, `Vote Guilty | Not Guilty: ${state.prison.guiltyVotes} | ${state.prison.notGuilyVotes}`, chatter.posX, ctx.canvas.height - CHATTER_IMAGE_WIDTH + chatter.posY);
        if (state.prison.guiltyTime !== undefined) {
            const fontSize = 75;
            ctx.font = `${fontSize}px bold Arial`;
            drawTextWithOutline(ctx, `Guilty`, chatter.posX, ctx.canvas.height - CHATTER_IMAGE_WIDTH / 2 + chatter.posY);
        } else {
            drawTextWithOutline(ctx, `Timer: ${((state.prison.voteEndTime! - performance.now()) / 1000).toFixed()}`, chatter.posX, ctx.canvas.height - CHATTER_IMAGE_WIDTH + chatter.posY - fontSize);
        }
    } else {
        state.prison.chatterName = undefined;
    }
}

function preventChatBubble(message: string): boolean {
    return message.startsWith(COMMAND_PRISON);
}

function isCommand(message: string, chatter: Chatter, state: State): boolean {
    if (state.prison.chatterName) {
        return prisonVote(message, chatter, state);
    }
    const endIndex = checkIsTextCloseToEndIndex(message, COMMAND_PRISON)
    if (endIndex > 0) {
        let rest = message.substring(endIndex);
        const match = rest.match(/^[^a-zA-Z]*/);
        if (match) rest = rest.substring(match[0].length, rest.length);
        console.log("substring: ", rest);
        const parameterName = rest.split(" ")[0];
        if (parameterName.length <= 0) return true;
        console.log("parameter1: ", parameterName);
        let chatterForPrison: Chatter | undefined = undefined;
        for (let chatter of state.chatters) {
            if (chatter.name.startsWith(parameterName)) {
                if (chatterForPrison === undefined) {
                    chatterForPrison = chatter;
                } else {
                    chatterForPrison = undefined;
                    break;
                }
            }
        }
        if (chatterForPrison) {
            state.prison.chatterName = chatterForPrison.name;
            state.prison.voteEndTime = performance.now() + 60_000;
            state.prison.guiltyVotes = 0;
            state.prison.notGuilyVotes = 0;
            state.prison.votedChatters = [];
        }

        return true;
    }
    return false;
}

