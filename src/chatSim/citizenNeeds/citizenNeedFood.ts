import { ChatSimState, Inventory, InventoryItem } from "../chatSimModels.js";
import { Citizen, addCitizenLogEntry, findClosestFoodMarket, CITIZEN_STATE_TYPE_WORKING_JOB, moveItemBetweenInventories } from "../citizen.js";
import { createJob, isCitizenInInteractDistance } from "../jobs/job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "../jobs/jobFoodGatherer.js";
import { buyFoodFromFoodMarket } from "../jobs/jobFoodMarket.js";
import { INVENTORY_MUSHROOM } from "../main.js";

export const CITIZEN_FOOD_IN_INVENTORY_NEED = 2;
export const CITIZEN_FOOD_AT_HOME_NEED = 4;
export const CITIZEN_NEED_FOOD = "need food";
export const MUSHROOM_FOOD_VALUE = 0.15;

export function loadCitizenNeedsFunctionsFood(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_FOOD] = {
        isFulfilled: isFulfilled,
        tick: tick,
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    if (citizen.foodPerCent < 1 - MUSHROOM_FOOD_VALUE && inventoryMushroom && inventoryMushroom.counter > 0) {
        citizenEatMushroom(citizen, inventoryMushroom, state, "inventory");
    }
    if (citizen.foodPerCent < 0.5) return false;
    if (citizen.home) {
        const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        const hasEnoughFoodAtHome = homeMushrooms && homeMushrooms.counter >= CITIZEN_FOOD_AT_HOME_NEED;
        if (hasEnoughFoodAtHome) return true;
    } else {
        const hasEnoughFoodInInventory = inventoryMushroom && inventoryMushroom.counter >= CITIZEN_FOOD_IN_INVENTORY_NEED;
        if (hasEnoughFoodInInventory) return true;
    }

    return false;
}

export function citizenEatMushroom(citizen: Citizen, inventoryMushroom: InventoryItem, state: ChatSimState, inventoryName: string) {
    citizen.foodPerCent = Math.min(citizen.foodPerCent + MUSHROOM_FOOD_VALUE, 1);
    inventoryMushroom.counter--;
    addCitizenLogEntry(citizen, `eat ${INVENTORY_MUSHROOM} from ${inventoryName}, ${inventoryMushroom.counter}x${INVENTORY_MUSHROOM} left`, state);
}

function tick(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.type !== CITIZEN_NEED_FOOD) {
        let foundFood = false;
        if (citizen.home) {
            const inventoryMushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
            if (inventoryMushrooms && inventoryMushrooms.counter >= CITIZEN_FOOD_AT_HOME_NEED) {
                citizen.stateInfo = {
                    type: CITIZEN_NEED_FOOD,
                    state: `store food at home`,
                }
                citizen.moveTo = {
                    x: citizen.home.position.x,
                    y: citizen.home.position.y,
                }
                addCitizenLogEntry(citizen, `move to home to store ${INVENTORY_MUSHROOM}`, state);
                foundFood = true;
            }
            if (!foundFood && citizen.foodPerCent < 0.5) {
                const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (homeMushrooms && homeMushrooms.counter > 0) {
                    citizen.stateInfo = {
                        type: CITIZEN_NEED_FOOD,
                        state: `go home to eat`,
                    }
                    citizen.moveTo = {
                        x: citizen.home.position.x,
                        y: citizen.home.position.y,
                    }
                    addCitizenLogEntry(citizen, `move to home to eat ${INVENTORY_MUSHROOM}`, state);
                    foundFood = true;
                }
            }
        }
        if (!foundFood && citizen.money >= 2) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket) {
                addCitizenLogEntry(citizen, `move to food market from ${foodMarket.name}`, state);
                citizen.stateInfo = {
                    type: CITIZEN_NEED_FOOD,
                    state: `move to food market`,
                };
                citizen.moveTo = {
                    x: foodMarket.position.x,
                    y: foodMarket.position.y,
                }
                foundFood = true;
            }
        }
        if (!foundFood) {
            if (citizen.job.name !== CITIZEN_JOB_FOOD_GATHERER) {
                addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_GATHERER} as no food to buy found`, state);
                citizen.job = createJob(CITIZEN_JOB_FOOD_GATHERER, state);
            }
            citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
        }
    } else {
        if (citizen.stateInfo.state === `go home to eat`) {
            if (citizen.moveTo === undefined) {
                if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
                    const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                    if (homeMushrooms) {
                        while (citizen.foodPerCent < 1 - MUSHROOM_FOOD_VALUE && homeMushrooms.counter > 0) {
                            citizenEatMushroom(citizen, homeMushrooms, state, "home");
                        }
                    }
                }
                citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
            }
        }
        if (citizen.stateInfo.state === `store food at home`) {
            if (citizen.moveTo === undefined) {
                if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
                    const inventoryMushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                    if (inventoryMushrooms) {
                        moveItemBetweenInventories(INVENTORY_MUSHROOM, citizen.inventory, citizen.home.inventory);
                    }
                }
                citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
            }
        }
        if (citizen.stateInfo.state === `move to food market`) {
            if (citizen.money < 2) {
                citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
            } else if (citizen.moveTo === undefined) {
                const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
                if (foodMarket) {
                    if (isCitizenInInteractDistance(citizen, foodMarket.position)) {
                        const mushroom = foodMarket.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                        if (mushroom) {
                            buyFoodFromFoodMarket(foodMarket, citizen, 2, state);
                            citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
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
                    citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
                }
            }
        }
    }
}
