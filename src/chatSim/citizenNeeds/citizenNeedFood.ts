import { ChatSimState } from "../chatSimModels.js";
import { Citizen, citizenIsThinking, citizenSetThought, citizenAddThought, citizenResetStateTo, citizenStateStackTaskSuccess, citizenAddTodo, citizenRemoveTodo, citizenMoveTo, CITIZEN_STATE_TYPE_TICK_FUNCTIONS, citizenMemorizeHomeInventory } from "../map/citizen.js";
import { CITIZEN_STATE_EAT, setCitizenStateEat } from "../citizenState/citizenStateEat.js";
import { setCitizenStateTransportItemToBuilding, setCitizenStateGetItem } from "../citizenState/citizenStateGetItem.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { INVENTORY_MUSHROOM, InventoryItemMushroom } from "../inventory.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { CITIZEN_NEEDS_FUNCTIONS, citizenNeedOnNeedFulfilled } from "./citizenNeed.js";

export const CITIZEN_NEED_FOOD_IN_INVENTORY = 2;
export const CITIZEN_NEED_FOOD_AT_HOME = 4;
export const CITIZEN_NEED_FOOD = "need food";
export function loadCitizenNeedsFunctionsFood() {
    CITIZEN_NEEDS_FUNCTIONS[CITIZEN_NEED_FOOD] = {
        isFulfilled: isFulfilled,
    }
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_FOOD] = citizenNeedTickFood;
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM) as InventoryItemMushroom;
    if (citizen.foodPerCent < 0.85 && inventoryMushroom && inventoryMushroom.counter > 0) {
        if (citizen.stateInfo.stack.length > 0 && citizen.stateInfo.stack[0].state !== CITIZEN_STATE_EAT) {
            setCitizenStateEat(citizen, inventoryMushroom, "inventory");
        }
    }
    if (citizen.foodPerCent < 0.5) {
        citizenAddTodo(citizen, 1 - citizen.foodPerCent, CITIZEN_NEED_FOOD, `I am hungry. I should eat soon.`, state);
        return true;
    }
    if (citizen.home) {
        const homeMushroomsMemory = citizen.memory.home.rememberedItems.find(i => i.name === INVENTORY_MUSHROOM);
        const hasEnoughFoodAtHome = homeMushroomsMemory !== undefined && homeMushroomsMemory.counter >= CITIZEN_NEED_FOOD_AT_HOME;
        if (!hasEnoughFoodAtHome) {
            citizenAddTodo(citizen, 0.75, CITIZEN_NEED_FOOD, `I am low on Food. I shoud get some soon.`, state);
        } else {
            citizenRemoveTodo(citizen, CITIZEN_NEED_FOOD);
        }
        return true;
    } else {
        const hasEnoughFoodInInventory = inventoryMushroom !== undefined && inventoryMushroom.counter >= CITIZEN_NEED_FOOD_IN_INVENTORY;
        return hasEnoughFoodInInventory;
    }
}

export function citizenNeedTickFood(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM) as InventoryItemMushroom;
        if (inventoryMushroom && inventoryMushroom.counter > 0) {
            if (citizen.foodPerCent < 0.85) {
                setCitizenStateEat(citizen, inventoryMushroom, "inventory");
                return;
            }
        }
        if (citizen.home) {
            const homeMushrooms = citizen.memory.home.rememberedItems.find(i => i.name === INVENTORY_MUSHROOM);
            const hasEnoughFoodAtHome = homeMushrooms !== undefined && homeMushrooms.counter >= CITIZEN_NEED_FOOD_AT_HOME;
            if (hasEnoughFoodAtHome && citizen.foodPerCent >= 0.5) {
                citizenAddThought(citizen, `I am good on food.`, state);
                citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_FOOD, state);
                return;
            }
            const inventoryMushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
            if (inventoryMushrooms && inventoryMushrooms.counter >= CITIZEN_NEED_FOOD_AT_HOME) {
                citizenAddThought(citizen, `I have enough ${INVENTORY_MUSHROOM}. I will store them at home.`, state);
                setCitizenStateTransportItemToBuilding(citizen, citizen.home, INVENTORY_MUSHROOM, CITIZEN_NEED_FOOD_AT_HOME);
                return;
            }
            if (citizen.foodPerCent < 0.5) {
                if (homeMushrooms && homeMushrooms.counter > 0) {
                    citizen.stateInfo.stack.push({ state: `go home to eat`, tags: new Set() });
                    citizenAddThought(citizen, `I will go home to eat ${INVENTORY_MUSHROOM}.`, state);
                    citizenMoveTo(citizen, citizen.home.position);
                    return;
                }
            }
        } else {
            const hasEnoughFoodInInventory = inventoryMushroom !== undefined && inventoryMushroom.counter >= CITIZEN_NEED_FOOD_IN_INVENTORY;
            if (hasEnoughFoodInInventory) {
                citizenAddThought(citizen, `I have enough food.`, state);
                citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_FOOD, state);
                return;
            }
        }
        let requiredAmount = CITIZEN_NEED_FOOD_IN_INVENTORY + 2;
        citizenSetThought(citizen, [`I am low on ${INVENTORY_MUSHROOM}.`], state);
        setCitizenStateGetItem(citizen, INVENTORY_MUSHROOM, requiredAmount, true, true);
        return;
    }
    if (citizen.stateInfo.stack.length > 0) {
        if (citizen.stateInfo.stack[0].state === `go home to eat`) {
            if (citizen.moveTo === undefined && !citizenIsThinking(citizen, state)) {
                if (citizen.home && isCitizenAtPosition(citizen, citizen.home.position)) {
                    const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM) as InventoryItemMushroom;
                    if (homeMushrooms && homeMushrooms.counter > 0) {
                        if (citizen.foodPerCent < 0.85) {
                            setCitizenStateEat(citizen, homeMushrooms, "home");
                            return;
                        }
                    } else {
                        citizenAddThought(citizen, `Where are the ${INVENTORY_MUSHROOM}? I thought i have some at home!`, state);
                    }
                }
                citizenMemorizeHomeInventory(citizen);
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        } else {
            CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state](citizen, state);
        }
    }
}
