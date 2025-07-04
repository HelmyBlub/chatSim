import { ChatterDogPaintValues } from "../drawChatterDog.js";
import { Chatter, State } from "../mainModels.js";
import { commandAddBakeCookies } from "./bakeCookies.js";
import { commandAddClap } from "./clap.js";
import { commandAddEatCookie } from "./eatCookie.js";
import { commandAddHeyGuys } from "./heyGuys.js";
import { commandAddKappa } from "./kappa.js";
import { commandAddNotLikeThis } from "./notLikeThis.js";
import { commandAddPewPewPew } from "./pewpewpew.js";
import { commandAddPrison } from "./prison.js";

export type Command = {
    isCommand(message: string, chatter: Chatter, state: State): boolean,
    preventChatBubble(message: string): boolean,
    drawPaw?(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number): void,
}

export type Commands = { [key: string]: Command };


export function initCommands(state: State) {
    commandAddPewPewPew(state);
    commandAddBakeCookies(state);
    commandAddEatCookie(state);
    commandAddNotLikeThis(state);
    commandAddHeyGuys(state);
    commandAddClap(state);
    commandAddKappa(state);
    commandAddPrison(state);
}

export function commandDrawPaw(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number) {
    const commandAnimation = state.commands[chatter.draw.pawAnimation];
    if (commandAnimation && commandAnimation.drawPaw) {
        commandAnimation.drawPaw(ctx, chatter, state, paintValues, timePassed);
    }
}

export function checkForCommandAndReturnIfChatBubble(chatter: Chatter, message: string, state: State): boolean {
    const keys = Object.keys(state.commands);
    for (let key of keys) {
        const command = state.commands[key];
        if (command) {
            if (command.isCommand(message, chatter, state)) {
                return !command.preventChatBubble(message);
            }
        }
    }
    return true;
}

/**
 * retruns true if text and compare text match with allows few errors
 */
export function checkIsTextCloseTo(text: string, compareTo: string): boolean {
    return checkIsTextCloseToEndIndex(text, compareTo) > 0;
}

export function checkIsTextCloseToEndIndex(text: string, compareTo: string): number {
    if (text.indexOf(compareTo) > -1) {
        return text.indexOf(compareTo) + compareTo.length;
    }
    let toCheckIndex = 0;
    let missMatchCount = 0;
    let matchCount = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i].toLowerCase() === compareTo[toCheckIndex].toLowerCase()) {
            matchCount++;
            toCheckIndex++;
            if (toCheckIndex >= compareTo.length) return toCheckIndex;
            continue;
        }
        if (toCheckIndex + 1 < compareTo.length && text[i].toLowerCase() === compareTo[toCheckIndex + 1].toLowerCase()) {
            matchCount++;
            toCheckIndex += 2;
            if (toCheckIndex >= compareTo.length) return toCheckIndex;
            continue;
        }
        if (matchCount > 0) {
            missMatchCount++;
            if (missMatchCount > 3) {
                matchCount = 0;
                missMatchCount = 0;
                toCheckIndex = 0;
                continue;
            }
            if (toCheckIndex >= compareTo.length) return toCheckIndex;
        }
    }
    return -1;
}
