import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen, emptyCitizenInventoryToHomeInventory, getAvaiableInventoryCapacity } from "../citizen.js";
import { citizenChangeJob, CitizenJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { INVENTORY_WOOD, calculateDistance, SKILL_GATHERING } from "../main.js";
import { removeTreeFromMap } from "../map.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { IMAGE_PATH_AXE } from "../../drawHelper.js";
import { Tree } from "../tree.js";

export type CitizenJobLuberjack = CitizenJob & {
    actionEndTime?: number,
    tree?: Tree,
}

type JobLumberjackStateInfo = {
    type: string,
    state?: "searchingTree" | "cutDownTree" | "cutTreeLogIntoPlanks" | "selling" | "goHome",
}

export const CITIZEN_JOB_LUMBERJACK = "Lumberjack";
const CUT_INTERVAL = 500;

export function loadCitizenJobLumberjack(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_LUMBERJACK] = {
        create: create,
        tick: tick,
        paintTool: paintTool,
    };
}

function create(state: ChatSimState): CitizenJobLuberjack {
    return {
        name: CITIZEN_JOB_LUMBERJACK,
    }
}

function paintTool(ctx: CanvasRenderingContext2D, citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const stateInfo = citizen.stateInfo as JobLumberjackStateInfo;
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const axeSize = 20;
    ctx.save();
    if (citizen.moveTo === undefined && (stateInfo.state === "cutDownTree" || stateInfo.state === "cutTreeLogIntoPlanks")) {
        const rotation = (Math.sin(state.time / 100) + 1) / 2 * Math.PI / 2;
        ctx.translate(paintPos.x, paintPos.y);
        ctx.rotate(rotation)
        ctx.translate(-paintPos.x, -paintPos.y);
    }
    ctx.drawImage(state.images[IMAGE_PATH_AXE], 0, 0, 100, 100, paintPos.x, paintPos.y - 15, axeSize, axeSize);
    ctx.restore();
}

function tick(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    const stateInfo = citizen.stateInfo as JobLumberjackStateInfo;
    if (stateInfo.state === undefined) decideNext(citizen, job, state);
    if (stateInfo.state === "searchingTree") searchTree(citizen, job, state);
    if (stateInfo.state === "cutDownTree") cutDownTree(citizen, job, state);
    if (stateInfo.state === "cutTreeLogIntoPlanks") cutTreeLogIntoPlanks(citizen, job, state);

    if (stateInfo.state === "goHome") {
        if (citizen.moveTo === undefined) {
            emptyCitizenInventoryToHomeInventory(citizen, state);
            stateInfo.state = undefined;
        }
    }
    if (stateInfo.state === "selling") {
        let inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
        if (!inventoryWood || inventoryWood.counter === 0) {
            stateInfo.state = undefined;
        } else {
            const woodMarket = findAWoodMarketWhichHasMoneyAndCapacity(citizen, state.map.citizens);
            if (woodMarket) {
                if (isCitizenInInteractDistance(citizen, woodMarket.position)) {
                    const woodPrice = 2;
                    sellItem(citizen, woodMarket, INVENTORY_WOOD, woodPrice, state);
                    stateInfo.state = undefined;
                } else {
                    citizen.moveTo = {
                        x: woodMarket.position.x,
                        y: woodMarket.position.y,
                    }
                }
            } else {
                const reason = [
                    `I can not carry more ${INVENTORY_WOOD}.`,
                    `There is no ${CITIZEN_JOB_WOOD_MARKET} to sell to.`,
                    `I become a ${CITIZEN_JOB_WOOD_MARKET} myself,`,
                    `so i can sell my ${INVENTORY_WOOD}.`
                ];
                citizenChangeJob(citizen, CITIZEN_JOB_WOOD_MARKET, state, reason);
            }
        }
    }
}

function cutDownTree(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const stateInfo = citizen.stateInfo as JobLumberjackStateInfo;
        if (!job.tree) {
            stateInfo.state = undefined;
            return;
        }
        if (!isCitizenInInteractDistance(citizen, job.tree.position)) {
            stateInfo.state = undefined;
            return;
        }
        if (job.tree.trunkDamagePerCent < 1) {
            const progressPerTick = 1 / 60 / 3;
            job.tree.trunkDamagePerCent += progressPerTick;
            if (job.tree.trunkDamagePerCent >= 1) {
                job.tree.fallTime = state.time;
            }
        } else {
            stateInfo.state = "cutTreeLogIntoPlanks";
            job.actionEndTime = undefined;
        }
    }
}

function cutTreeLogIntoPlanks(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    const stateInfo = citizen.stateInfo as JobLumberjackStateInfo;
    if (!job.tree || job.tree.woodValue === 0
        || !isCitizenInInteractDistance(citizen, job.tree.position)
    ) {
        stateInfo.state = undefined;
        return;
    }
    const cutDuration = 1000;
    if (job.actionEndTime === undefined) job.actionEndTime = state.time + cutDuration;
    if (job.actionEndTime < state.time) {
        job.actionEndTime = state.time + cutDuration;
        const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
        if (getAvaiableInventoryCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
            cutTreeForWood(citizen, job.tree, state);
        } else {
            stateInfo.state = undefined;
        }
    }

}

function searchTree(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (job.actionEndTime !== undefined && job.actionEndTime < state.time) {
        const stateInfo = citizen.stateInfo as JobLumberjackStateInfo;
        if (state.map.trees.length > 0) {
            stateInfo
            const treeIndex = Math.floor(Math.random() * state.map.trees.length);
            const tree = state.map.trees[treeIndex];
            citizen.moveTo = {
                x: tree.position.x,
                y: tree.position.y,
            };
            job.tree = tree;
            stateInfo.state = "cutDownTree";
        }
    }
}

function decideNext(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
    const stateInfo = citizen.stateInfo as JobLumberjackStateInfo;
    if (getAvaiableInventoryCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
        const lookingForTreeDuration = 1000;
        stateInfo.state = "searchingTree";
        job.actionEndTime = state.time + lookingForTreeDuration;
    } else {
        if (citizen.home && getAvaiableInventoryCapacity(citizen.home.inventory, INVENTORY_WOOD) > 5) {
            stateInfo.state = "goHome";
            citizen.moveTo = {
                x: citizen.home.position.x,
                y: citizen.home.position.y,
            }
            addCitizenLogEntry(citizen, `go home to store stuff to free inventory space`, state);
        } else {
            if (inventoryWood && inventoryWood.counter > 0) stateInfo.state = "selling";
        }
    }
}

function findAWoodMarketWhichHasMoneyAndCapacity(searcher: Citizen, citizens: Citizen[]): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen.job && citizen.job.name === CITIZEN_JOB_WOOD_MARKET && citizen.money > 2 && canCitizenCarryMore(citizen)) {
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
    if (Math.random() < skillGathering / 100) {
        inventoryWood.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}
