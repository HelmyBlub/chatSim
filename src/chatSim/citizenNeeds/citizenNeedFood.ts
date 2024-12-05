import { ChatSimState } from "../chatSimModels.js";
import { Citizen, isCitizenThinking, setCitizenThought, addCitizenThought, citizenResetStateTo, citizenStateStackTaskSuccess } from "../citizen.js";
import { CITIZEN_STATE_EAT, setCitizenStateEat } from "../citizenState/citizenStateEat.js";
import { setCitizenStateTransportItemToBuilding, setCitizenStateGetItem } from "../citizenState/citizenStateGetItem.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { citizenNeedFailingNeedFulfilled } from "./citizenNeed.js";

export const CITIZEN_NEED_FOOD_IN_INVENTORY = 2;
export const CITIZEN_NEED_FOOD_AT_HOME = 4;
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
        if (citizen.stateInfo.stack.length > 0 && citizen.stateInfo.stack[0].state !== CITIZEN_STATE_EAT) {
            setCitizenStateEat(citizen, inventoryMushroom, "inventory");
        }
    }
    if (citizen.foodPerCent < 0.5) return false;
    if (citizen.home) {
        const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        const hasEnoughFoodAtHome = homeMushrooms !== undefined && homeMushrooms.counter >= CITIZEN_NEED_FOOD_AT_HOME;
        return hasEnoughFoodAtHome;
    } else {
        const hasEnoughFoodInInventory = inventoryMushroom !== undefined && inventoryMushroom.counter >= CITIZEN_NEED_FOOD_IN_INVENTORY;
        return hasEnoughFoodInInventory;
    }
}

function tick(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.type !== CITIZEN_NEED_FOOD) {
        citizenResetStateTo(citizen, CITIZEN_NEED_FOOD);
    }

    if (citizen.stateInfo.stack.length === 0) {
        const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        if (inventoryMushroom && inventoryMushroom.counter > 0) {
            if (citizen.foodPerCent < 1 - MUSHROOM_FOOD_VALUE) {
                setCitizenStateEat(citizen, inventoryMushroom, "inventory");
                return;
            }
        }
        if (citizen.home) {
            const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
            const hasEnoughFoodAtHome = homeMushrooms !== undefined && homeMushrooms.counter >= CITIZEN_NEED_FOOD_AT_HOME;
            if (hasEnoughFoodAtHome && citizen.foodPerCent >= 0.5) {
                addCitizenThought(citizen, `I have good on food.`, state);
                citizenNeedFailingNeedFulfilled(citizen, state);
                return;
            }
            const inventoryMushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
            if (inventoryMushrooms && inventoryMushrooms.counter >= CITIZEN_NEED_FOOD_AT_HOME) {
                addCitizenThought(citizen, `I have enough ${INVENTORY_MUSHROOM}. I will store them at home.`, state);
                setCitizenStateTransportItemToBuilding(citizen, citizen.home, INVENTORY_MUSHROOM, CITIZEN_NEED_FOOD_AT_HOME);
                return;
            }
            if (citizen.foodPerCent < 0.5) {
                if (homeMushrooms && homeMushrooms.counter > 0) {
                    citizen.stateInfo.stack.push({ state: `go home to eat` });
                    addCitizenThought(citizen, `I will go home to eat ${INVENTORY_MUSHROOM}.`, state);
                    citizen.moveTo = {
                        x: citizen.home.position.x,
                        y: citizen.home.position.y,
                    }
                    return;
                }
            }
        } else {
            const hasEnoughFoodInInventory = inventoryMushroom !== undefined && inventoryMushroom.counter >= CITIZEN_NEED_FOOD_IN_INVENTORY;
            if (hasEnoughFoodInInventory) {
                addCitizenThought(citizen, `I have enough food.`, state);
                citizenNeedFailingNeedFulfilled(citizen, state);
                return;
            }
        }
        let requiredAmount = CITIZEN_NEED_FOOD_IN_INVENTORY + 2;
        setCitizenThought(citizen, [`I am low on ${INVENTORY_MUSHROOM}.`], state);
        setCitizenStateGetItem(citizen, INVENTORY_MUSHROOM, requiredAmount, true, true);
        return;
    }
    if (citizen.stateInfo.stack.length > 0) {
        if (citizen.stateInfo.stack[0].state === `go home to eat`) {
            if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
                if (citizen.home && isCitizenAtPosition(citizen, citizen.home.position)) {
                    const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                    if (homeMushrooms) {
                        if (citizen.foodPerCent < 1 - MUSHROOM_FOOD_VALUE && homeMushrooms.counter > 0) {
                            setCitizenStateEat(citizen, homeMushrooms, "home");
                            return;
                        }
                    }
                }
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        } else {
            CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state](citizen, state);
        }
    }
}
