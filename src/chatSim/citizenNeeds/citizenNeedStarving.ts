import { ChatSimState } from "../chatSimModels.js";
import { Citizen, setCitizenThought } from "../citizen.js";
import { CITIZEN_STATE_GET_ITEM, setCitizenStateGetItem, tickCititzenStateGetItem } from "../jobs/citizenStateGetItem.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { citizenEatMushroom } from "./citizenNeedFood.js";

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
        citizen.stateInfo = {
            type: CITIZEN_NEED_STARVING,
            stack: [],
        }
        setCitizenThought(citizen, [
            `I am starving. I need to find food.`
        ], state);
        setCitizenStateGetItem(citizen, INVENTORY_MUSHROOM, 1, true);
    }

    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        tickFunction(citizen, state);
    }
}
