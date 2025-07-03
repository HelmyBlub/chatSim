import { CHATTER_IMAGE_WIDTH } from "./drawChatterDog.js";
import { localStorageStoreChatters } from "./main.js";
import { State, Chatter } from "./mainModels.js";
import { GAME_FUNCTIONS } from "./tick.js";
import { GAME_TIC_TAC_TOE } from "./gameTicTacToe.js";
import { handleOutfitMessage } from "./outfits.js";
import { checkForCommandAndReturnIfChatBubble } from "./commands/commands.js";

export function addChatMessage(userName: string, message: string, state: State) {
    if (state.streamerName === userName) {
        const continueChatHandler = streamerCommands(message, state);
        if (!continueChatHandler) {
            return;
        }
    }
    let chatter = state.chatters.find(u => u.name === userName);
    if (!chatter) {
        chatter = addChatterAndRemoveMostInactive(userName, state);
    }
    addChatMessageToChatter(chatter, message, state);
    localStorageStoreChatters(state);
}

export function addChatMessageToChatter(chatter: Chatter, message: string, state: State) {
    const maxMessageLength = state.config.maxMessageLength;
    let messageCapSized = message;
    if (chatter.state == "sleeping") chatter.state = "sitting";
    chatter.lastMessageTime = performance.now();
    let stillDoChatMessage = chatterCommands(chatter, messageCapSized, state);
    if (stillDoChatMessage) stillDoChatMessage = !handleGameCommand(chatter, messageCapSized, state);
    if (stillDoChatMessage) stillDoChatMessage = !handleOutfitMessage(chatter, message, state);
    if (stillDoChatMessage) {
        if (messageCapSized.length > maxMessageLength) messageCapSized = messageCapSized.substring(0, maxMessageLength);
        chatter.chatMessages.push({ message: messageCapSized, receiveTime: performance.now() });
        if (chatter.chatMessages.length > state.config.maxChatMessagesPerChatter) {
            chatter.chatMessages.shift();
        }
    }
}

function handleGameCommand(chatter: Chatter, message: string, state: State): boolean {
    for (let game of state.gamesData.games) {
        if (game.players === undefined) {
            GAME_FUNCTIONS[game.name].handleChatCommand(game, chatter, message, state);
        }
    }
    if (chatter.playingGameIdRef === undefined) return false;
    const chattersGame = state.gamesData.games.find((g) => g.id === chatter.playingGameIdRef);
    if (!chattersGame) {
        chatter.playingGameIdRef = undefined;
        return false;
    }
    return GAME_FUNCTIONS[chattersGame.name].handleChatCommand(chattersGame, chatter, message, state);
}

function chatterCommands(chatter: Chatter, message: string, state: State): boolean {
    let modifierMessage = message;
    const match = modifierMessage.match(/^[^a-zA-Z]*/);
    if (match) modifierMessage = modifierMessage.substring(match[0].length, modifierMessage.length);
    if (modifierMessage === "sleep" || checkIsTextCloseTo(modifierMessage, "sleep")) {
        if (chatter.state === "sitting") {
            chatter.state = "sleeping";
        }
        return modifierMessage !== "sleep";
    } else if (modifierMessage === "leave") {
        chatter.state = "leaving";
        chatter.moveToX = -CHATTER_IMAGE_WIDTH;
        return false;
    } else if (modifierMessage === GAME_TIC_TAC_TOE || checkIsTextCloseTo(modifierMessage, GAME_TIC_TAC_TOE)) {
        GAME_FUNCTIONS[GAME_TIC_TAC_TOE].handleStartMessage(chatter, state);
        return true;
    }
    return checkForCommandAndReturnIfChatBubble(chatter, message, state);

    return true;
}

function checkIsTextCloseTo(text: string, compareTo: string): boolean {
    if (text.indexOf(compareTo) > -1) {
        return true;
    }
    const maxErrors = Math.max(1, Math.floor(compareTo.length / 4));

    let toCheckIndex = 0;
    let missMatchCount = 0;
    let matchCount = 0;
    for (let i = 0; i < text.length; i++) {
        if (text[i].toLowerCase() === compareTo[toCheckIndex].toLowerCase()) {
            matchCount++;
            toCheckIndex++;
            if (toCheckIndex >= compareTo.length) return true;
            continue;
        }
        if (toCheckIndex + 1 < compareTo.length && text[i].toLowerCase() === compareTo[toCheckIndex + 1].toLowerCase()) {
            matchCount++;
            toCheckIndex += 2;
            if (toCheckIndex >= compareTo.length) return true;
            continue;
        }
        if (matchCount > 0) {
            missMatchCount++;
            if (missMatchCount > maxErrors) {
                matchCount = 0;
                missMatchCount = 0;
                toCheckIndex = 0;
                continue;
            }
            if (toCheckIndex >= compareTo.length) return true;
        }
    }
    return false;
}

function streamerCommands(message: string, state: State): boolean {
    switch (message) {
        case "delete":
            state.chatters = [];
            state.testing.chatterDogAutoTalk = undefined;
            return false;
        case "delete dog":
        case "delete dogs":
        case "delete test dog":
        case "delete test dogs":
            for (let i = state.chatters.length - 1; i >= 0; i--) {
                if (state.chatters[i].name === state.testing.testDogName) {
                    state.chatters.splice(i, 1);
                }
            }
            state.testing.chatterDogAutoTalk = undefined;
            localStorageStoreChatters(state);
            return false;
        case "add":
            addChatterAndRemoveMostInactive(state.testing.testDogName, state);
            return false;
        case "chaos":
            while (state.chatters.length < state.config.maxChatters) {
                addChatterAndRemoveMostInactive(state.testing.testDogName, state);
            }
            state.testing.chatterDogAutoTalk = true;
            return false;
    }
    return true;
}

function addChatterAndRemoveMostInactive(userName: string, state: State) {
    let chatterSpacing = 10;
    let chatterIndex: number = state.inactiveChatters.findIndex(c => c.name === userName);
    let chatter: Chatter;
    if (chatterIndex === -1) {
        chatter = {
            state: "joining",
            speed: 2,
            name: userName, chatMessages: [],
            posX: -CHATTER_IMAGE_WIDTH,
            posY: 0,
            lastMessageTime: performance.now(),
            sound: {},
            draw: {
                pawAnimation: "sit",
                mouthAnimation: "closed",
                nextPupilMoveTime: 0,
                pupilX: 0,
                pupilY: 0,
            }
        };
    } else {
        chatter = state.inactiveChatters.splice(chatterIndex, 1)[0];
        chatter.state = "joining";
    }
    state.chatters.push(chatter);
    if (state.chatters.length > state.config.maxChatters) {
        let mostInactiveIndex = -1;
        let mostInactiveReceiveTime = 0;
        for (let i = 0; i < state.chatters.length; i++) {
            const currentChatter = state.chatters[i];
            if (currentChatter.playingGameIdRef !== undefined) continue;
            if (mostInactiveIndex === -1 || currentChatter.lastMessageTime < mostInactiveReceiveTime) {
                mostInactiveReceiveTime = currentChatter.lastMessageTime;
                mostInactiveIndex = i;
            }
        }
        state.chatters.splice(mostInactiveIndex, 1);
    }
    for (let sittingSpot = 0; sittingSpot < state.config.maxChatters; sittingSpot++) {
        let sittingPositionInUse = false;
        for (let chatter of state.chatters) {
            if (chatter.sittingSpot !== undefined && chatter.sittingSpot === sittingSpot) {
                sittingPositionInUse = true;
                break;
            }
        }
        if (sittingPositionInUse) continue;
        chatter.sittingSpot = sittingSpot;
        chatter.moveToX = (sittingSpot % state.config.maxChattersPerRow) * (chatterSpacing + CHATTER_IMAGE_WIDTH) + 5;
        if (sittingSpot > state.config.maxChattersPerRow) {
            chatter.moveToY = -Math.floor(sittingSpot / state.config.maxChattersPerRow) * 40;
        }
        break;
    }
    state.chatters.sort((chatter1, chatter2) => {
        const chatterY1 = chatter1.moveToY !== undefined ? chatter1.moveToY : chatter1.posY;
        const chatterY2 = chatter2.moveToY !== undefined ? chatter2.moveToY : chatter2.posY;
        return chatterY1 - chatterY2;
    })
    return chatter;
}

