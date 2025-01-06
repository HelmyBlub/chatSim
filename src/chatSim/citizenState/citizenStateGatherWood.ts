import { ChatSimState } from "../chatSimModels.js";
import { citizenAddLogEntry, Citizen, citizenCheckTodoList, citizenGetVisionDistance, citizenStateStackTaskSuccess, citizenMoveTo } from "../citizen.js";
import { inventoryGetAvaiableCapacity } from "../inventory.js";
import { calculateDistance, nextRandom, SKILL_GATHERING } from "../main.js";
import { INVENTORY_WOOD } from "../inventory.js";
import { mapGetChunkForPosition, mapGetChunksInDistance, mapIsPositionOutOfBounds, removeTreeFromMap } from "../map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { Tree } from "../tree.js";
import { isCitizenInInteractionDistance } from "../jobs/job.js";
import { citizenGetEquipmentData, citizenSetEquipment } from "../paintCitizenEquipment.js";
import { playChatSimSound, SOUND_PATH_CUT, SOUND_PATH_TREE_FALL } from "../sounds.js";

export const CITIZEN_STATE_GATHER_WOOD = "GatherWood";
type Data = {
    actionStartTime?: number,
    soundPlayedTime?: number,
    amount?: number,
    lastSearchDirection?: number,
}

export function onLoadCitizenStateDefaultTickGatherWoodFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GATHER_WOOD] = tickCititzenStateGatherWood;
}

export function setCitizenStateGatherWood(citizen: Citizen, amount: number | undefined = undefined) {
    const data: Data = { amount: amount };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GATHER_WOOD, data: data, tags: [] });
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
        if (inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
            cutTreeForWood(citizen, tree, state);
        }
    }
}

function moveToTree(citizen: Citizen, state: ChatSimState) {
    const tree = findClosestTree(citizen, state);
    if (tree) {
        const randomDirection = nextRandom(state.randomSeed) * Math.PI * 2;
        const randomCloseToTreePosition = {
            x: tree.position.x + Math.sin(randomDirection) * 10,
            y: tree.position.y + Math.cos(randomDirection) * 10,
        };
        citizenMoveTo(citizen, randomCloseToTreePosition);
        citizenAddLogEntry(citizen, `I see a tree at x:${tree.position.x.toFixed()}, y:${tree.position.y.toFixed()}`, state);
    } else {
        if (citizenCheckTodoList(citizen, state, 2)) return;
        const data = citizen.stateInfo.stack[0].data as Data;
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
                citizenMoveTo(citizen, newMoveTo);
                data.lastSearchDirection = newSearchDirection;
                return;
            }
        }
    }
}

function findClosestTree(citizen: Citizen, state: ChatSimState): Tree | undefined {
    let closestTree: Tree | undefined = undefined;
    let closestDistance = 0;
    const chunks = mapGetChunksInDistance(citizen.position, state.map, 200);
    for (let chunk of chunks) {
        for (let i = chunk.trees.length - 1; i >= 0; i--) {
            const tree = chunk.trees[i];
            const distance = calculateDistance(citizen.position, tree.position);
            if (!closestTree || distance < closestDistance) {
                closestDistance = distance;
                closestTree = tree;
            }
        }
    }
    return closestTree;
}

function isCloseToTree(citizen: Citizen, state: ChatSimState): Tree | undefined {
    const chunk = mapGetChunkForPosition(citizen.position, state.map);
    if (!chunk) return undefined;
    for (let i = chunk.trees.length - 1; i >= 0; i--) {
        const tree = chunk.trees[i];
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
    citizenAddLogEntry(citizen, `cut tree for 1x${INVENTORY_WOOD}, in inventory: ${inventoryWood.counter}x${INVENTORY_WOOD}`, state);
    if (tree.woodValue === 0) removeTreeFromMap(tree, state.map);

    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (nextRandom(state.randomSeed) < skillGathering / 100) {
        inventoryWood.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}
