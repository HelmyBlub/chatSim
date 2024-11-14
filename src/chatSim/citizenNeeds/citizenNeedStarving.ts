import { ChatSimState } from "../chatSimModels.js";
import { Citizen, addCitizenLogEntry, findClosestFoodMarket, CITIZEN_STATE_WORKING_JOB } from "../citizen.js";
import { createJob, sellItem } from "../jobs/job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "../jobs/jobFoodGatherer.js";
import { INVENTORY_MUSHROOM, calculateDistance } from "../main.js";

export const CITIZEN_NEED_STARVING = "need starving";
const STARVING_FOOD_PER_CENT = 0.2;
export function loadCitizenNeedsFunctionsStarving(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_STARVING] = {
        isFulfilled: isFulfilled,
        tick: tick,
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.foodPerCent < STARVING_FOOD_PER_CENT) return false;
    return true;
}

function tick(citizen: Citizen, state: ChatSimState) {
    const mushrooms = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
    if (citizen.foodPerCent < STARVING_FOOD_PER_CENT) {
        if (mushrooms && mushrooms.counter > 0) {
            citizen.foodPerCent = Math.min(citizen.foodPerCent + 0.15, 1);
            mushrooms.counter--;
            addCitizenLogEntry(citizen, `eat ${INVENTORY_MUSHROOM} from inventory, ${mushrooms.counter}x${INVENTORY_MUSHROOM} left`, state);
            return;
        }
    }

    if (citizen.stateInfo.type !== CITIZEN_NEED_STARVING) {
        let foundFood = false;
        if (citizen.money >= 2) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket) {
                addCitizenLogEntry(citizen, `move to food market from ${foodMarket.name}`, state);
                citizen.stateInfo = {
                    type: CITIZEN_NEED_STARVING,
                    state: `move to food market`,
                };
                citizen.moveTo = {
                    x: foodMarket.position.x,
                    y: foodMarket.position.y,
                }
                foundFood = true;
            } else {
                citizen.stateInfo = { type: CITIZEN_STATE_WORKING_JOB };
            }
        }
        if (!foundFood) {
            if (citizen.job.name !== CITIZEN_JOB_FOOD_GATHERER) {
                addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_GATHERER} as no food to buy found`, state);
                citizen.job = createJob(CITIZEN_JOB_FOOD_GATHERER, state);
            }
            citizen.stateInfo = { type: CITIZEN_STATE_WORKING_JOB };
        }
    } else {
        if (citizen.stateInfo.state === `move to food market`) {
            if (citizen.money < 2) {
                citizen.stateInfo = { type: CITIZEN_STATE_WORKING_JOB };
            } else if (citizen.moveTo === undefined) {
                const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
                if (foodMarket && foodMarket !== citizen) {
                    const distance = calculateDistance(foodMarket.position, citizen.position);
                    if (distance <= citizen.speed) {
                        const mushroom = foodMarket.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                        if (mushroom) {
                            sellItem(foodMarket, citizen, INVENTORY_MUSHROOM, 2, state, 1);
                            citizen.stateInfo = { type: CITIZEN_STATE_WORKING_JOB };
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
                    citizen.stateInfo = { type: CITIZEN_STATE_WORKING_JOB };
                }
            }
        }
    }
}
