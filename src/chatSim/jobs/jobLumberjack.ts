import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen, CitizenStateInfo, isCitizenThinking, setCitizenThought } from "../citizen.js";
import { citizenChangeJob, CitizenJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { INVENTORY_WOOD, calculateDistance, SKILL_GATHERING } from "../main.js";
import { removeTreeFromMap } from "../map.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { IMAGE_PATH_AXE } from "../../drawHelper.js";
import { Tree } from "../tree.js";
import { inventoryEmptyCitizenToHomeInventory, inventoryGetAvaiableCapacity } from "../inventory.js";

export type CitizenJobLuberjack = CitizenJob & {
    actionEndTime?: number,
    tree?: Tree,
    sellToWoodMarket?: Citizen,
}

type JobLumberjackStateInfo = {
    state: "searchingTree" | "cutDownTree" | "cutTreeLogIntoPlanks" | "selling" | "goHome" | "sellToWoodMarket",
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
    const stateInfo = citizen.stateInfo.stack.length > 0 ? citizen.stateInfo.stack[0] : undefined;
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const axeSize = 20;
    ctx.save();
    if (citizen.moveTo === undefined && (stateInfo && (stateInfo.state === "cutDownTree" || stateInfo.state === "cutTreeLogIntoPlanks"))) {
        const rotation = (Math.sin(state.time / 100) + 1) / 2 * Math.PI / 2;
        ctx.translate(paintPos.x, paintPos.y);
        ctx.rotate(rotation)
        ctx.translate(-paintPos.x, -paintPos.y);
    }
    ctx.drawImage(state.images[IMAGE_PATH_AXE], 0, 0, 100, 100, paintPos.x, paintPos.y - 15, axeSize, axeSize);
    ctx.restore();
}

function tick(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) decideNext(citizen, job, state);
    if (citizen.stateInfo.stack.length === 0) return;
    const stateInfo = citizen.stateInfo.stack[0] as JobLumberjackStateInfo;
    if (stateInfo.state === "searchingTree") searchTree(citizen, job, state);
    if (stateInfo.state === "cutDownTree") cutDownTree(citizen, job, state);
    if (stateInfo.state === "cutTreeLogIntoPlanks") cutTreeLogIntoPlanks(citizen, job, state);

    if (stateInfo.state === "goHome") {
        if (citizen.moveTo === undefined) {
            inventoryEmptyCitizenToHomeInventory(citizen, state);
            citizen.stateInfo.stack.shift();
        }
    }
    if (stateInfo.state === "selling" && !isCitizenThinking(citizen, state)) {
        let inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
        if (!inventoryWood || inventoryWood.counter === 0) {
            citizen.stateInfo.stack.shift();
        } else {
            const woodMarket = findAWoodMarketWhichHasMoneyAndCapacity(citizen, state.map.citizens);
            if (woodMarket) {
                job.sellToWoodMarket = woodMarket;
                stateInfo.state = "sellToWoodMarket";
                setCitizenThought(citizen, [
                    `I can not carry more. I will sell to ${woodMarket.name}.`,
                ], state);
                citizen.moveTo = {
                    x: woodMarket.position.x,
                    y: woodMarket.position.y,
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
    if (stateInfo.state === "sellToWoodMarket" && !isCitizenThinking(citizen, state)) {
        if (citizen.moveTo === undefined) {
            if (job.sellToWoodMarket && isCitizenInInteractDistance(citizen, job.sellToWoodMarket.position)) {
                const woodPrice = 2;
                sellItem(citizen, job.sellToWoodMarket, INVENTORY_WOOD, woodPrice, state);
                citizen.stateInfo.stack.shift();
            } else {
                stateInfo.state = "selling";
                setCitizenThought(citizen, [
                    `I do not see the ${CITIZEN_JOB_WOOD_MARKET}.`,
                ], state);
            }
        }

    }
}

function cutDownTree(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const stateInfo = citizen.stateInfo.stack[0] as JobLumberjackStateInfo;
        if (!job.tree) {
            citizen.stateInfo.stack.shift();
            return;
        }
        if (!isCitizenInInteractDistance(citizen, job.tree.position)) {
            citizen.stateInfo.stack.shift();
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
    const stateInfo = citizen.stateInfo.stack[0] as JobLumberjackStateInfo;
    if (!job.tree || job.tree.woodValue === 0
        || !isCitizenInInteractDistance(citizen, job.tree.position)
    ) {
        citizen.stateInfo.stack.shift();
        return;
    }
    const cutDuration = 1000;
    if (job.actionEndTime === undefined) job.actionEndTime = state.time + cutDuration;
    if (job.actionEndTime < state.time) {
        job.actionEndTime = state.time + cutDuration;
        const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
        if (inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
            cutTreeForWood(citizen, job.tree, state);
        } else {
            citizen.stateInfo.stack.shift();
        }
    }
}

function searchTree(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (job.actionEndTime !== undefined && job.actionEndTime < state.time) {
        const stateInfo = citizen.stateInfo.stack[0] as JobLumberjackStateInfo;
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
    const stateInfo = citizen.stateInfo.stack[0] as JobLumberjackStateInfo;
    if (inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
        const lookingForTreeDuration = 1000;
        stateInfo.state = "searchingTree";
        job.actionEndTime = state.time + lookingForTreeDuration;
    } else {
        if (citizen.home && inventoryGetAvaiableCapacity(citizen.home.inventory, INVENTORY_WOOD) > 5) {
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
        if (citizen.job && citizen.job.name === CITIZEN_JOB_WOOD_MARKET && citizen.moveTo === undefined && citizen.money > 2 && canCitizenCarryMore(citizen)) {
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
