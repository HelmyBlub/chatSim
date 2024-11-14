import { IMAGE_PATH_CITIZEN, IMAGE_PATH_CITIZEN_HOUSE, IMAGE_PATH_MUSHROOM, IMAGE_PATH_TREE, loadImage } from "../drawHelper.js";
import { Position, ChatSimState } from "./chatSimModels.js";
import { CITIZEN_STATE_TYPE_WORKING_JOB } from "./citizen.js";
import { loadCitizenNeedsFunctions } from "./citizenNeeds/citizenNeed.js";
import { chatSimAddInputEventListeners } from "./input.js";
import { createJob, loadCitizenJobsFunctions } from "./jobs/job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobs/jobFoodGatherer.js";
import { paintChatSim } from "./paint.js";
import { chatSimTick } from "./tick.js";

export const SKILL_GATHERING = "Gathering";
export const INVENTORY_MUSHROOM = "Mushroom";
export const INVENTORY_WOOD = "Wood";
const LOCAL_STORAGE_CHATTER_KEY = "chatSimChatters";

export function calculateDistance(position1: Position, position2: Position): number {
    const diffX = position1.x - position2.x;
    const diffY = position1.y - position2.y;
    return Math.sqrt(diffX * diffX + diffY * diffY);
}

export function addCitizen(user: string, state: ChatSimState) {
    if (state.map.citizens.find(c => c.name === user)) return;
    state.map.citizens.push({
        name: user,
        birthTime: state.time,
        speed: 2,
        foodPerCent: 1,
        energyPerCent: 1,
        position: { x: 0, y: 0 },
        stateInfo: {
            type: CITIZEN_STATE_TYPE_WORKING_JOB,
        },
        inventory: [],
        maxInventory: 10,
        money: 10,
        skills: {},
        job: createJob(CITIZEN_JOB_FOOD_GATHERER, state),
        log: [],
        maxLogLength: 100,
    })
}

/**
 * @returns value between 0 and 1. midnight = 0. 
 */
export function getTimeOfDay(state: ChatSimState): number {
    return (state.time % state.timPerDay) / state.timPerDay;
}

export function getTimeOfDayString(state: ChatSimState): string {
    const timeOfDayNumber = getTimeOfDay(state) * 24;
    const days = Math.floor(state.time / state.timPerDay) + 1;
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
    const mapSize = 400;
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
        map: {
            mapHeight: mapSize,
            mapWidth: mapSize,
            citizens: [],
            mushrooms: [],
            maxMushrooms: 2,
            maxTrees: 2,
            trees: [],
            houses: [],
        },
        paintData: {
            map: {
                paintOffset: { x: 20, y: 20 },
                paintWidth: 440,
                paintHeight: 440,
                cameraPosition: { x: 0, y: 0 },
                zoom: 1,
            }
        },
        inputData: {
            lastMouseDownTime: 0,
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
}

function initMyApp() {
    const state = chatSimStateInit("HelmiBlub");
    loadCitizenJobsFunctions(state);
    loadCitizenNeedsFunctions(state);
    loadLocalStorageChatters(state);
    loadImages(state);
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
            for (let i = 0; i < state.gameSpeed; i++) {
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

