import { drawTextWithOutline } from "../drawHelper.js";
import { chatSimTick } from "./tick.js";

export type Position = {
    x: number,
    y: number,
}

export type Citizen = {
    job?: "food gatherer" | "food market",
    name: string,
    state: "idle" | "gatherFood" | "sellingToMarket" | "buyFoodFromMarket" | "stationary",
    speed: number,
    position: Position,
    moveTo?: Position,
    foodPerCent: number,
    carryStuff: Mushroom[],
    maxCarry: number,
    skill: { [key: string]: number },
}

export type Mushroom = {
    foodValue: 1,
    position: Position,
}

export type ChatSimMap = {
    paintOffset: Position,
    mapHeight: number,
    mapWidth: number,
    citizens: Citizen[],
    mushrooms: Mushroom[],
    maxMushrooms: number,
}

export type ChatSimState = {
    canvas: HTMLCanvasElement,
    time: number,
    gameSpeed: number,
    map: ChatSimMap,
    chatterNames: string[],
}

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
        map: {
            paintOffset: { x: 0, y: 0 },
            mapHeight: 400,
            mapWidth: 400,
            citizens: [],
            mushrooms: [],
            maxMushrooms: 2,
        }
    }
}

function addCitizen(user: string, state: ChatSimState) {
    if (state.map.citizens.find(c => c.name === user)) return;
    state.map.citizens.push({
        name: user,
        speed: 2,
        foodPerCent: 1,
        position: { x: 0, y: 0 },
        state: "idle",
        carryStuff: [],
        maxCarry: 10,
        skill: {},
    })
}

function initMyApp() {
    const state = chatSimStateInit();
    loadLocalStorageChatters(state);
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
    document.addEventListener('keyup', (e) => keyUp(e, state));

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


function keyUp(event: KeyboardEvent, state: ChatSimState) {
    switch (event.code) {
        case "Period":
            state.gameSpeed++;
            break;
        case "Comma":
            if (state.gameSpeed > 0) state.gameSpeed--;
            break
        default:
            console.log(event.key, event.code);
            break;
    }
}

function paint(state: ChatSimState) {
    const ctx = state.canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);


    ctx.fillStyle = "green";
    ctx.fillRect(state.map.paintOffset.x, state.map.paintOffset.y, state.map.mapWidth, state.map.mapHeight);
    const mapPaintMiddle = {
        x: Math.floor(state.map.paintOffset.x + state.map.mapWidth / 2),
        y: Math.floor(state.map.paintOffset.y + state.map.mapHeight / 2),
    };
    const citizenSize = 20;
    for (let citizen of state.map.citizens) {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "black";
        ctx.font = "20px Arial";
        ctx.fillRect(mapPaintMiddle.x + citizen.position.x - citizenSize / 2, mapPaintMiddle.y + citizen.position.y - citizenSize / 2, citizenSize, citizenSize * citizen.foodPerCent);
        ctx.beginPath();
        ctx.rect(mapPaintMiddle.x + citizen.position.x - citizenSize / 2, mapPaintMiddle.y + citizen.position.y - citizenSize / 2, citizenSize, citizenSize);
        ctx.stroke();
        const nameOffsetX = Math.floor(ctx.measureText(citizen.name).width / 2);
        drawTextWithOutline(ctx, citizen.name, mapPaintMiddle.x + citizen.position.x - nameOffsetX, mapPaintMiddle.y + citizen.position.y - citizenSize / 2);
    }
    const mushroomSize = 10;
    for (let mushroom of state.map.mushrooms) {
        ctx.fillStyle = "red";
        ctx.fillRect(mapPaintMiddle.x + mushroom.position.x - mushroomSize / 2, mapPaintMiddle.y + mushroom.position.y - mushroomSize / 2, mushroomSize, mushroomSize);
    }
    paintData(ctx, state);
}

function paintData(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    const offsetX = state.map.mapWidth + 100;
    ctx.fillText(`speed: ${state.gameSpeed}`, offsetX, 25);
    for (let i = 0; i < state.map.citizens.length; i++) {
        const citizen = state.map.citizens[i];
        let text = `${citizen.name}: ${citizen.carryStuff.length} Mushrooms`;
        if (citizen.job && citizen.skill[citizen.job] !== undefined) {
            text += `, Job: ${citizen.job} ${citizen.skill[citizen.job]}`;
        }
        ctx.fillText(text, offsetX, 50 + i * 26);
    }
}

async function runner(state: ChatSimState) {
    try {
        while (true) {
            for (let i = 0; i < state.gameSpeed; i++) {
                chatSimTick(state);
            }
            paint(state);
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

