import { IMAGE_PATH_CITIZEN, IMAGE_PATH_CITIZEN_HOUSE, IMAGE_PATH_MUSHROOM, IMAGE_PATH_TREE, loadImage } from "../drawHelper.js";
import { Position, ChatSimState } from "./chatSimModels.js";
import { CITIZEN_STATE_WORKING_JOB } from "./citizen.js";
import { loadCitizenNeedsFunctions } from "./citizenNeeds.js";
import { createJob, loadCitizenJobsFunctions } from "./job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";
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

function chatSimStateInit(): ChatSimState {
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = window.innerWidth - 10;
    canvas.height = window.innerHeight - 10;

    return {
        canvas,
        time: 0,
        gameSpeed: 1,
        chatterNames: [],
        functionsCitizenJobs: {},
        functionsCitizenNeeds: {},
        images: {},
        map: {
            paintOffset: { x: 0, y: 0 },
            mapHeight: 400,
            mapWidth: 400,
            citizens: [],
            mushrooms: [],
            maxMushrooms: 2,
            maxTrees: 2,
            trees: [],
            houses: [],
        }
    }
}

function addCitizen(user: string, state: ChatSimState) {
    if (state.map.citizens.find(c => c.name === user)) return;
    state.map.citizens.push({
        name: user,
        birthTime: state.time,
        speed: 2,
        foodPerCent: 1,
        position: { x: 0, y: 0 },
        state: CITIZEN_STATE_WORKING_JOB,
        inventory: [],
        maxInventory: 10,
        money: 10,
        skills: {},
        job: createJob(CITIZEN_JOB_FOOD_GATHERER, state),
        log: [],
        maxLogLength: 100,
    })
}

function loadImages(state: ChatSimState) {
    state.images[IMAGE_PATH_TREE] = loadImage(IMAGE_PATH_TREE);
    state.images[IMAGE_PATH_MUSHROOM] = loadImage(IMAGE_PATH_MUSHROOM);
    state.images[IMAGE_PATH_CITIZEN] = loadImage(IMAGE_PATH_CITIZEN);
    state.images[IMAGE_PATH_CITIZEN_HOUSE] = loadImage(IMAGE_PATH_CITIZEN_HOUSE);
}

function initMyApp() {
    const state = chatSimStateInit();
    loadCitizenJobsFunctions(state);
    loadCitizenNeedsFunctions(state);
    loadLocalStorageChatters(state);
    loadImages(state);
    //@ts-ignore
    ComfyJS.onChat = (user, message, flags, self, extra) => {
        if (user === "HelmiBlub") {
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
    ComfyJS.Init("HelmiBlub");
    document.addEventListener('keydown', (e) => keyDown(e, state));

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

function keyDown(event: KeyboardEvent, state: ChatSimState) {
    const speedScaling = 1.2;
    switch (event.code) {
        case "Period":
            if (state.gameSpeed < 5) {
                state.gameSpeed++;
            } else {
                state.gameSpeed *= speedScaling;
                state.gameSpeed = Math.round(state.gameSpeed);
            }
            break;
        case "Comma":
            if (state.gameSpeed < 5 && state.gameSpeed > 0) {
                state.gameSpeed--;
            } else {
                state.gameSpeed /= speedScaling;
                state.gameSpeed = Math.round(state.gameSpeed);
            }
            break
        case "KeyM":
            addCitizen("TestCitizen" + Math.floor(Math.random() * 1000), state);
            break
        default:
            console.log(event.key, event.code);
            break;
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

