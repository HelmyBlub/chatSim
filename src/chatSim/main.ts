import { IMAGE_PATH_AXE, IMAGE_PATH_BASKET, IMAGE_PATH_BUILDING_MARKET, IMAGE_PATH_CITIZEN, IMAGE_PATH_CITIZEN_HOUSE, IMAGE_PATH_HELMET, IMAGE_PATH_MUSHROOM, IMAGE_PATH_TREE, IMAGE_PATH_TREE_LOG, IMAGE_PATH_WOOD_PLANK, loadImage } from "../drawHelper.js";
import { Position, ChatSimState } from "./chatSimModels.js";
import { addCitizen } from "./citizen.js";
import { loadCitizenNeedsFunctions } from "./citizenNeeds/citizenNeed.js";
import { chatSimAddInputEventListeners } from "./input.js";
import { loadCitizenJobsFunctions } from "./jobs/job.js";
import { createDefaultMap } from "./map.js";
import { paintChatSim } from "./paint.js";
import { chatSimTick, onLoadCitizenStateDefaultTickFuntions } from "./tick.js";

export const SKILL_GATHERING = "Gathering";
export const INVENTORY_MUSHROOM = "Mushroom";
export const INVENTORY_WOOD = "Wood";
const LOCAL_STORAGE_CHATTER_KEY = "chatSimChatters";

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


/**
 * @returns value between 0 and 1. midnight = 0. 
 */
export function getTimeOfDay(time: number, state: ChatSimState): number {
    return (time % state.timPerDay) / state.timPerDay;
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

function chatSimStateInit(streamer: string): ChatSimState {
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = window.innerWidth - 10;
    canvas.height = window.innerHeight - 10;
    return {
        canvas,
        streamer: streamer,
        time: 0,
        timPerDay: 100000,
        gameSpeed: 1,
        sunriseAt: 0.22,
        sunsetAt: 0.88,
        chatterNames: [],
        functionsCitizenJobs: {},
        functionsCitizenNeeds: {},
        images: {},
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
}

function loadImages(state: ChatSimState) {
    state.images[IMAGE_PATH_TREE] = loadImage(IMAGE_PATH_TREE);
    state.images[IMAGE_PATH_MUSHROOM] = loadImage(IMAGE_PATH_MUSHROOM);
    state.images[IMAGE_PATH_CITIZEN] = loadImage(IMAGE_PATH_CITIZEN);
    state.images[IMAGE_PATH_CITIZEN_HOUSE] = loadImage(IMAGE_PATH_CITIZEN_HOUSE);
    state.images[IMAGE_PATH_BUILDING_MARKET] = loadImage(IMAGE_PATH_BUILDING_MARKET);
    state.images[IMAGE_PATH_AXE] = loadImage(IMAGE_PATH_AXE);
    state.images[IMAGE_PATH_BASKET] = loadImage(IMAGE_PATH_BASKET);
    state.images[IMAGE_PATH_HELMET] = loadImage(IMAGE_PATH_HELMET);
    state.images[IMAGE_PATH_TREE_LOG] = loadImage(IMAGE_PATH_TREE_LOG);
    state.images[IMAGE_PATH_WOOD_PLANK] = loadImage(IMAGE_PATH_WOOD_PLANK);
}

function initMyApp() {
    const state = chatSimStateInit("HelmiBlub");
    loadCitizenJobsFunctions(state);
    loadCitizenNeedsFunctions(state);
    loadLocalStorageChatters(state);
    loadImages(state);
    onLoadCitizenStateDefaultTickFuntions();
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
    chatSimAddInputEventListeners(state);

    runner(state);
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

async function runner(state: ChatSimState) {
    try {
        while (true) {
            let startIndex = 0;
            if (state.gameSpeed % 1 !== 0) {
                startIndex++;
                if (state.gameSpeedRemainder === undefined) state.gameSpeedRemainder = 0;
                state.gameSpeedRemainder += state.gameSpeed % 1;
                if (state.gameSpeedRemainder >= 1) {
                    state.gameSpeedRemainder--;
                    chatSimTick(state);
                }
            }
            for (let i = startIndex; i < state.gameSpeed; i++) {
                chatSimTick(state);
            }
            paintChatSim(state);
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

