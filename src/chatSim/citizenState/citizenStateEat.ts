import { ChatSimState } from "../chatSimModels.js";
import { citizenAddLogEntry, Citizen, citizenStateStackTaskSuccess, citizenStopMoving, citizenMemorizeHomeInventory, TAG_EATING, citizenGetHappinessByTagChangeAmount } from "../map/citizen.js";
import { InventoryItem, InventoryItemMushroom } from "../inventory.js";
import { INVENTORY_MUSHROOM } from "../inventory.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { DIRECTION_DOWN } from "../main.js";

export type CitizenStateEatData = {
    inventoryFood: InventoryItemMushroom,
    inventoryName: string,
    eatAmountLeft?: number,
    tempStartTime?: number,
}
export const CITIZEN_STATE_EAT = "Eat";

export function onLoadCitizenStateDefaultTickEatFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_EAT] = tickCitizenStateEat;
}

export function citizenIsEating(citizen: Citizen): boolean {
    return citizen.stateInfo.stack.length > 0 && citizen.stateInfo.stack[0].state === CITIZEN_STATE_EAT;
}

export function setCitizenStateEat(citizen: Citizen, inventoryFood: InventoryItemMushroom, inventoryName: string, eatAmount?: number) {
    const data: CitizenStateEatData = { inventoryFood: inventoryFood, inventoryName: inventoryName, eatAmountLeft: eatAmount };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_EAT, data: data, tags: new Set() });
}

function tickCitizenStateEat(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const data = citizenState.data as CitizenStateEatData;

    if (data.inventoryFood.counter <= 0 || (!data.eatAmountLeft && citizen.foodPerCent > 0.85)) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (data.tempStartTime === undefined) data.tempStartTime = state.time;
    citizen.direction = DIRECTION_DOWN;
    if (citizen.moveTo) citizenStopMoving(citizen);
    const eatDuration = 1000;
    if (data.tempStartTime + eatDuration < state.time) {
        const foodValue = data.inventoryFood.data.shift()!;
        let newFoodPerCent = citizen.foodPerCent + foodValue;
        if (newFoodPerCent > 1) {
            let fatGain = newFoodPerCent % 1;
            if (citizen.fatness > 1) {
                fatGain /= 1 + (citizen.fatness - 1) / 3;
            }
            citizen.fatness += fatGain;
            newFoodPerCent = 1;
        }
        if (citizen.happinessData.happinessTagFactors.has(TAG_EATING)) {
            let changeValue = citizenGetHappinessByTagChangeAmount(citizen, TAG_EATING, true);
            citizen.happinessData.happiness += changeValue;
        } else if (citizen.happinessData.unhappinessTagFactors.has(TAG_EATING)) {
            let changeValue = citizenGetHappinessByTagChangeAmount(citizen, TAG_EATING, false) * 0.5;
            citizen.happinessData.happiness -= changeValue;
        }
        citizen.foodPerCent = newFoodPerCent;
        data.inventoryFood.counter--;
        data.tempStartTime = state.time;
        if (data.eatAmountLeft && data.eatAmountLeft > 0) data.eatAmountLeft--;
        citizenAddLogEntry(citizen, `eat ${INVENTORY_MUSHROOM} from ${data.inventoryName}, ${data.inventoryFood.counter}x${INVENTORY_MUSHROOM} left`, state);
    }
}
