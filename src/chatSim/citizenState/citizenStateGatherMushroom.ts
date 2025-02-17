import { ChatSimState, Position } from "../chatSimModels.js";
import { citizenAddLogEntry, Citizen, citizenStateStackTaskSuccess, citizenMoveTo, isCitizenInInteractionDistance } from "../map/citizen.js";
import { nextRandom, SKILL_GATHERING } from "../main.js";
import { INVENTORY_MUSHROOM, InventoryItemMushroom } from "../inventory.js";
import { mapGetChunkForPosition } from "../map/map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { playChatSimSound, SOUND_PATH_PICKUP } from "../sounds.js";
import { MAP_OBJECT_MUSHROOM, Mushroom } from "../map/mapObjectMushroom.js";
import { mapDeleteTileObject } from "../map/mapObject.js";
import { FarmTile, farmTileDeleteGrowSlot, MAP_OBJECT_FARM_TILE } from "../map/mapObjectFarmTile.js";

type GatherData = {
    mushroomPosition: Position,
}

export const CITIZEN_STATE_GATHER_MUSHROOM = "GatherMushroom";

export function onLoadCitizenStateDefaultTickGatherMushroomsFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GATHER_MUSHROOM] = tickCitizenStateGatherMushroom;
}

export function setCitizenStateGatherMushroom(citizen: Citizen, mushroomPosition: Position) {
    const data: GatherData = { mushroomPosition: { x: mushroomPosition.x, y: mushroomPosition.y } };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GATHER_MUSHROOM, data: data, tags: new Set() });
}

function tickCitizenStateGatherMushroom(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    if (citizen.moveTo === undefined) {
        const data: GatherData = citizenState.data;
        if (isCitizenAtPosition(citizen, data.mushroomPosition)) {
            const mushroom = isCloseToMushroom(citizen, state);
            if (mushroom !== undefined) {
                pickUpMushroom(citizen, state, mushroom.mushroom, mushroom.isFarmMushroom);
            }
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizenMoveTo(citizen, data.mushroomPosition);
        }
    }
}

function pickUpMushroom(citizen: Citizen, state: ChatSimState, mushroom: Mushroom, farmMushroom: boolean) {
    if (!farmMushroom) {
        mapDeleteTileObject(mushroom, state.map);
    } else {
        farmTileDeleteGrowSlot(mushroom, state);
    }
    let inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM) as InventoryItemMushroom;
    if (inventoryMushroom === undefined) {
        inventoryMushroom = { name: INVENTORY_MUSHROOM, counter: 0, data: [] };
        citizen.inventory.items.push(inventoryMushroom);
    }
    inventoryMushroom.counter++;
    inventoryMushroom.data.push(mushroom.foodValue);
    citizenAddLogEntry(citizen, `picked up ${INVENTORY_MUSHROOM}. ${inventoryMushroom.counter} in inventory.`, state);
    playChatSimSound(SOUND_PATH_PICKUP, citizen.position, state);
    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (nextRandom(state.randomSeed) < skillGathering / 100) {
        inventoryMushroom.counter++;
        inventoryMushroom.data.push(mushroom.foodValue);
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}

function isCloseToMushroom(citizen: Citizen, state: ChatSimState): { mushroom: Mushroom, isFarmMushroom: boolean } | undefined {
    const chunk = mapGetChunkForPosition(citizen.position, state.map);
    if (!chunk) return undefined;
    const mushrooms = chunk.tileObjects.get(MAP_OBJECT_MUSHROOM) as Mushroom[];
    if (!mushrooms) return undefined;
    for (let mushroom of mushrooms) {
        if (isCitizenAtPosition(citizen, mushroom.position)) return { mushroom, isFarmMushroom: false };
    }
    const farmTiles = chunk.tileObjects.get(MAP_OBJECT_FARM_TILE) as FarmTile[];
    if (!farmTiles) return undefined;
    for (let farmTile of farmTiles) {
        if (isCitizenInInteractionDistance(citizen, farmTile.position)) {
            for (let mushroom of farmTile.growSlots as Mushroom[]) {
                if (mushroom === undefined) continue;
                if (isCitizenAtPosition(citizen, mushroom.position)) return { mushroom, isFarmMushroom: true };
            }
            break;
        }
    }
    return undefined;
}

