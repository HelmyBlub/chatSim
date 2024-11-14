import { drawTextWithOutline, IMAGE_PATH_CITIZEN } from "../drawHelper.js";
import { ChatSimState, House, InventoryStuff, Position } from "./chatSimModels.js";
import { tickCitizenNeeds } from "./citizenNeeds/citizenNeed.js";
import { CITIZEN_NEED_SLEEP } from "./citizenNeeds/citizenNeedSleep.js";
import { CitizenJob, tickCitizenJob } from "./jobs/job.js";
import { CITIZEN_JOB_FOOD_MARKET } from "./jobs/jobFoodMarket.js";
import { calculateDistance, INVENTORY_MUSHROOM } from "./main.js";
import { mapPositionToPaintPosition } from "./paint.js";

export type CitizenStateInfo = {
    type: string,
    state?: string,
}

export type Citizen = {
    job: CitizenJob,
    birthTime: number,
    name: string,
    stateInfo: CitizenStateInfo,
    speed: number,
    position: Position,
    moveTo?: Position,
    foodPerCent: number,
    energyPerCent: number,
    inventory: InventoryStuff[],
    maxInventory: number,
    home?: House,
    money: number,
    skills: { [key: string]: number },
    lastCheckedNeedsTime?: number,
    log: CitizenLogEntry[];
    maxLogLength: number,
}

export type CitizenLogEntry = {
    time: number,
    message: string,
}

export const CITIZEN_STATE_TYPE_WORKING_JOB = "workingJob";

export function addCitizenLogEntry(citizen: Citizen, message: string, state: ChatSimState) {
    citizen.log.push({
        time: state.time,
        message: message,
    });
    if (citizen.log.length > citizen.maxLogLength) {
        citizen.log.shift();
    }
}

export function canCitizenCarryMore(citizen: Citizen): boolean {
    return getCitizenUsedInventoryCapacity(citizen) < citizen.maxInventory;
}

export function getCitizenUsedInventoryCapacity(citizen: Citizen): number {
    let counter = 0;
    for (let item of citizen.inventory) {
        counter += item.counter;
    }
    return counter;
}

export function tickCitizens(state: ChatSimState) {
    for (let citizen of state.map.citizens) {
        tickCitizen(citizen, state);
    }
    deleteCitizens(state);
}

export function paintCitizens(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    const paintDataMap = state.paintData.map;
    const citizenImage = state.images[IMAGE_PATH_CITIZEN];
    const citizenPaintSize = 40;
    ctx.font = "20px Arial";
    for (let citizen of state.map.citizens) {
        const paintPos = mapPositionToPaintPosition(citizen.position, paintDataMap);
        ctx.drawImage(citizenImage, 0, 0, 200, 200,
            paintPos.x - citizenPaintSize / 2,
            paintPos.y - citizenPaintSize / 2,
            citizenPaintSize, citizenPaintSize);

        const nameOffsetX = Math.floor(ctx.measureText(citizen.name).width / 2);
        const nameYSpacing = 5;
        paintSleeping(ctx, citizen, { x: paintPos.x, y: paintPos.y - citizenPaintSize / 2 - 10 }, state.time);
        drawTextWithOutline(ctx, citizen.name, paintPos.x - nameOffsetX, paintPos.y - citizenPaintSize / 2 - nameYSpacing);
    }
    if (state.inputData.selected) {
        if (state.inputData.selected.type === "citizen") {
            const citizen: Citizen = state.inputData.selected.object;
            const paintPos = mapPositionToPaintPosition(citizen.position, paintDataMap);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.rect(Math.floor(paintPos.x - citizenPaintSize / 2), Math.floor(paintPos.y - citizenPaintSize / 2), citizenPaintSize, citizenPaintSize);
            ctx.stroke();
        }
    }
}

function paintSleeping(ctx: CanvasRenderingContext2D, citizen: Citizen, paintPosition: Position, time: number) {
    if (citizen.stateInfo.type !== CITIZEN_NEED_SLEEP) return;
    if (citizen.stateInfo.state !== "sleeping") return;
    const timer = time / 300;
    const swingRadius = 10;
    const fontSize = 14;
    const offsetY = -fontSize * ((Math.sin(timer) + 1) / 2);
    ctx.font = `${fontSize}px Arial`;
    drawTextWithOutline(ctx, "z", paintPosition.x + Math.floor(Math.sin(timer) * swingRadius), paintPosition.y + offsetY);
    drawTextWithOutline(ctx, "Z", paintPosition.x + 5 + Math.floor(Math.sin(timer + 1) * swingRadius), paintPosition.y + offsetY - fontSize);
    drawTextWithOutline(ctx, "Z", paintPosition.x + 10 + Math.floor(Math.sin(timer + 2) * swingRadius), paintPosition.y + offsetY - fontSize * 2);
}

function tickCitizen(citizen: Citizen, state: ChatSimState) {
    citizen.foodPerCent -= 0.0002;
    citizen.energyPerCent -= 16 / state.timPerDay;
    tickCitizenNeeds(citizen, state);
    tickCitizenState(citizen, state);
    citizenMoveToTick(citizen);
}

function tickCitizenState(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.type === CITIZEN_STATE_TYPE_WORKING_JOB) {
        tickCitizenJob(citizen, state);
    }
}

function deleteCitizens(state: ChatSimState) {
    for (let i = state.map.citizens.length - 1; i >= 0; i--) {
        const starved = state.map.citizens[i].foodPerCent < 0;
        const outOfEngergy = state.map.citizens[i].energyPerCent < 0;
        if (starved || outOfEngergy) {
            let deceased = state.map.citizens.splice(i, 1)[0];
            if (starved) console.log(`${deceased.name} died by starving`, deceased);
            if (outOfEngergy) console.log(`${deceased.name} died by over working`, deceased);
            if (deceased.home) {
                if (deceased.home.owner === deceased && state.map.citizens.length > 0) {
                    const randomNewOwnerIndex = Math.floor(Math.random() * state.map.citizens.length);
                    const randomNewOwner = state.map.citizens[randomNewOwnerIndex];
                    deceased.home.owner = randomNewOwner;
                    if (!randomNewOwner.home) {
                        randomNewOwner.home = deceased.home;
                    }
                }
                if (deceased.home.inhabitedBy === deceased) {
                    deceased.home.inhabitedBy = undefined;
                }
            }
        }
    }
}

function citizenMoveToTick(citizen: Citizen) {
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

export function findClosestFoodMarket(searcher: Citizen, citizens: Citizen[], shouldHaveFood: boolean): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        const ivnentoryMushroom = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
        if (citizen.job && citizen.job.name === CITIZEN_JOB_FOOD_MARKET && citizen.moveTo === undefined && (!shouldHaveFood || (ivnentoryMushroom && ivnentoryMushroom.counter > 0))) {
            if (closest === undefined) {
                closest = citizen;
                distance = calculateDistance(citizen.position, searcher.position);
            } else {
                const tempDistance = calculateDistance(citizen.position, searcher.position);
                if (tempDistance < distance) {
                    closest = citizen;
                    distance = tempDistance;
                }
            }
        }
    }
    return closest;
}
