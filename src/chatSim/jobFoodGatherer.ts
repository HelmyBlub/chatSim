import { ChatSimState } from "./chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen } from "./citizen.js";
import { CITIZEN_FOOD_IN_INVENTORY_NEED } from "./citizenNeeds.js";
import { CitizenJob, createJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_FOOD_MARKET } from "./jobFoodMarket.js";
import { INVENTORY_MUSHROOM, calculateDistance, SKILL_GATHERING } from "./main.js";

export type CitizenJobFoodGatherer = CitizenJob & {
    state: "gathering" | "selling" | "setMoveToMushroom",
}

export const CITIZEN_JOB_FOOD_GATHERER = "Food Gatherer";

export function loadCitizenJobFoodGatherer(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_GATHERER] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobFoodGatherer {
    return {
        name: CITIZEN_JOB_FOOD_GATHERER,
        state: "setMoveToMushroom",
    }
}


function tick(citizen: Citizen, job: CitizenJobFoodGatherer, state: ChatSimState) {
    if (job.state === "setMoveToMushroom") {
        const mushrooms = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
        if (canCitizenCarryMore(citizen) && (!mushrooms || mushrooms.counter < 9)) {
            moveToMushroom(citizen, state);
        } else {
            const mushroom = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
            if (mushroom && mushroom.counter > CITIZEN_FOOD_IN_INVENTORY_NEED) {
                job.state = "selling";
            }
        }
    }
    if (job.state === "gathering") {
        const isCloseToMushroomIndex = isCloseToMushroom(citizen, state);
        if (isCloseToMushroomIndex !== undefined) {
            addCitizenLogEntry(citizen, `picked up ${INVENTORY_MUSHROOM}`, state);
            pickUpMushroom(citizen, state, isCloseToMushroomIndex);
        } else if (citizen.moveTo === undefined) {
            addCitizenLogEntry(citizen, `no ${INVENTORY_MUSHROOM} at pickup location. Search a new one`, state);
            job.state = "setMoveToMushroom";
        }
    }
    if (job.state === "selling") {
        const foodMarket = findAFoodMarketWhichHasMoneyAndCapacity(citizen, state.map.citizens);
        if (foodMarket) {
            if (isCitizenInInteractDistance(citizen, foodMarket.position)) {
                const mushroomPrice = 1;
                const mushroom = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                if (mushroom && mushroom.counter > CITIZEN_FOOD_IN_INVENTORY_NEED) {
                    const sellAmount = mushroom.counter - CITIZEN_FOOD_IN_INVENTORY_NEED;
                    sellItem(citizen, foodMarket, INVENTORY_MUSHROOM, mushroomPrice, state, sellAmount);
                }
                job.state = "gathering";
            } else {
                citizen.moveTo = {
                    x: foodMarket.position.x,
                    y: foodMarket.position.y,
                }
            }
        } else {
            addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_MARKET} as there is no food market to sell food too`, state);
            citizen.job = createJob(CITIZEN_JOB_FOOD_MARKET, state);
        }
    }
}

function findAFoodMarketWhichHasMoneyAndCapacity(searcher: Citizen, citizens: Citizen[]): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen.job && citizen.job.name === CITIZEN_JOB_FOOD_MARKET && citizen.money > 2 && canCitizenCarryMore(citizen)) {
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

function pickUpMushroom(citizen: Citizen, state: ChatSimState, mushroomIndex: number) {
    state.map.mushrooms.splice(mushroomIndex, 1)[0];
    let inventoryMushroom = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
    if (inventoryMushroom === undefined) {
        inventoryMushroom = { name: INVENTORY_MUSHROOM, counter: 0 };
        citizen.inventory.push(inventoryMushroom);
    }
    inventoryMushroom.counter++;
    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (Math.random() < skillGathering / 100) {
        inventoryMushroom.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}

function isCloseToMushroom(citizen: Citizen, state: ChatSimState): number | undefined {
    for (let i = state.map.mushrooms.length - 1; i >= 0; i--) {
        const mushroom = state.map.mushrooms[i];
        const distance = calculateDistance(mushroom.position, citizen.position);
        if (distance < 10) return i;
    }
    return undefined;
}

function moveToMushroom(citizen: Citizen, state: ChatSimState) {
    if (!citizen.moveTo && state.map.mushrooms.length > 0) {
        const mushroomIndex = Math.floor(Math.random() * state.map.mushrooms.length);
        citizen.job.state = "gathering";
        citizen.moveTo = {
            x: state.map.mushrooms[mushroomIndex].position.x,
            y: state.map.mushrooms[mushroomIndex].position.y,
        }
        addCitizenLogEntry(citizen, `move to ${INVENTORY_MUSHROOM} at x:${citizen.moveTo.x}, y:${citizen.moveTo.y}`, state);
    }
}