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

type Mushroom = {
    foodValue: 1,
    position: Position,
}

type ChatSimMap = {
    paintOffset: Position,
    mapHeight: number,
    mapWidth: number,
    citizens: Citizen[],
    mushrooms: Mushroom[],
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
            mushrooms: [],
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
        if (user === "HelmiBlub") {
            if (message.indexOf("test") !== -1) {
                for (let i = 0; i < 99; i++) {
                    addCitizen(user + i, state);
                }
            }
        }
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
}

function calculateDistance(position1: Position, position2: Position): number {
    const diffX = position1.x - position2.x;
    const diffY = position1.y - position2.y;
    return Math.sqrt(diffX * diffX + diffY * diffY);
}

function tick(state: ChatSimState) {
    state.time += 16;
    for (let citizen of state.map.citizens) {
        citizen.foodPerCent -= 0.0015;
        if (citizen.foodPerCent < 0.5) citizen.state = "searchingFood";
        if (citizen.state === "idle") {
            if (!citizen.moveTo) {
                citizen.moveTo = {
                    x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                    y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
                }
            }
        } else if (citizen.state === "searchingFood") {
            if (!citizen.moveTo && state.map.mushrooms.length > 0) {
                const mushroomIndex = Math.floor(Math.random() * state.map.mushrooms.length);
                citizen.moveTo = {
                    x: state.map.mushrooms[mushroomIndex].position.x,
                    y: state.map.mushrooms[mushroomIndex].position.y,
                }
            }
            for (let i = state.map.mushrooms.length - 1; i >= 0; i--) {
                const mushroom = state.map.mushrooms[i];
                const distance = calculateDistance(mushroom.position, citizen.position);
                if (distance < 10) {
                    state.map.mushrooms.splice(i, 1);
                    citizen.foodPerCent = Math.min(citizen.foodPerCent + mushroom.foodValue, 1);
                    citizen.state = "idle";
                    break;
                }
            }
        }
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
        }
    }
    if (state.map.mushrooms.length === 0) {
        const newMushrooms: Mushroom = {
            foodValue: 1,
            position: {
                x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
            }
        }
        state.map.mushrooms.push(newMushrooms);
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

