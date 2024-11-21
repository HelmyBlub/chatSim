import { ChatSimState } from "../chatSimModels.js";
import { Citizen, addCitizenLogEntry, CITIZEN_STATE_TYPE_WORKING_JOB, setCitizenThought } from "../citizen.js";
import { buyItem, citizenChangeJob, isCitizenInInteractDistance, sellItem } from "../jobs/job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "../jobs/jobFoodGatherer.js";
import { CITIZEN_JOB_FOOD_MARKET, findClosestFoodMarket } from "../jobs/jobFoodMarket.js";
import { INVENTORY_MUSHROOM, calculateDistance } from "../main.js";
import { citizenEatMushroom, MUSHROOM_FOOD_VALUE } from "./citizenNeedFood.js";

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
    const mushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    if (citizen.foodPerCent < STARVING_FOOD_PER_CENT) {
        if (mushrooms && mushrooms.counter > 0) {
            citizenEatMushroom(citizen, mushrooms, state, "inventory");
            return;
        }
    }

    if (citizen.stateInfo.type !== CITIZEN_NEED_STARVING) {
        let foundFood = false;
        if (citizen.home) {
            const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
            if (homeMushrooms && homeMushrooms.counter > 0) {
                citizen.stateInfo = {
                    type: CITIZEN_NEED_STARVING,
                    state: `go home to eat`,
                }
                setCitizenThought(citizen, [
                    `I am starving. I go home to eat.`
                ], state);
                citizen.moveTo = {
                    x: citizen.home.position.x,
                    y: citizen.home.position.y,
                }
                foundFood = true;
            }
        }

        if (!foundFood && citizen.money >= 2) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket) {
                citizen.stateInfo = {
                    type: CITIZEN_NEED_STARVING,
                    state: `move to food market`,
                };
                setCitizenThought(citizen, [
                    `I am starving. I go buy food at ${foodMarket.name}.`
                ], state);
                citizen.moveTo = {
                    x: foodMarket.position.x,
                    y: foodMarket.position.y,
                }
                foundFood = true;
            }
        }
        if (!foundFood) {
            if (citizen.job.name !== CITIZEN_JOB_FOOD_GATHERER) {
                const reason = [
                    `I am starving.`,
                    `I do not see a ${CITIZEN_JOB_FOOD_MARKET}.`,
                    `I become a ${CITIZEN_JOB_FOOD_GATHERER} to gather ${INVENTORY_MUSHROOM} myself.`,
                ];
                citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, reason);
            }
            if (citizen.stateInfo.type !== CITIZEN_STATE_TYPE_WORKING_JOB) {
                citizen.stateInfo = {
                    type: CITIZEN_STATE_TYPE_WORKING_JOB,
                };
                setCitizenThought(citizen, [
                    `I am starving. Go back gathering.`
                ], state);
            }
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
        if (citizen.stateInfo.state === `move to food market`) {
            if (citizen.money < 2) {
                citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
            } else if (citizen.moveTo === undefined) {
                const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
                if (foodMarket) {
                    if (isCitizenInInteractDistance(citizen, foodMarket.position)) {
                        const mushroom = foodMarket.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                        if (mushroom) {
                            buyItem(foodMarket, citizen, INVENTORY_MUSHROOM, 2, state, 1);
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
                    const reason = [
                        `I am starving.`,
                        `The ${CITIZEN_JOB_FOOD_MARKET} disappeared.`,
                        `I become a ${CITIZEN_JOB_FOOD_GATHERER} to gather ${INVENTORY_MUSHROOM} myself.`,
                    ];
                    citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, reason);
                }
            }
        }
    }
}
