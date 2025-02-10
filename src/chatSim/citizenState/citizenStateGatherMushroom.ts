import { ChatSimState, Position } from "../chatSimModels.js";
import { citizenAddLogEntry, Citizen, citizenStateStackTaskSuccess, citizenMoveTo } from "../map/citizen.js";
import { nextRandom, SKILL_GATHERING } from "../main.js";
import { INVENTORY_MUSHROOM } from "../inventory.js";
import { mapGetChunkForPosition } from "../map/map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { playChatSimSound, SOUND_PATH_PICKUP } from "../sounds.js";
import { MAP_OBJECT_MUSHROOM, Mushroom } from "../map/mapObjectMushroom.js";
import { mapDeleteTileObject } from "../map/mapObject.js";

type GatherData = {
    mushroomPosition: Position,
}

export const CITIZEN_STATE_GATHER_MUSHROOM = "GatherMushroom";

export function onLoadCitizenStateDefaultTickGatherMushroomsFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GATHER_MUSHROOM] = tickCititzenStateGatherMushroom;
}

export function setCitizenStateGatherMushroom(citizen: Citizen, mushroomPosition: Position) {
    const data: GatherData = { mushroomPosition: { x: mushroomPosition.x, y: mushroomPosition.y } };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GATHER_MUSHROOM, data: data, tags: new Set() });
}

function tickCititzenStateGatherMushroom(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    if (citizen.moveTo === undefined) {
        const data: GatherData = citizenState.data;
        if (isCitizenAtPosition(citizen, data.mushroomPosition)) {
            const mushroom = isCloseToMushroom(citizen, state);
            if (mushroom !== undefined) {
                pickUpMushroom(citizen, state, mushroom);
            }
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizenMoveTo(citizen, data.mushroomPosition);
        }
    }
}

function pickUpMushroom(citizen: Citizen, state: ChatSimState, mushroom: Mushroom) {
    mapDeleteTileObject(mushroom, state.map);
    let inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    if (inventoryMushroom === undefined) {
        inventoryMushroom = { name: INVENTORY_MUSHROOM, counter: 0 };
        citizen.inventory.items.push(inventoryMushroom);
    }
    inventoryMushroom.counter++;
    citizenAddLogEntry(citizen, `picked up ${INVENTORY_MUSHROOM}. ${inventoryMushroom.counter} in inventory.`, state);
    playChatSimSound(SOUND_PATH_PICKUP, citizen.position, state);
    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (nextRandom(state.randomSeed) < skillGathering / 100) {
        inventoryMushroom.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}

function isCloseToMushroom(citizen: Citizen, state: ChatSimState): Mushroom | undefined {
    const chunk = mapGetChunkForPosition(citizen.position, state.map);
    if (!chunk) return undefined;
    const mushrooms = chunk.tileObjects.get(MAP_OBJECT_MUSHROOM) as Mushroom[];
    if (!mushrooms) return undefined;
    for (let mushroom of mushrooms) {
        if (isCitizenAtPosition(citizen, mushroom.position)) return mushroom;
    }
    return undefined;
}

