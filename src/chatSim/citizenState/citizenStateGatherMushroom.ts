import { ChatSimState, Mushroom } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, citizenStateStackTaskSuccess } from "../citizen.js";
import { inventoryGetAvaiableCapacity } from "../inventory.js";
import { calculateDistance, nextRandom, SKILL_GATHERING } from "../main.js";
import { INVENTORY_MUSHROOM } from "../inventory.js";
import { mapGetChunkForPosition, mapIsPositionOutOfBounds, removeMushroomFromMap } from "../map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { citizenSetEquipment } from "../paintCitizenEquipment.js";
import { playChatSimSound, SOUND_PATH_PICKUP } from "../sounds.js";

type GatherData = {
    amount?: number,
    lastSearchDirection?: number,
}

export const CITIZEN_STATE_GATHER_MUSHROOM = "GatherMushroom";

export function onLoadCitizenStateDefaultTickGatherMushroomsFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GATHER_MUSHROOM] = tickCititzenStateGatherMushroom;
}

export function setCitizenStateGatherMushroom(citizen: Citizen, amount: number | undefined = undefined) {
    const data: GatherData = { amount: amount };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GATHER_MUSHROOM, data: data });
    citizenSetEquipment(citizen, ["Basket"]);
}

export function tickCititzenStateGatherMushroom(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];

    if (citizen.moveTo === undefined) {
        const mushroom = isCloseToMushroom(citizen, state);
        if (mushroom !== undefined) {
            pickUpMushroom(citizen, state, mushroom);
        } else {
            moveToMushroom(citizen, state);
        }
        const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        if (inventoryMushroom) {
            const available = inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_MUSHROOM);
            const limit = inventoryMushroom.counter + available;
            let amount: number = limit;
            if (citizenState.data !== undefined) {
                const data = citizenState.data as GatherData;
                if (data.amount !== undefined) amount = Math.min(data.amount, limit);
            }
            if (inventoryMushroom.counter >= amount) {
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        }
    }
}

function pickUpMushroom(citizen: Citizen, state: ChatSimState, mushroom: Mushroom) {
    removeMushroomFromMap(mushroom, state.map);
    let inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    if (inventoryMushroom === undefined) {
        inventoryMushroom = { name: INVENTORY_MUSHROOM, counter: 0 };
        citizen.inventory.items.push(inventoryMushroom);
    }
    inventoryMushroom.counter++;
    addCitizenLogEntry(citizen, `picked up ${INVENTORY_MUSHROOM}. ${inventoryMushroom.counter} in inventory.`, state);
    playChatSimSound(SOUND_PATH_PICKUP, citizen.position, state);
    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (nextRandom(state.randomSeed) < skillGathering / 100) {
        inventoryMushroom.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}

function citizenGetVisionDistance(citizen: Citizen, state: ChatSimState): number {
    return 180;
}

function getClosestMushroomInVisionDistance(citizen: Citizen, state: ChatSimState): Mushroom | undefined {
    const visionDistance = citizenGetVisionDistance(citizen, state);
    let closest: Mushroom | undefined = undefined;
    let closestDistance: number = 0;
    const chunkKeys = Object.keys(state.map.mapChunks);
    for (let chunkKey of chunkKeys) {
        const chunk = state.map.mapChunks[chunkKey];
        for (let mushroom of chunk.mushrooms) {
            const distance = calculateDistance(citizen.position, mushroom.position);
            if (distance < visionDistance) {
                if (closest === undefined || distance < closestDistance) {
                    closest = mushroom;
                    closestDistance = distance;
                }
            }
        }
    }
    return closest;
}

function moveToMushroom(citizen: Citizen, state: ChatSimState) {
    const mushroom = getClosestMushroomInVisionDistance(citizen, state);
    if (mushroom) {
        citizen.moveTo = {
            x: mushroom.position.x,
            y: mushroom.position.y,
        }
        addCitizenLogEntry(citizen, `I See a ${INVENTORY_MUSHROOM} at x:${citizen.moveTo.x}, y:${citizen.moveTo.y}`, state);
    } else {
        const data = citizen.stateInfo.stack[0].data as GatherData;
        let newSearchDirection;
        if (data.lastSearchDirection === undefined) {
            newSearchDirection = nextRandom(state.randomSeed) * Math.PI * 2;
        } else {
            newSearchDirection = data.lastSearchDirection + nextRandom(state.randomSeed) * Math.PI / 2 - Math.PI / 4;
        }
        const randomTurnIfOutOfBound = nextRandom(state.randomSeed) < 0.2 ? 0.3 : -0.3;
        const walkDistance = citizenGetVisionDistance(citizen, state) * 0.75;
        while (true) {
            const newMoveTo = {
                x: citizen.position.x + Math.cos(newSearchDirection) * walkDistance,
                y: citizen.position.y + Math.sin(newSearchDirection) * walkDistance,
            }
            if (mapIsPositionOutOfBounds(newMoveTo, state.map)) {
                newSearchDirection += randomTurnIfOutOfBound;
            } else {
                citizen.moveTo = newMoveTo;
                data.lastSearchDirection = newSearchDirection;
                return;
            }
        }
    }
}

function isCloseToMushroom(citizen: Citizen, state: ChatSimState): Mushroom | undefined {
    const chunk = mapGetChunkForPosition(citizen.position, state.map);
    if (!chunk) return undefined;
    for (let i = chunk.mushrooms.length - 1; i >= 0; i--) {
        const mushroom = chunk.mushrooms[i];
        if (isCitizenAtPosition(citizen, mushroom.position)) return mushroom;
    }
    return undefined;
}

