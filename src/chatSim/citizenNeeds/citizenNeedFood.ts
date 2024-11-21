import { ChatSimState, InventoryItem } from "../chatSimModels.js";
import { Citizen, addCitizenLogEntry, findClosestFoodMarket, CITIZEN_STATE_TYPE_WORKING_JOB, moveItemBetweenInventories, isCitizenThinking } from "../citizen.js";
import { CITIZEN_STATE_TYPE_CHANGE_JOB, citizenChangeJob, isCitizenInInteractDistance } from "../jobs/job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "../jobs/jobFoodGatherer.js";
import { buyFoodFromFoodMarket, CITIZEN_JOB_FOOD_MARKET } from "../jobs/jobFoodMarket.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { getCitizenNeedData } from "./citizenNeed.js";

type CitizenNeedFood = {
    gatherMoreFood: boolean,
}

export const CITIZEN_FOOD_IN_INVENTORY_NEED = 2;
export const CITIZEN_FOOD_AT_HOME_NEED = 4;
export const CITIZEN_NEED_FOOD = "need food";
export const MUSHROOM_FOOD_VALUE = 0.15;

export function loadCitizenNeedsFunctionsFood(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_FOOD] = {
        createDefaultData: createDefaultData,
        isFulfilled: isFulfilled,
        tick: tick,
    }
}

function createDefaultData(): CitizenNeedFood {
    return { gatherMoreFood: false };
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    if (citizen.foodPerCent < 1 - MUSHROOM_FOOD_VALUE && inventoryMushroom && inventoryMushroom.counter > 0) {
        citizenEatMushroom(citizen, inventoryMushroom, state, "inventory");
    }
    if (citizen.foodPerCent < 0.5) return false;
    const needData = getCitizenNeedData(CITIZEN_NEED_FOOD, citizen, state) as CitizenNeedFood;
    if (citizen.home) {
        const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        const hasEnoughFoodAtHome = homeMushrooms && homeMushrooms.counter >= CITIZEN_FOOD_AT_HOME_NEED;
        if (hasEnoughFoodAtHome) return true;
    } else {
        let foodInInventoryRequired = CITIZEN_FOOD_IN_INVENTORY_NEED;
        if (needData.gatherMoreFood) foodInInventoryRequired += 2;

        const hasEnoughFoodInInventory = inventoryMushroom && inventoryMushroom.counter >= foodInInventoryRequired;
        if (hasEnoughFoodInInventory) {
            needData.gatherMoreFood = false;
            return true;
        }
    }
    needData.gatherMoreFood = true;
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
                    actionStartTime: state.time,
                    thoughts: [
                        `I have enough ${INVENTORY_MUSHROOM}.`,
                        `I will store them at home.`
                    ]
                }
                citizen.moveTo = {
                    x: citizen.home.position.x,
                    y: citizen.home.position.y,
                }
                addCitizenLogEntry(citizen, citizen.stateInfo.thoughts!.join(), state);
                foundFood = true;
            }
            if (!foundFood && citizen.foodPerCent < 0.5) {
                const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (homeMushrooms && homeMushrooms.counter > 0) {
                    citizen.stateInfo = {
                        type: CITIZEN_NEED_FOOD,
                        state: `go home to eat`,
                        actionStartTime: state.time,
                        thoughts: [
                            `I am hungry.`,
                            `I will go home to eat ${INVENTORY_MUSHROOM}.`,
                        ]
                    }
                    citizen.moveTo = {
                        x: citizen.home.position.x,
                        y: citizen.home.position.y,
                    }
                    addCitizenLogEntry(citizen, citizen.stateInfo.thoughts!.join(), state);
                    foundFood = true;
                }
            }
        }
        if (!foundFood && citizen.money >= 2) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket) {
                citizen.stateInfo = {
                    type: CITIZEN_NEED_FOOD,
                    state: `move to food market`,
                    actionStartTime: state.time,
                    thoughts: [
                        `I want to stock up on ${INVENTORY_MUSHROOM}.`,
                        `I will go to ${foodMarket.name} to buy some.`,
                    ]
                };
                addCitizenLogEntry(citizen, citizen.stateInfo.thoughts!.join(), state);
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
                    `I am low on ${INVENTORY_MUSHROOM}.`,
                    `I did not find a market to buy a ${INVENTORY_MUSHROOM}.`,
                    `I become a ${CITIZEN_JOB_FOOD_GATHERER} to gather ${INVENTORY_MUSHROOM} myself.`,
                ];

                citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, reason);
            } else if (citizen.stateInfo.type !== CITIZEN_STATE_TYPE_WORKING_JOB && citizen.stateInfo.type !== CITIZEN_STATE_TYPE_CHANGE_JOB) {
                citizen.stateInfo = {
                    type: CITIZEN_STATE_TYPE_WORKING_JOB,
                    actionStartTime: state.time,
                    thoughts: [
                        `I am low on ${INVENTORY_MUSHROOM}.`,
                        `I will start gathering.`,
                    ]
                };
            }
        }
    } else {
        if (citizen.stateInfo.state === `go home to eat`) {
            if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
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
            if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
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
            } else if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
                const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
                if (foodMarket) {
                    if (isCitizenInInteractDistance(citizen, foodMarket.position)) {
                        const mushroom = foodMarket.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                        if (mushroom) {
                            buyFoodFromFoodMarket(foodMarket, citizen, 4, state);
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
                        `I am hungry.`,
                        `The ${CITIZEN_JOB_FOOD_MARKET} i wanted to buy from disappeared.`,
                        `I become a ${CITIZEN_JOB_FOOD_GATHERER} to gather ${INVENTORY_MUSHROOM} myself.`,
                    ];
                    citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, reason);
                }
            }
        }
    }
}
