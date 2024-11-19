import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen, emptyCitizenInventoryToHomeInventory, getUsedInventoryCapacity, moveItemBetweenInventories } from "../citizen.js";
import { CitizenJob, createJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { INVENTORY_WOOD, calculateDistance, SKILL_GATHERING } from "../main.js";
import { removeTreeFromMap } from "../map.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { IMAGE_PATH_AXE } from "../../drawHelper.js";
import { Tree } from "../tree.js";

export type CitizenJobLuberjack = CitizenJob & {
    state: "decideNext" | "searchingTree" | "cutDownTree" | "cutTreeLogIntoPlanks" | "selling" | "goHome",
    actionEndTime?: number,
    tree?: Tree,
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
        state: "decideNext",
    }
}

function paintTool(ctx: CanvasRenderingContext2D, citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const axeSize = 20;
    ctx.save();
    if (citizen.moveTo === undefined && (job.state === "cutDownTree" || job.state === "cutTreeLogIntoPlanks")) {
        const rotation = (Math.sin(state.time / 100) + 1) / 2 * Math.PI / 2;
        ctx.translate(paintPos.x, paintPos.y);
        ctx.rotate(rotation)
        ctx.translate(-paintPos.x, -paintPos.y);
    }
    ctx.drawImage(state.images[IMAGE_PATH_AXE], 0, 0, 100, 100, paintPos.x, paintPos.y - 15, axeSize, axeSize);
    ctx.restore();
}

function tick(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (job.state === "decideNext") decideNext(citizen, job, state);
    if (job.state === "searchingTree") searchTree(citizen, job, state);
    if (job.state === "cutDownTree") cutDownTree(citizen, job, state);
    if (job.state === "cutTreeLogIntoPlanks") cutTreeLogIntoPlanks(citizen, job, state);

    if (job.state === "goHome") {
        if (citizen.moveTo === undefined) {
            emptyCitizenInventoryToHomeInventory(citizen, state);
            job.state = "decideNext";
        }
    }
    if (job.state === "selling") {
        let inventoryWood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
        if (!inventoryWood || inventoryWood.counter === 0) {
            job.state = "decideNext";
        } else {
            const woodMarket = findAWoodMarketWhichHasMoneyAndCapacity(citizen, state.map.citizens);
            if (woodMarket) {
                if (isCitizenInInteractDistance(citizen, woodMarket.position)) {
                    const woodPrice = 2;
                    sellItem(citizen, woodMarket, INVENTORY_WOOD, woodPrice, state);
                    job.state = "decideNext";
                } else {
                    citizen.moveTo = {
                        x: woodMarket.position.x,
                        y: woodMarket.position.y,
                    }
                }
            } else {
                addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_WOOD_MARKET} as their is no wood market to sell to`, state);
                citizen.job = createJob(CITIZEN_JOB_WOOD_MARKET, state);
            }
        }
    }
}

function cutDownTree(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        if (!job.tree) {
            job.state = "decideNext";
            return;
        }
        if (!isCitizenInInteractDistance(citizen, job.tree.position)) {
            job.state = "decideNext";
            return;
        }
        if (job.tree.trunkDamagePerCent < 1) {
            const progressPerTick = 1 / 60 / 3;
            job.tree.trunkDamagePerCent += progressPerTick;
            if (job.tree.trunkDamagePerCent >= 1) {
                job.tree.fallTime = state.time;
            }
        } else {
            job.state = "cutTreeLogIntoPlanks";
            job.actionEndTime = undefined;
        }
    }
}

function cutTreeLogIntoPlanks(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (!job.tree || job.tree.woodValue === 0
        || !isCitizenInInteractDistance(citizen, job.tree.position)
    ) {
        job.state = "decideNext";
        return;
    }
    const cutDuration = 1000;
    if (job.actionEndTime === undefined) job.actionEndTime = state.time + cutDuration;
    if (job.actionEndTime < state.time) {
        job.actionEndTime = state.time + cutDuration;
        const inventoryWood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
        if (canCitizenCarryMore(citizen) && (!inventoryWood || inventoryWood.counter < 5)) {
            cutTreeForWood(citizen, job.tree, state);
        } else {
            job.state = "decideNext";
        }
    }

}

function searchTree(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (job.actionEndTime !== undefined && job.actionEndTime < state.time) {
        if (state.map.trees.length > 0) {
            const treeIndex = Math.floor(Math.random() * state.map.trees.length);
            const tree = state.map.trees[treeIndex];
            citizen.moveTo = {
                x: tree.position.x,
                y: tree.position.y,
            };
            job.tree = tree;
            job.state = "cutDownTree";
        }
    }
}

function decideNext(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    const inventoryWood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
    if (canCitizenCarryMore(citizen) && (!inventoryWood || inventoryWood.counter < 5)) {
        const lookingForTreeDuration = 1000;
        job.state = "searchingTree";
        job.actionEndTime = state.time + lookingForTreeDuration;
    } else {
        if (citizen.home && getUsedInventoryCapacity(citizen.home.inventory) < citizen.home.maxInventory - 15) {
            job.state = "goHome";
            citizen.moveTo = {
                x: citizen.home.position.x,
                y: citizen.home.position.y,
            }
            addCitizenLogEntry(citizen, `go home to store stuff to free inventory space`, state);
        } else {
            if (inventoryWood && inventoryWood.counter > 0) job.state = "selling";
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
    let inventoryWood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
    if (inventoryWood === undefined) {
        inventoryWood = { name: INVENTORY_WOOD, counter: 0 };
        citizen.inventory.push(inventoryWood);
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

function isCloseToTree(citizen: Citizen, state: ChatSimState): number | undefined {
    for (let i = state.map.trees.length - 1; i >= 0; i--) {
        const tree = state.map.trees[i];
        const distance = calculateDistance(tree.position, citizen.position);
        if (distance < 10) return i;
    }
    return undefined;
}
