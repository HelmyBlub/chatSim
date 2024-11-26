import { ChatSimState } from "../chatSimModels.js";
import { Citizen, addCitizenLogEntry, CITIZEN_STATE_TYPE_WORKING_JOB, isCitizenThinking, setCitizenThought } from "../citizen.js";
import { InventoryItem } from "../inventory.js";
import { setCitizenStateGetItem, setCitizenStateTransportItemToBuilding } from "../jobs/citizenStateGetItem.js";
import { isCitizenInInteractDistance } from "../jobs/job.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
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
    if (citizen.stateInfo.type !== CITIZEN_NEED_FOOD || citizen.stateInfo.stack.length === 0) {
        if (citizen.home) {
            const inventoryMushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
            if (inventoryMushrooms && inventoryMushrooms.counter >= CITIZEN_FOOD_AT_HOME_NEED) {
                citizen.stateInfo = { type: CITIZEN_NEED_FOOD, stack: [] };
                setCitizenThought(citizen, [
                    `I have enough ${INVENTORY_MUSHROOM}.`,
                    `I will store them at home.`
                ], state);
                setCitizenStateTransportItemToBuilding(citizen, citizen.home, INVENTORY_MUSHROOM, CITIZEN_FOOD_AT_HOME_NEED);
                return;
            }
            if (citizen.foodPerCent < 0.5) {
                const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (homeMushrooms && homeMushrooms.counter > 0) {
                    citizen.stateInfo = {
                        type: CITIZEN_NEED_FOOD,
                        stack: [{ state: `go home to eat` }],
                    }
                    setCitizenThought(citizen, [
                        `I am hungry.`,
                        `I will go home to eat ${INVENTORY_MUSHROOM}.`,
                    ], state);
                    citizen.moveTo = {
                        x: citizen.home.position.x,
                        y: citizen.home.position.y,
                    }
                    return;
                }
            }
        }
        let requiredAmount = CITIZEN_FOOD_IN_INVENTORY_NEED;
        const needData = getCitizenNeedData(CITIZEN_NEED_FOOD, citizen, state) as CitizenNeedFood;
        if (needData.gatherMoreFood) requiredAmount += 2;
        citizen.stateInfo = { type: CITIZEN_NEED_FOOD, stack: [] };
        setCitizenThought(citizen, [`I am low on ${INVENTORY_MUSHROOM}.`], state);
        setCitizenStateGetItem(citizen, INVENTORY_MUSHROOM, requiredAmount, true, true);
        return;
    } else if (citizen.stateInfo.stack.length > 0) {
        if (citizen.stateInfo.stack[0].state === `go home to eat`) {
            if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
                if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
                    const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                    if (homeMushrooms) {
                        while (citizen.foodPerCent < 1 - MUSHROOM_FOOD_VALUE && homeMushrooms.counter > 0) {
                            citizenEatMushroom(citizen, homeMushrooms, state, "home");
                        }
                    }
                }
                citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB, stack: [] };
                return;
            }
        } else {
            CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state](citizen, state);
        }
    }
}
