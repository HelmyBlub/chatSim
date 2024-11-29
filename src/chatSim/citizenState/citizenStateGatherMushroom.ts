import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, citizenStateStackTaskSuccess } from "../citizen.js";
import { inventoryGetAvaiableCapacity } from "../inventory.js";
import { INVENTORY_MUSHROOM, nextRandom, SKILL_GATHERING } from "../main.js";
import { removeMushroomFromMap } from "../map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { isCitizenAtPosition } from "../jobs/job.js";

export const CITIZEN_STATE_GATHER_MUSHROOM = "GatherMushroom";

export function onLoadCitizenStateDefaultTickGatherMushroomsFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GATHER_MUSHROOM] = tickCititzenStateGatherMushroom;
}

export function setCitizenStateGatherMushroom(citizen: Citizen, amount: number | undefined = undefined) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GATHER_MUSHROOM, data: amount });
    citizen.displayedTool = { name: "Basket" };
}

export function tickCititzenStateGatherMushroom(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];

    if (citizen.moveTo === undefined) {
        const mushroomIndex = isCloseToMushroom(citizen, state);
        if (mushroomIndex !== undefined) {
            pickUpMushroom(citizen, state, mushroomIndex);
        } else {
            moveToMushroom(citizen, state);
        }
        const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        if (inventoryMushroom) {
            const available = inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_MUSHROOM);
            const limit = inventoryMushroom.counter + available;
            let amount: number = limit;
            if (citizenState.data !== undefined) {
                amount = Math.min(citizenState.data, limit);
            }
            if (inventoryMushroom.counter >= amount) {
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        }
    }
}

function pickUpMushroom(citizen: Citizen, state: ChatSimState, mushroomIndex: number) {
    removeMushroomFromMap(state.map.mushrooms[mushroomIndex], state.map);
    let inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    if (inventoryMushroom === undefined) {
        inventoryMushroom = { name: INVENTORY_MUSHROOM, counter: 0 };
        citizen.inventory.items.push(inventoryMushroom);
    }
    inventoryMushroom.counter++;
    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (nextRandom(state.randomSeed) < skillGathering / 100) {
        inventoryMushroom.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}

function moveToMushroom(citizen: Citizen, state: ChatSimState) {
    if (state.map.mushrooms.length > 0) {
        const mushroomIndex = Math.floor(nextRandom(state.randomSeed) * state.map.mushrooms.length);
        citizen.moveTo = {
            x: state.map.mushrooms[mushroomIndex].position.x,
            y: state.map.mushrooms[mushroomIndex].position.y,
        }
        addCitizenLogEntry(citizen, `move to ${INVENTORY_MUSHROOM} at x:${citizen.moveTo.x}, y:${citizen.moveTo.y}`, state);
    }
}

function isCloseToMushroom(citizen: Citizen, state: ChatSimState): number | undefined {
    for (let i = state.map.mushrooms.length - 1; i >= 0; i--) {
        const mushroom = state.map.mushrooms[i];
        if (isCitizenAtPosition(citizen, mushroom.position)) return i;
    }
    return undefined;
}
