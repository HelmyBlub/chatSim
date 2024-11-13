import { ChatSimState } from "./chatSimModels.js";
import { findClosestFoodMarket, Citizen, addCitizenLogEntry, CITIZEN_STATE_WORKING_JOB, canCitizenCarryMore } from "./citizen.js";
import { createJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";
import { CITIZEN_JOB_HOUSE_CONSTRUCTION } from "./jobHouseContruction.js";
import { CITIZEN_JOB_HOUSE_MARKET } from "./jobHouseMarket.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";
import { CITIZEN_JOB_WOOD_MARKET, findClosestWoodMarket } from "./jobWoodMarket.js";
import { calculateDistance, INVENTORY_MUSHROOM, INVENTORY_WOOD } from "./main.js";

export type CitizenNeedFunctions = {
    isFulfilled(citizen: Citizen, state: ChatSimState): boolean,
    tick(citizen: Citizen, state: ChatSimState): void
}

export type CitizenNeedsFunctions = { [key: string]: CitizenNeedFunctions };
export const CITIZEN_FOOD_IN_INVENTORY_NEED = 2;
const CITIZEN_NEED_FOOD = "need food";
const CITIZEN_NEED_HOME = "need home";


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
        citizen.state = CITIZEN_STATE_WORKING_JOB;
    }
}

function isFulfilledFood(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.foodPerCent < 0.5) return false;
    const inventoryMushroom = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
    const hasEnoughFoodInInventory = inventoryMushroom && inventoryMushroom.counter >= CITIZEN_FOOD_IN_INVENTORY_NEED;
    if (hasEnoughFoodInInventory) return true;
    return false;
}

function isFulfilledHome(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.home === undefined) return false;
    if (citizen.home.deterioration > 0.2) return false;
    return true;
}

function tickFood(citizen: Citizen, state: ChatSimState) {
    const mushrooms = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
    if (citizen.foodPerCent < 0.5) {
        if (mushrooms && mushrooms.counter > 0) {
            citizen.foodPerCent = Math.min(citizen.foodPerCent + 0.5, 1);
            mushrooms.counter--;
            addCitizenLogEntry(citizen, `eat ${INVENTORY_MUSHROOM} from inventory, ${mushrooms.counter}x${INVENTORY_MUSHROOM} left`, state);
        }
    }
    if (mushrooms && mushrooms.counter >= CITIZEN_FOOD_IN_INVENTORY_NEED) return;

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
            } else {
                citizen.state = CITIZEN_STATE_WORKING_JOB;
            }
        }
        if (!foundFood) {
            if (citizen.job.name !== CITIZEN_JOB_FOOD_GATHERER) {
                addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_GATHERER} as no food to buy found`, state);
                citizen.job = createJob(CITIZEN_JOB_FOOD_GATHERER, state);
            }
            citizen.state = CITIZEN_STATE_WORKING_JOB;
        }
    }
    if (citizen.state === `${CITIZEN_NEED_FOOD}: move to food market`) {
        if (citizen.money < 2) {
            citizen.state = CITIZEN_STATE_WORKING_JOB;
        } else if (citizen.moveTo === undefined) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket && foodMarket !== citizen) {
                const distance = calculateDistance(foodMarket.position, citizen.position);
                if (distance <= citizen.speed) {
                    const mushroom = foodMarket.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                    if (mushroom) {
                        sellItem(foodMarket, citizen, INVENTORY_MUSHROOM, 2, state, 1);
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
    if (!citizen.home) {
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
    if (citizen.home && citizen.home.deterioration > 0.2) {
        if (citizen.state.indexOf(`${CITIZEN_NEED_HOME}:`) === -1) {
            const wood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
            if (wood && wood.counter > 0) {
                citizen.moveTo = {
                    x: citizen.home.position.x,
                    y: citizen.home.position.y,
                }
                citizen.state = `${CITIZEN_NEED_HOME}: move to house to repair`;
            } else {
                if (citizen.job.name !== CITIZEN_JOB_LUMBERJACK) {
                    let canBuyWood = false;
                    if (citizen.money > 1) {
                        const woodMarket = findClosestWoodMarket(citizen.position, state, true, false);
                        if (woodMarket) {
                            addCitizenLogEntry(citizen, `house repair required. Move to wood market from ${woodMarket.name} to buy wood.`, state);
                            citizen.state = `${CITIZEN_NEED_HOME}: buy wood`;
                            citizen.moveTo = {
                                x: woodMarket.position.x,
                                y: woodMarket.position.y,
                            }
                            canBuyWood = true;
                        }
                    }
                    if (!canBuyWood) {
                        citizen.job = createJob(CITIZEN_JOB_LUMBERJACK, state);
                        citizen.state = CITIZEN_STATE_WORKING_JOB;
                        addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_LUMBERJACK} as no money or no wood market found and i need wood for house repairs`, state);
                    }
                }
            }
        }
        if (citizen.state === `${CITIZEN_NEED_HOME}: buy wood`) {
            if (citizen.moveTo === undefined) {
                if (citizen.money < 2) {
                    citizen.job = createJob(CITIZEN_JOB_LUMBERJACK, state);
                    citizen.state = CITIZEN_STATE_WORKING_JOB;
                    addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_LUMBERJACK} as no money to buy wood for house repairs`, state);
                } else {
                    const woodMarket = findClosestWoodMarket(citizen.position, state, true, false);
                    if (woodMarket && isCitizenInInteractDistance(citizen, woodMarket.position)) {
                        if (canCitizenCarryMore(citizen)) {
                            sellItem(woodMarket, citizen, INVENTORY_WOOD, 2, state, 1);
                        }
                    } else {
                        addCitizenLogEntry(citizen, `${CITIZEN_JOB_WOOD_MARKET} not found at location`, state);
                    }
                    citizen.state = CITIZEN_STATE_WORKING_JOB;
                }
            }
        }
        if (citizen.state === `${CITIZEN_NEED_HOME}: move to house to repair`) {
            if (citizen.moveTo === undefined) {
                if (isCitizenInInteractDistance(citizen, citizen.home.position)) {
                    const wood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
                    if (wood && wood.counter > 0) {
                        citizen.home.deterioration -= 0.2;
                        wood.counter--;
                        addCitizenLogEntry(citizen, `used ${INVENTORY_WOOD} to repair home. current deterioration: ${(citizen.home.deterioration * 100).toFixed()}%`, state);
                    } else {
                        citizen.state = `${CITIZEN_NEED_HOME}: buy wood`;
                    }
                } else {
                    citizen.moveTo = {
                        x: citizen.home.position.x,
                        y: citizen.home.position.y,
                    }
                }
            }
        }
    }
}

function isInHouseBuildingBusiness(citizen: Citizen) {
    return (citizen.job.name === CITIZEN_JOB_HOUSE_MARKET
        || citizen.job.name === CITIZEN_JOB_HOUSE_CONSTRUCTION
        || citizen.job.name === CITIZEN_JOB_LUMBERJACK
        || citizen.job.name === CITIZEN_JOB_WOOD_MARKET
    )
}

