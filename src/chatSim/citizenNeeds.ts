import { formatDiagnostic } from "typescript";
import { ChatSimState } from "./chatSimModels.js";
import { findClosestFoodMarket, Citizen, addCitizenLogEntry, CITIZEN_STATE_WORKING_JOB } from "./citizen.js";
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
            addCitizenLogEntry(citizen, "eat mushroom", state);
        }
    }
    if (mushrooms && mushrooms.counter >= FOOD_IN_INVENTORY_NEED) return;

    if (citizen.state.indexOf(CITIZEN_NEED_FOOD) === -1) {
        let foundFood = false;
        if (citizen.money >= 2) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket) {
                addCitizenLogEntry(citizen, `move to food market from ${foodMarket.name}`, state);
                citizen.state = `${CITIZEN_NEED_FOOD}: move to food market`;
                citizen.moveTo = {
                    x: foodMarket.position.x,
                    y: foodMarket.position.y,
                }
                foundFood = true;
            }
        }
        if (!foundFood && citizen.job.name !== CITIZEN_JOB_FOOD_GATHERER) {
            addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_GATHERER} as no food to buy found`, state);
            citizen.job = createJob(CITIZEN_JOB_FOOD_GATHERER, state);
            citizen.state = CITIZEN_STATE_WORKING_JOB;
        }
    }
    if (citizen.state === `${CITIZEN_NEED_FOOD}: move to food market`) {
        if (citizen.moveTo === undefined) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket && foodMarket !== citizen) {
                const distance = calculateDistance(foodMarket.position, citizen.position);
                if (distance <= citizen.speed) {
                    const mushroom = foodMarket.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                    if (mushroom) {
                        addCitizenLogEntry(citizen, `buy mushroom from ${foodMarket.name}`, state);
                        const mushroomFoodValue = 0.5;
                        citizen.foodPerCent = Math.min(citizen.foodPerCent + mushroomFoodValue, 1);
                        mushroom.counter--;
                        const mushroomCost = 2;
                        citizen.money -= mushroomCost;
                        foodMarket.money += mushroomCost;
                        citizen.state = CITIZEN_STATE_WORKING_JOB;
                    }
                } else {
                    addCitizenLogEntry(citizen, `food market location changed. Move to new location of food market from ${foodMarket.name}`, state);
                    citizen.moveTo = {
                        x: foodMarket.position.x,
                        y: foodMarket.position.y,
                    }
                }
            } else {
                addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_GATHERER} as food market disappeared`, state);
                citizen.job = createJob(CITIZEN_JOB_FOOD_GATHERER, state);
                citizen.state = CITIZEN_STATE_WORKING_JOB;
            }
        }
    }
}

function tickHome(citizen: Citizen, state: ChatSimState) {
    const houseMarket = findClosestHouseMarket(citizen, state.map.citizens);
    if (houseMarket) {
        //TODO
    } else {
        const availableHouse = state.map.houses.find(h => h.inhabitedBy === undefined && h.buildProgress === undefined);
        if (availableHouse) {
            addCitizenLogEntry(citizen, `moved into a house from ${availableHouse.owner}`, state);
            availableHouse.inhabitedBy = citizen;
            citizen.home = availableHouse;
        } else if (!isInHouseBuildingBusiness(citizen)) {
            addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_HOUSE_CONSTRUCTION} as no available house found`, state);
            citizen.job = createJob(CITIZEN_JOB_HOUSE_CONSTRUCTION, state);
            citizen.state = CITIZEN_STATE_WORKING_JOB;
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

