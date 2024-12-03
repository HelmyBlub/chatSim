import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, citizenStateStackTaskSuccess } from "../citizen.js";
import { inventoryGetAvaiableCapacity } from "../inventory.js";
import { INVENTORY_WOOD, nextRandom, SKILL_GATHERING } from "../main.js";
import { removeTreeFromMap } from "../map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { Tree } from "../tree.js";
import { isCitizenInInteractionDistance } from "../jobs/job.js";
import { citizenGetEquipmentData, citizenSetEquipment } from "../paintCitizenEquipment.js";
import { playChatSimSound, SOUND_PATH_CUT } from "../sounds.js";

export const CITIZEN_STATE_GATHER_WOOD = "GatherWood";
type Data = {
    actionStartTime?: number,
    soundPlayedTime?: number,
    amount?: number,
}

export function onLoadCitizenStateDefaultTickGatherWoodFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GATHER_WOOD] = tickCititzenStateGatherWood;
}

export function setCitizenStateGatherWood(citizen: Citizen, amount: number | undefined = undefined) {
    const data: Data = { amount: amount };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GATHER_WOOD, data: data });
    citizenSetEquipment(citizen, ["Axe", "WoodPlanks"]);
}

export function tickCititzenStateGatherWood(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];

    if (citizen.moveTo === undefined) {
        const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
        const axe = citizenGetEquipmentData(citizen, "Axe");
        const data: Data = citizenState.data;
        if (inventoryWood) {
            const available = inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_WOOD);
            const limit = inventoryWood.counter + available;
            let amount: number = limit;
            if (data.amount !== undefined) {
                amount = Math.min(data.amount, limit);
            }
            if (inventoryWood.counter >= amount) {
                axe!.data = undefined;
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        }
        const tree = isCloseToTree(citizen, state);
        if (tree) {
            if (data.soundPlayedTime === undefined) {
                data.soundPlayedTime = state.time;
                playChatSimSound(SOUND_PATH_CUT, citizen.position, state);
            }
            axe!.data = true;
            const isCutDown = cutDownTree(citizen, tree, state);
            if (isCutDown) cutTreeLogIntoPlanks(citizen, tree, citizenState.data, state);
        } else {
            axe!.data = false;
            moveToTree(citizen, state);
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
        if (inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
            cutTreeForWood(citizen, tree, state);
        }
    }
}

function moveToTree(citizen: Citizen, state: ChatSimState) {
    if (state.map.trees.length > 0) {
        const treeIndex = Math.floor(nextRandom(state.randomSeed) * state.map.trees.length);
        const tree = state.map.trees[treeIndex];
        const randomDirection = nextRandom(state.randomSeed) * Math.PI * 2;
        citizen.moveTo = {
            x: tree.position.x + Math.sin(randomDirection) * 10,
            y: tree.position.y + Math.cos(randomDirection) * 10,
        };
    }
}

function isCloseToTree(citizen: Citizen, state: ChatSimState): Tree | undefined {
    for (let i = state.map.trees.length - 1; i >= 0; i--) {
        const tree = state.map.trees[i];
        if (isCitizenInInteractionDistance(citizen, tree.position)) return tree;
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
    addCitizenLogEntry(citizen, `cut tree for 1x${INVENTORY_WOOD}, in inventory: ${inventoryWood.counter}x${INVENTORY_WOOD}`, state);
    if (tree.woodValue === 0) removeTreeFromMap(tree, state.map);

    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (nextRandom(state.randomSeed) < skillGathering / 100) {
        inventoryWood.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}
