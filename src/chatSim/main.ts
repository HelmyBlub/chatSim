import { drawTextWithOutline } from "../drawHelper.js";

type Position = {
    x: number,
    y: number,
}

type Citizen = {
    name: string,
    state: "idle" | "searchingFood" | "eating",
    speed: number,
    position: Position,
    moveTo?: Position,
    foodPerCent: number,
}

type ChatSimMap = {
    paintOffset: Position,
    mapHeight: number,
    mapWidth: number,
    citizens: Citizen[],
}

type ChatSimState = {
    canvas: HTMLCanvasElement,
    time: number,
    map: ChatSimMap,
}

function chatSimStateInit(): ChatSimState {
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = window.innerWidth - 10;
    canvas.height = window.innerHeight - 10;

    return {
        canvas,
        time: 0,
        map: {
            paintOffset: { x: 150, y: 150 },
            mapHeight: 200,
            mapWidth: 200,
            citizens: [],
        }
    }
}

function addCitizen(user: string, state: ChatSimState) {
    if (state.map.citizens.find(c => c.name === user)) return;
    state.map.citizens.push({
        name: user,
        speed: 1,
        foodPerCent: 1,
        position: { x: 0, y: 0 },
        state: "idle"
    })
}

function initMyApp() {
    const state = chatSimStateInit();
    //@ts-ignore
    ComfyJS.onChat = (user, message, flags, self, extra) => {
        addCitizen(user, state);
    }
    //@ts-ignore
    ComfyJS.onCommand = (user, message, flags, self, extra) => {
        addCitizen(user, state);
    }
    //@ts-ignore
    ComfyJS.Init("HelmiBlub");

    runner(state);
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
        ctx.font = "20px Arial";
        ctx.fillRect(mapPaintMiddle.x + citizen.position.x - citizenSize / 2, mapPaintMiddle.y + citizen.position.y - citizenSize / 2, citizenSize, citizenSize);
        drawTextWithOutline(ctx, citizen.name, mapPaintMiddle.x + citizen.position.x, mapPaintMiddle.y + citizen.position.y);
    }
}

function tick(state: ChatSimState) {
    state.time += 16;
    for (let citizen of state.map.citizens) {
        citizen.foodPerCent -= 0.001;
        if (citizen.state === "idle") {
            if (citizen.moveTo) {
                const diffX = citizen.moveTo.x - citizen.position.x;
                const diffY = citizen.moveTo.y - citizen.position.y;
                const distance = Math.sqrt(diffX * diffX + diffY * diffY);
                if (citizen.speed - distance > 0) {
                    citizen.position.x = citizen.moveTo.x;
                    citizen.position.y = citizen.moveTo.y;
                    citizen.moveTo = undefined;
                } else {
                    const factor = citizen.speed / distance;
                    citizen.position.x += diffX * factor;
                    citizen.position.y += diffY * factor;
                }
            } else {
                citizen.moveTo = {
                    x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                    y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
                }
            }
        }
    }

    for (let i = state.map.citizens.length - 1; i >= 0; i--) {
        if (state.map.citizens[i].foodPerCent < 0) {
            state.map.citizens.splice(i, 1);
        }
    }
}


async function runner(state: ChatSimState) {
    try {
        while (true) {
            tick(state);
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

