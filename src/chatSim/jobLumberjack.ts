import { ChatSimState } from "./chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen } from "./citizen.js";
import { CitizenJob, createJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { INVENTORY_WOOD, calculateDistance, SKILL_GATHERING } from "./main.js";

export type CitizenJobLuberjack = CitizenJob & {
    state: "gathering" | "selling",
    lastTreeCutTime: number,
}

export const CITIZEN_JOB_LUMBERJACK = "Lumberjack";
const CUT_INTERVAL = 500;

export function loadCitizenJobLumberjack(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_LUMBERJACK] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobLuberjack {
    return {
        name: CITIZEN_JOB_LUMBERJACK,
        state: "gathering",
        lastTreeCutTime: 0,
    }
}


function tick(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (job.state === "gathering") {
        if (job.lastTreeCutTime === undefined) job.lastTreeCutTime = 0;
        let inventoryWood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
        if (canCitizenCarryMore(citizen) && (!inventoryWood || inventoryWood.counter < 5)) {
            moveToTree(citizen, state);
            const isCloseToTreeIndex = isCloseToTree(citizen, state);
            if (isCloseToTreeIndex !== undefined) {
                if (job.lastTreeCutTime + CUT_INTERVAL < state.time) {
                    cutTreeForWood(citizen, state, isCloseToTreeIndex);
                    job.lastTreeCutTime = state.time;
                }
            }
        } else {
            if (inventoryWood && inventoryWood.counter > 0) job.state = "selling";
        }
    }
    if (job.state === "selling") {
        let inventoryWood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
        if (!inventoryWood || inventoryWood.counter === 0) {
            job.state = "gathering";
        } else {
            const woodMarket = findAWoodMarketWhichHasMoneyAndCapacity(citizen, state.map.citizens);
            if (woodMarket) {
                if (isCitizenInInteractDistance(citizen, woodMarket.position)) {
                    const woodPrice = 2;
                    sellItem(citizen, woodMarket, INVENTORY_WOOD, woodPrice, state);
                    job.state = "gathering";
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

function cutTreeForWood(citizen: Citizen, state: ChatSimState, treeIndex: number) {
    const tree = state.map.trees[treeIndex];
    let inventoryWood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
    if (inventoryWood === undefined) {
        inventoryWood = { name: INVENTORY_WOOD, counter: 0 };
        citizen.inventory.push(inventoryWood);
    }
    tree.woodValue--;
    inventoryWood.counter++;
    addCitizenLogEntry(citizen, `cut tree for 1x${INVENTORY_WOOD}`, state);
    if (tree.woodValue === 0) state.map.trees.splice(treeIndex, 1);

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

function moveToTree(citizen: Citizen, state: ChatSimState) {
    if (!citizen.moveTo && state.map.trees.length > 0) {
        const treeIndex = Math.floor(Math.random() * state.map.trees.length);
        citizen.moveTo = {
            x: state.map.trees[treeIndex].position.x,
            y: state.map.trees[treeIndex].position.y,
        }
    }
}