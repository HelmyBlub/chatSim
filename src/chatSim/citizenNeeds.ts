import { ChatSimState, Citizen } from "./chatSimModels.js";
import { findClosestFoodMarket } from "./citizen.js";
import { createJob } from "./job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";
import { CITIZEN_JOB_HOUSE_CONSTRUCTION } from "./jobHouseContruction.js";
import { CITIZEN_JOB_HOUSE_MARKET } from "./jobHouseMarket.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { calculateDistance, INVENTORY_MUSHROOM } from "./main.js";

export type CitizenNeedFunctions = {
    isFulfilled(citizen: Citizen, state: ChatSimState): boolean,
    tick(citizen: Citizen, state: ChatSimState): void
}

export type CitizenNeedsFunctions = { [key: string]: CitizenNeedFunctions };
const CITIZEN_NEED_FOOD = "need food";
const CITIZEN_NEED_HOME = "need home";
const FOOD_IN_INVENTORY_NEED = 2;


export function loadCitizenNeedsFunctions(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_FOOD] = {
        isFulfilled: isFulfilledFood,
        tick: tickFood,
    }
    state.functionsCitizenNeeds[CITIZEN_NEED_HOME] = {
        isFulfilled: isFulfilledHome,
        tick: tickHome,
    }
}
export function tickCitizenNeeds(citizen: Citizen, state: ChatSimState) {
    const checkInterval = 1000;
    if (citizen.lastCheckedNeedsTime !== undefined && citizen.lastCheckedNeedsTime + checkInterval > state.time) return;
    const needs = [CITIZEN_NEED_FOOD, CITIZEN_NEED_HOME];
    let needsFulfilled = true;
    for (let need of needs) {
        const needFunctions = state.functionsCitizenNeeds[need];
        if (!needFunctions.isFulfilled(citizen, state)) {
            needFunctions.tick(citizen, state);
            needsFulfilled = false;
            break;
        }
    }
    if (needsFulfilled) {
        citizen.lastCheckedNeedsTime = state.time;
    }
}

function isFulfilledFood(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.foodPerCent < 0.5) return false;
    const inventoryMushroom = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
    const hasEnoughFoodInInventory = inventoryMushroom && inventoryMushroom.counter >= FOOD_IN_INVENTORY_NEED;
    if (hasEnoughFoodInInventory) return true;
    return false;
}

function isFulfilledHome(citizen: Citizen, state: ChatSimState): boolean {
    return citizen.home !== undefined;
}

function tickFood(citizen: Citizen, state: ChatSimState) {
    const mushrooms = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
    if (citizen.foodPerCent < 0.5) {
        if (mushrooms && mushrooms.counter > 0) {
            citizen.foodPerCent = Math.min(citizen.foodPerCent + 0.5, 1);
            mushrooms.counter--;
        }
    }
    if (mushrooms && mushrooms.counter >= FOOD_IN_INVENTORY_NEED) return;

    let foundFood = false;
    if (citizen.money >= 2) {
        const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
        if (foodMarket) {
            citizen.state = "buyFoodFromMarket";
            citizen.moveTo = {
                x: foodMarket.position.x,
                y: foodMarket.position.y,
            }
            foundFood = true;
        }
    }
    if (!foundFood && citizen.job.name !== CITIZEN_JOB_FOOD_GATHERER) {
        citizen.job = createJob(CITIZEN_JOB_FOOD_GATHERER, state);
        citizen.state = "workingJob";
    }
}

function tickHome(citizen: Citizen, state: ChatSimState) {
    const houseMarket = findClosestHouseMarket(citizen, state.map.citizens);
    if (houseMarket) {
        //TODO
    } else {
        const availableHouse = state.map.houses.find(h => h.inhabitedBy === undefined && h.buildProgress === undefined);
        if (availableHouse) {
            availableHouse.inhabitedBy = citizen;
            citizen.home = availableHouse;
        } else if (!isInHouseBuildingBusiness(citizen)) {
            citizen.job = createJob(CITIZEN_JOB_HOUSE_CONSTRUCTION, state);
            citizen.state = "workingJob";
        }
    }
}

function findClosestHouseMarket(searcher: Citizen, citizens: Citizen[]): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen.job && citizen.job.name === CITIZEN_JOB_HOUSE_MARKET) {
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

function isInHouseBuildingBusiness(citizen: Citizen) {
    return (citizen.job.name === CITIZEN_JOB_HOUSE_MARKET
        || citizen.job.name === CITIZEN_JOB_HOUSE_CONSTRUCTION
        || citizen.job.name === CITIZEN_JOB_LUMBERJACK
        || citizen.job.name === CITIZEN_JOB_WOOD_MARKET
    )
}

