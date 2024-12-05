import { Position, ChatSimState, App, RandomSeed } from "./chatSimModels.js";
import { addCitizen } from "./citizen.js";
import { loadCitizenNeedsFunctions } from "./citizenNeeds/citizenNeed.js";
import { loadImages } from "./images.js";
import { chatSimAddInputEventListeners } from "./input.js";
import { loadCitizenJobsFunctions } from "./jobs/job.js";
import { createDefaultMap } from "./map.js";
import { paintChatSim } from "./paint.js";
import { loadChatSimSounds } from "./sounds.js";
import { testRunner } from "./test/test.js";
import { chatSimTick, onLoadCitizenStateDefaultTickFuntions } from "./tick.js";

export const SKILL_GATHERING = "Gathering";
const LOCAL_STORAGE_CHATTER_KEY = "chatSimChatters";

export type Position3D = Position & { z: number };

export function calculateDistance3D(position1: Position3D, position2: Position3D): number {
    const diffX = position1.x - position2.x;
    const diffY = position1.y - position2.y;
    const diffZ = position1.z - position2.z;
    return Math.sqrt(diffX * diffX + diffY * diffY + diffZ * diffZ);
}

export function calculateDistance(position1: Position, position2: Position): number {
    const diffX = position1.x - position2.x;
    const diffY = position1.y - position2.y;
    return Math.sqrt(diffX * diffX + diffY * diffY);
}

export function calculateDirection(startPos: Position, targetPos: Position): number {
    let direction = 0;

    const yDiff = (startPos.y - targetPos.y);
    const xDiff = (startPos.x - targetPos.x);

    if (xDiff >= 0) {
        direction = - Math.PI + Math.atan(yDiff / xDiff);
    } else if (yDiff < 0) {
        direction = - Math.atan(xDiff / yDiff) + Math.PI / 2;
    } else {
        direction = - Math.atan(xDiff / yDiff) - Math.PI / 2;
    }
    if (isNaN(direction)) return 0;
    return direction;
}

export function nextRandom(seed: RandomSeed) {
    seed.seed++;
    let a = seed.seed * 15485863;
    return (a * a * a % 2038074743) / 2038074743;
}

/**
 * @returns value between 0 and 1. midnight = 0. 
 */
export function getTimeOfDay(time: number, state: ChatSimState): number {
    return (time % state.timPerDay) / state.timPerDay;
}

export function getDay(state: ChatSimState): number {
    return Math.floor(state.time / state.timPerDay) + 1;
}

export function getTimeOfDayString(time: number, state: ChatSimState): string {
    const timeOfDayNumber = getTimeOfDay(time, state) * 24;
    const days = Math.floor(time / state.timPerDay) + 1;
    const hours = Math.floor(timeOfDayNumber);
    const hoursString = hours >= 10 ? hours : `0${hours}`;
    const minutes = Math.floor((timeOfDayNumber - hours) * 60);
    const minutesString = minutes >= 10 ? minutes : `0${minutes}`;
    return `Time ${hoursString}:${minutesString}, Day:${days}`;
}

export function createDefaultChatSimState(streamerName: string, seed: number): ChatSimState {
    const state: ChatSimState = {
        streamer: streamerName,
        time: 0,
        tickInterval: 16,
        gameSpeed: 1,
        timPerDay: 100000,
        sunriseAt: 0.22,
        sunsetAt: 0.88,
        chatterNames: [],
        functionsCitizenJobs: {},
        functionsCitizenNeeds: {},
        randomSeed: { seed: seed },
        map: createDefaultMap(),
        paintData: {
            map: {
                paintOffset: { x: 0, y: 0 },
                paintWidth: 1040,
                paintHeight: 640,
                cameraPosition: { x: 0, y: 0 },
                zoom: 1,
                lockCameraToSelected: true,
            }
        },
        inputData: {
            lastMouseDownTime: 0,
            lastMouseDownPosition: { x: 0, y: 0 },
            map: {
                moveX: 0,
                moveY: 0,
                mouseMoveMap: false,
            }
        }
    }
    loadCitizenJobsFunctions(state);
    loadCitizenNeedsFunctions(state);
    onLoadCitizenStateDefaultTickFuntions();
    return state;
}

function chatSimStateInit(streamer: string): App {
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = window.innerWidth - 10;
    canvas.height = window.innerHeight - 10;
    const state = createDefaultChatSimState(streamer, Math.random());
    state.soundVolume = 1;
    const app: App = { state: state };
    state.canvas = canvas;
    chatSimAddInputEventListeners(app, canvas);
    state.logger = { log: (message, data) => console.log(message, data) };
    return app;
}

function initMyApp() {
    const app = chatSimStateInit("HelmiBlub");
    const state = app.state;
    loadLocalStorageChatters(state);
    loadImages();
    loadChatSimSounds();
    //@ts-ignore
    ComfyJS.onChat = (user, message, flags, self, extra) => {
        if (user === state.streamer) {
            if (message.indexOf("test") !== -1) {
                for (let i = 0; i < 99; i++) {
                    addCitizen(user + i, state);
                }
            }
        }
        addCitizen(user, state);
        addChatter(user, state);
    }
    //@ts-ignore
    ComfyJS.onCommand = (user, message, flags, self, extra) => {
        addCitizen(user, state);
        addChatter(user, state);
    }
    //@ts-ignore
    ComfyJS.Init(state.streamer);

    runner(app);
}

function addChatter(user: string, state: ChatSimState) {
    if (state.chatterNames.find(c => c === user)) return;
    state.chatterNames.push(user);
    saveLoaclStorageChatter(state);
}

function saveLoaclStorageChatter(state: ChatSimState) {
    localStorage.setItem(LOCAL_STORAGE_CHATTER_KEY, JSON.stringify(state.chatterNames));
}

function loadLocalStorageChatters(state: ChatSimState) {
    const testData = localStorage.getItem(LOCAL_STORAGE_CHATTER_KEY);
    if (testData) {
        state.chatterNames = JSON.parse(testData);
        for (let chatter of state.chatterNames) {
            addCitizen(chatter, state);
        }
    }
}

async function runner(app: App) {
    try {
        while (true) {
            if (app.runningTests) testRunner(app);
            let startIndex = 0;
            if (app.state.gameSpeed % 1 !== 0) {
                startIndex++;
                if (app.gameSpeedRemainder === undefined) app.gameSpeedRemainder = 0;
                app.gameSpeedRemainder += app.state.gameSpeed % 1;
                if (app.gameSpeedRemainder >= 1) {
                    app.gameSpeedRemainder--;
                    chatSimTick(app.state);
                }
            }
            for (let i = startIndex; i < app.state.gameSpeed; i++) {
                chatSimTick(app.state);
            }
            paintChatSim(app.state, app.state.gameSpeed);
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
    initMyApp();
});

