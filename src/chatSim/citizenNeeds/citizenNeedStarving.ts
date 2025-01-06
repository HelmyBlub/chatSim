import { ChatSimState } from "../chatSimModels.js";
import { citizenAddThought, Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, citizenResetStateTo, citizenSetThought } from "../citizen.js";
import { CITIZEN_STATE_EAT, setCitizenStateEat } from "../citizenState/citizenStateEat.js";
import { setCitizenStateGetItem } from "../citizenState/citizenStateGetItem.js";
import { INVENTORY_MUSHROOM } from "../inventory.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { citizenNeedOnNeedFulfilled } from "./citizenNeed.js";

export const CITIZEN_NEED_STARVING = "need starving";

export const CITIZEN_STARVING_FOOD_PER_CENT = 0.2;
export function loadCitizenNeedsFunctionsStarving(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_STARVING] = {
        isFulfilled: isFulfilled,
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.foodPerCent < CITIZEN_STARVING_FOOD_PER_CENT) return false;
    return true;
}

export function citizenNeedTickStarving(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.foodPerCent < CITIZEN_STARVING_FOOD_PER_CENT) {
            const mushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
            if (mushrooms && mushrooms.counter > 0) {
                citizenSetThought(citizen, [`Start Eating.`], state);
                setCitizenStateEat(citizen, mushrooms, "inventory");
                return;
            }
            citizenSetThought(citizen, [`I am starving. I need to find food.`], state);
            setCitizenStateGetItem(citizen, INVENTORY_MUSHROOM, 1, true);
            return;
        } else {
            citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_STARVING, state);
            return;
        }
    }

    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        tickFunction(citizen, state);
    }
}
