import { Chatter } from "../obsOverlayApp/mainModels.js";
import { Position, ChatSimState, App, RandomSeed, ChatterData } from "./chatSimModels.js";
import { addCitizen, Citizen, citizenSetDreamJob, loadCitizenStateTypeFunctions } from "./citizen.js";
import { loadCitizenNeedsFunctions } from "./citizenNeeds/citizenNeed.js";
import { loadImages } from "./images.js";
import { chatSimAddInputEventListeners, moveMapCameraBy } from "./input.js";
import { loadCitizenJobsFunctions } from "./jobs/job.js";
import { createDefaultMap } from "./map.js";
import { paintChatSim } from "./paint.js";
import { loadChatSimSounds } from "./sounds.js";
import { testRunner } from "./test/test.js";
import { chatSimTick, onLoadCitizenStateDefaultTickFuntions } from "./tick.js";
import { citizenAddTrait, CITIZEN_TRAIT_ROBOT, handleChatterAddTraitMessage, loadTraits, citizenAddRandomTrait } from "./traits/trait.js";

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
        timPerDay: 150000,
        sunriseAt: 0.22,
        sunsetAt: 0.88,
        chatterData: [],
        functionsCitizenJobs: {},
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
            },
            chatterChangeLog: {
                maxLength: 10,
                currentIndex: 0,
                log: [],
            }
        }
    }
    loadCitizenJobsFunctions(state);
    onLoadCitizenStateDefaultTickFuntions();
    return state;
}

export function addChatterChangeLog(message: string, state: ChatSimState) {
    const logData = state.inputData.chatterChangeLog;
    logData.log[logData.currentIndex] = {
        time: performance.now(),
        message: message,
    };
    logData.currentIndex = (logData.currentIndex + 1) % logData.maxLength;
}

export function handleChatMessage(user: string, message: string, state: ChatSimState) {
    let chatter = state.chatterData.find(c => c.name === user);
    if (!chatter) {
        const newCitizen = addCitizen(user, state);
        if (newCitizen) citizenAddRandomTrait(newCitizen, state);
        chatter = addChatter(user, state);
    }
    const citizen = state.map.citizens.find(c => c.name === user);
    if (!chatter || !citizen) return;
    if (message.startsWith("job")) {
        const splits = message.split(" ");
        if (splits.length > 1) {
            let dreamJob = splits[1];
            if (splits.length > 2) dreamJob += " " + splits[2];
            const maxLength = 30;
            if (dreamJob.length > maxLength) dreamJob = dreamJob.substring(0, maxLength);
            if (citizen) {
                citizenSetDreamJob(citizen, dreamJob, state);
                addChatterChangeLog(`${citizen.name} set Dream Job to ${dreamJob}`, state);
            }
            if (chatter) {
                chatter.dreamJob = dreamJob;
            }
            saveLocalStorageChatter(state.chatterData);
        }
    } else if (message.startsWith("trait")) {
        const splits = message.split(" ");
        let trait = splits[1];
        if (splits.length > 1) {
            if (splits.length > 2) trait += " " + splits[2];
            const maxLength = 30;
            if (trait.length > maxLength) trait = trait.substring(0, maxLength);
            handleChatterAddTraitMessage(chatter, citizen, trait, state);
            addChatterChangeLog(`${citizen.name} added trait ${trait}`, state);
            saveLocalStorageChatter(state.chatterData);
        }
    }

    if (message.indexOf("add me on discord") > -1
        || message.indexOf("Cheap viewers") > -1
        || message.indexOf("Best viewers") > -1
    ) {
        handleChatterAddTraitMessage(chatter, citizen, CITIZEN_TRAIT_ROBOT, state);
        addChatterChangeLog(`${citizen.name} added trait ${CITIZEN_TRAIT_ROBOT}`, state);
        saveLocalStorageChatter(state.chatterData);
    }
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
    loadCitizenNeedsFunctions();
    loadTraits();
    loadLocalStorageChatters(state);
    loadImages();
    loadChatSimSounds();
    loadCitizenStateTypeFunctions();
    //@ts-ignore
    ComfyJS.onChat = (user, message, flags, self, extra) => {
        handleChatMessage(user, message, state);
    }
    //@ts-ignore
    ComfyJS.onCommand = (user, message, flags, self, extra) => {
        handleChatMessage(user, `${message} ${flags}`, state);
    }
    //@ts-ignore
    ComfyJS.Init(state.streamer);

    runner(app);
}

function addChatter(user: string, state: ChatSimState): ChatterData {
    const chatterData = state.chatterData.find(c => c.name === user);
    if (chatterData) return chatterData;
    const newChatterData = { name: user };
    state.chatterData.push(newChatterData);
    saveLocalStorageChatter(state.chatterData);
    return newChatterData;
}

function saveLocalStorageChatter(chatterData: ChatterData[]) {
    localStorage.setItem(LOCAL_STORAGE_CHATTER_KEY, JSON.stringify(chatterData));
}

function loadLocalStorageChatters(state: ChatSimState) {
    const testData = localStorage.getItem(LOCAL_STORAGE_CHATTER_KEY);
    if (testData) {
        let data = JSON.parse(testData);
        if (typeof data[0] === 'string') {
            data = updateLocalStorageDataToNewVersion(data);
            saveLocalStorageChatter(data);
        }
        state.chatterData = data;
        for (let chatter of state.chatterData) {
            const citizen = addCitizen(chatter.name, state);
            if (citizen) {
                citizenSetDreamJob(citizen, chatter.dreamJob, state);
                if (chatter.traits) {
                    for (let trait of chatter.traits) {
                        citizenAddTrait(citizen, trait, state);
                    }
                } else {
                    citizenAddRandomTrait(citizen, state);
                }
            }
        }
    }
}

function updateLocalStorageDataToNewVersion(oldData: string[]): ChatterData[] {
    const newData: ChatterData[] = [];
    for (let entry of oldData) {
        newData.push({ name: entry });
    }
    return newData;
}

async function runner(app: App) {
    try {
        let loopStart: number = 0;
        const maxFrameInterval = 50;
        while (true) {
            if (app.runningTests) testRunner(app);
            loopStart = performance.now();
            const state = app.state;
            let startIndex = 0;
            if (state.gameSpeed % 1 !== 0) {
                startIndex++;
                if (app.gameSpeedRemainder === undefined) app.gameSpeedRemainder = 0;
                app.gameSpeedRemainder += state.gameSpeed % 1;
                if (app.gameSpeedRemainder >= 1) {
                    app.gameSpeedRemainder--;
                    chatSimTick(state);
                }
            }
            state.gameSpeedLimited = undefined;
            for (let i = startIndex; i < state.gameSpeed; i++) {
                chatSimTick(state);
                if (performance.now() - loopStart > maxFrameInterval) {
                    state.gameSpeedLimited = i;
                    break;
                }
            }
            paintChatSim(app.state, state.gameSpeed);
            if (state.inputData.map.moveX || state.inputData.map.moveY) moveMapCameraBy(state.inputData.map.moveX, state.inputData.map.moveY, state);
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

