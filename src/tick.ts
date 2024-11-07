import { addChatMessageToChatter } from "./chatMessageHandler.js";
import { localStorageStoreChatters } from "./main.js";
import { State, Chatter } from "./mainModels.js";
import { FUNCTIONS_GAME_TIC_TAC_TOE, GameTicTacToe } from "./ticTacToe.js";

export function tick(state: State) {
    deleteInactiveAvatars(state);
    doFrameRateCounterTick(state.frameRateCounter);
    doChatterDogAutoChat(state);
    tickGames(state);
    for (let chatter of state.chatters) {
        deleteOldChatMessages(chatter, state);
        switch (chatter.state) {
            case "joining":
                const reachedEnd = moveToTick(chatter);
                if (reachedEnd) chatter.state = "sitting";
                break;
            case "sitting":
                if (chatter.lastMessageTime + state.config.inactiveToSleepTimeMs < performance.now()) {
                    chatter.state = "sleeping";
                }
                break;
            case "leaving":
                moveToTick(chatter);
                break;
        }
    }
}

function tickGames(state: State) {
    deleteFinishedGames(state);
    for (let game of state.gamesData.games) {
        FUNCTIONS_GAME_TIC_TAC_TOE.tick(game as GameTicTacToe, state);
    }
}

function doChatterDogAutoChat(state: State) {
    if (!state.testing.chatterDogAutoTalk) return;
    let currentTime = performance.now();
    for (let chatter of state.chatters) {
        if (chatter.name === state.testing.testDogName) {
            const randomWait = Math.random() * 500 + (500 * (1 + state.chatters.length / 5));
            if (chatter.lastMessageTime + randomWait >= currentTime) continue;
            let text = "";
            const wordList = ["hi", "test", "random", "clap", "sleep", "NotLikeThis", "Kappa", "HeyGuys"];
            const iterationCount = Math.floor(Math.random() * 3 + 1);
            for (let i = 0; i < iterationCount; i++) {
                let randomWordIndex = Math.floor(Math.random() * wordList.length);
                if (i > 0) text += " ";
                text += wordList[randomWordIndex];
            }
            addChatMessageToChatter(chatter, text, state);
        }
    }
}

function deleteFinishedGames(state: State) {
    for (let i = state.gamesData.games.length - 1; i >= 0; i--) {
        const game = state.gamesData.games[i];
        if (game.finishedTime !== undefined && game.finishedTime + state.gamesData.deleteFinishedGamesAfterMs <= performance.now()) {
            state.gamesData.games.splice(i, 1);
        }
    }
}

function doFrameRateCounterTick(frameRateCounter: number[] | undefined) {
    if (frameRateCounter === undefined) return;
    const newTime = performance.now();
    const trackInterval = 1000;
    frameRateCounter.push(newTime);
    while (frameRateCounter[0] + trackInterval <= newTime) {
        frameRateCounter.shift();
    }
}

function deleteOldChatMessages(chatter: Chatter, state: State) {
    for (let i = chatter.chatMessages.length - 1; i >= 0; i--) {
        if (performance.now() - chatter.chatMessages[i].receiveTime > state.config.deleteMessageTimeMs) {
            chatter.chatMessages.splice(i, 1);
            localStorageStoreChatters(state);
        }
    }
}

function moveToTick(chatter: Chatter): boolean {
    if (chatter.moveToX === undefined && chatter.moveToY === undefined) return false;
    if (chatter.moveToX !== undefined) {
        if (chatter.posX < chatter.moveToX) {
            chatter.posX += chatter.speed;
        } else {
            chatter.posX -= chatter.speed;
        }
        if (Math.abs(chatter.posX - chatter.moveToX) < chatter.speed) {
            chatter.posX = chatter.moveToX;
            chatter.moveToX = undefined;
        }
    }
    if (chatter.moveToY !== undefined) {
        if (chatter.posY < chatter.moveToY) {
            chatter.posY += chatter.speed;
        } else {
            chatter.posY -= chatter.speed;
        }
        if (Math.abs(chatter.posY - chatter.moveToY) < chatter.speed) {
            chatter.posY = chatter.moveToY;
            chatter.moveToY = undefined;
        }
    }
    if (chatter.moveToX === undefined && chatter.moveToY === undefined) return true;
    return false;
}

function deleteInactiveAvatars(state: State) {
    for (let i = state.chatters.length - 1; i >= 0; i--) {
        const chatter = state.chatters[i];
        if (chatter.name !== state.streamerName && performance.now() - chatter.lastMessageTime > state.config.deleteInactiveChatterAfterTimeMs) {
            if (chatter.state !== "leaving") {
                chatter.state = "leaving";
                chatter.sittingSpot = undefined;
                chatter.moveToX = -200;
                chatter.moveToY = 0;
            }
        }
        if (chatter.state === "leaving" && chatter.posX < -200 + chatter.speed) {
            state.chatters.splice(i, 1);
            localStorageStoreChatters(state);
        }
    }
}

