import { ChatSimState, Position } from "../chatSimModels.js";
import { citizenAddLogEntry, Citizen, citizenStateStackTaskSuccess, citizenMoveTo, TAG_PHYSICALLY_ACTIVE, CITIZEN_INTERACTION_DISTANCE } from "../citizen.js";
import { inventoryGetAvailableCapacity } from "../inventory.js";
import { nextRandom, SKILL_GATHERING } from "../main.js";
import { INVENTORY_WOOD } from "../inventory.js";
import { mapGetChunkForPosition, mapGetChunksInDistance } from "../map/map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { MAP_OBJECT_TREE, Tree } from "../map/mapObjectTree.js";
import { isCitizenInInteractionDistance } from "../citizen.js";
import { citizenGetEquipmentData, citizenSetEquipment } from "../paintCitizenEquipment.js";
import { playChatSimSound, SOUND_PATH_CUT, SOUND_PATH_TREE_FALL } from "../sounds.js";
import { mapDeleteTileObject } from "../map/mapObject.js";

export const CITIZEN_STATE_GATHER_WOOD = "GatherWood";
type Data = {
    treePosition: Position,
    actionStartTime?: number,
    soundPlayedTime?: number,
    amount?: number,
}

export function onLoadCitizenStateDefaultTickGatherWoodFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GATHER_WOOD] = tickCititzenStateGatherWood;
}

export function setCitizenStateGatherWood(citizen: Citizen, treePosition: Position, amount?: number) {
    const data: Data = { treePosition, amount };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GATHER_WOOD, data: data, tags: new Set() });
    citizenSetEquipment(citizen, ["Axe", "WoodPlanks"]);
}

export function tickCititzenStateGatherWood(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];

    if (citizen.moveTo === undefined) {
        const data: Data = citizenState.data;
        if (isCitizenInInteractionDistance(citizen, data.treePosition)) {
            const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
            const axe = citizenGetEquipmentData(citizen, "Axe");
            const canCarryMore = inventoryGetAvailableCapacity(citizen.inventory, INVENTORY_WOOD) > 0;
            const reachedLimit = !canCarryMore || (inventoryWood && data.amount !== undefined && inventoryWood.counter >= data.amount);
            if (reachedLimit) {
                axe!.data = undefined;
                citizenStateStackTaskSuccess(citizen);
                return;
            }
            const tree = isCloseToTree(citizen, state);
            if (tree) {
                citizenState.tags.add(TAG_PHYSICALLY_ACTIVE);
                const divider = 100 * Math.PI * 2;
                const animationPerCent = (state.time / divider) % 1;
                const animationDuration1Tick = state.tickInterval / divider;
                if (animationPerCent < animationDuration1Tick) {
                    playChatSimSound(SOUND_PATH_CUT, citizen.position, state);
                }
                axe!.data = true;
                const isCutDown = cutDownTree(citizen, tree, state);
                if (isCutDown) cutTreeLogIntoPlanks(citizen, tree, citizenState.data, state);
            } else {
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        } else {
            const randomDirection = nextRandom(state.randomSeed) * Math.PI * 2;
            const randomCloseToTreePosition = {
                x: data.treePosition.x + Math.sin(randomDirection) * 10,
                y: data.treePosition.y + Math.cos(randomDirection) * 10,
            };
            citizenMoveTo(citizen, randomCloseToTreePosition);
        }
    }
}

function cutDownTree(citizen: Citizen, tree: Tree, state: ChatSimState): boolean {
    if (!isCitizenInInteractionDistance(citizen, tree.position)) {
        return false;
    }
    if (tree.trunkDamagePerCent < 1) {
        const progressPerTick = 1 / 60 / 3;
        tree.trunkDamagePerCent += progressPerTick;
        if (tree.trunkDamagePerCent >= 1) {
            tree.fallTime = state.time;
            playChatSimSound(SOUND_PATH_TREE_FALL, tree.position, state);
        }
        return false;
    }
    return true;
}

function cutTreeLogIntoPlanks(citizen: Citizen, tree: Tree, data: Data, state: ChatSimState) {
    if (tree.woodValue === 0
        || !isCitizenInInteractionDistance(citizen, tree.position)
    ) {
        return;
    }
    const cutDuration = 1000;
    if (data.actionStartTime === undefined) data.actionStartTime = state.time;
    if (data.actionStartTime + cutDuration < state.time) {
        data.actionStartTime = state.time;
        if (inventoryGetAvailableCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
            cutTreeForWood(citizen, tree, state);
        }
    }
}

function isCloseToTree(citizen: Citizen, state: ChatSimState): Tree | undefined {
    const chunks = mapGetChunksInDistance(citizen.position, state.map, CITIZEN_INTERACTION_DISTANCE);
    for (let chunk of chunks) {
        const trees = chunk.tileObjects.get(MAP_OBJECT_TREE) as Tree[];
        if (!trees) continue;
        for (let tree of trees) {
            if (isCitizenInInteractionDistance(citizen, tree.position)) {
                return tree;
            }
        }
    }
    return undefined;
}

function cutTreeForWood(citizen: Citizen, tree: Tree, state: ChatSimState) {
    let inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
    if (inventoryWood === undefined) {
        inventoryWood = { name: INVENTORY_WOOD, counter: 0 };
        citizen.inventory.items.push(inventoryWood);
    }
    tree.woodValue--;
    inventoryWood.counter++;
    citizenAddLogEntry(citizen, `cut tree for 1x${INVENTORY_WOOD}, in inventory: ${inventoryWood.counter}x${INVENTORY_WOOD}`, state);
    if (tree.woodValue === 0) mapDeleteTileObject(tree, state.map);

    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (nextRandom(state.randomSeed) < skillGathering / 100) {
        inventoryWood.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}
