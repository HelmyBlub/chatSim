import { ChatSimState } from "../chatSimModels.js";
import { citizenAddLogEntry, Citizen, citizenStateStackTaskSuccess, citizenStopMoving, citizenMemorizeHomeInventory } from "../map/citizen.js";
import { MUSHROOM_FOOD_VALUE } from "../citizenNeeds/citizenNeedFood.js";
import { InventoryItem } from "../inventory.js";
import { INVENTORY_MUSHROOM } from "../inventory.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";

export type CitizenStateEatData = {
    inventoryFood: InventoryItem,
    inventoryName: string,
    tempStartTime?: number,
}
export const CITIZEN_STATE_EAT = "Eat";

export function onLoadCitizenStateDefaultTickEatFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_EAT] = tickCitizenStateEat;
}

export function setCitizenStateEat(citizen: Citizen, inventoryFood: InventoryItem, inventoryName: string) {
    const data: CitizenStateEatData = { inventoryFood: inventoryFood, inventoryName: inventoryName };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_EAT, data: data, tags: new Set() });
}

function tickCitizenStateEat(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const data = citizenState.data as CitizenStateEatData;

    if (data.inventoryFood.counter <= 0 || citizen.foodPerCent > 1 - MUSHROOM_FOOD_VALUE) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (data.tempStartTime === undefined) data.tempStartTime = state.time;
    if (citizen.moveTo) citizenStopMoving(citizen);
    const eatDuration = 1000;
    if (data.tempStartTime + eatDuration < state.time) {
        citizen.foodPerCent = Math.min(citizen.foodPerCent + MUSHROOM_FOOD_VALUE, 1);
        data.inventoryFood.counter--;
        data.tempStartTime = state.time;
        citizenAddLogEntry(citizen, `eat ${INVENTORY_MUSHROOM} from ${data.inventoryName}, ${data.inventoryFood.counter}x${INVENTORY_MUSHROOM} left`, state);
    }
}
