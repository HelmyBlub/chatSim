import { addChatMessage } from "./chatMessageHandler.js"
import { draw } from "./draw.js"
import { addGameFunctionsCookieOven } from "./gameCookieOven.js";
import { addGameFunctionsTicTacToe } from "./gameTicTacToe.js";
import { State, stateInit } from "./mainModels.js";
import { tick } from "./tick.js"

export const AUDIO_HEYGUYS = "sounds/HeyGuys.mp3";
const AUDIO_CLAP_1 = "sounds/clap1.mp3";
const AUDIO_CLAP_2 = "sounds/clap2.mp3";
const AUDIO_CLAP_3 = "sounds/clap3.mp3";
const AUDIO_CLAP_4 = "sounds/clap4.mp3";
const AUDIO_CLAP_5 = "sounds/clap5.mp3";
const LOCAL_STORAGE_NAME = "TestStorage";

export function playSoundRandomClapping(state: State, notThisIndex: number | undefined) {
    let randomIndex = Math.floor(Math.random() * 5) + 1;
    if (randomIndex === notThisIndex) randomIndex = (randomIndex % 5) + 1;
    const path = `sounds/clap${randomIndex}.mp3`;
    let sound = state.sounds[path];
    if (sound) {
        sound.play();
        return randomIndex;
    }
    console.log("sound not found", path);
    return undefined;
}

export function loadSounds(state: State) {
    state.sounds[AUDIO_HEYGUYS] = new Audio(AUDIO_HEYGUYS);
    state.sounds[AUDIO_CLAP_1] = new Audio(AUDIO_CLAP_1);
    state.sounds[AUDIO_CLAP_2] = new Audio(AUDIO_CLAP_2);
    state.sounds[AUDIO_CLAP_3] = new Audio(AUDIO_CLAP_3);
    state.sounds[AUDIO_CLAP_4] = new Audio(AUDIO_CLAP_4);
    state.sounds[AUDIO_CLAP_5] = new Audio(AUDIO_CLAP_5);
}


export function localStorageStoreChatters(state: State) {
    localStorage.setItem(LOCAL_STORAGE_NAME, JSON.stringify(state.chatters));
}

function initMyApp() {
    const state = stateInit();
    //@ts-ignore
    ComfyJS.onChat = (user, message, flags, self, extra) => {
        addChatMessage(user, message, state);
    }
    //@ts-ignore
    ComfyJS.onCommand = (user, message, flags, self, extra) => {
        addChatMessage(user, message, state);
    }
    //@ts-ignore
    ComfyJS.Init("HelmiBlub");

    loadLocalStorage(state);
    runner(state);
}

function loadLocalStorage(state: State) {
    const testData = localStorage.getItem(LOCAL_STORAGE_NAME);
    if (testData) {
        state.chatters = JSON.parse(testData);
        for (let chatter of state.chatters) {
            chatter.lastMessageTime = 0;
            chatter.draw.blinkStartedTime = undefined;
            chatter.draw.nextPupilMoveTime = 0;
            for (let message of chatter.chatMessages) {
                message.receiveTime = performance.now();
            }
        }
    }
}

async function runner(state: State) {
    try {
        while (true) {
            tick(state);
            draw(state);
            await sleep(16);
        }
    } catch (e) {
        throw e;
    }
}

async function sleep(milliseconds: number) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    addGameFunctionsTicTacToe();
    addGameFunctionsCookieOven();
    initMyApp();
});

