import { ChatSimState } from "../chatSimModels.js";
import { Citizen, citizenResetStateTo, setCitizenThought } from "../citizen.js";
import { CITIZEN_STATE_EAT, setCitizenStateEat } from "../citizenState/citizenStateEat.js";
import { setCitizenStateGetItem } from "../citizenState/citizenStateGetItem.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";

export const CITIZEN_NEED_STARVING = "need starving";

export const CITIZEN_STARVING_FOOD_PER_CENT = 0.2;
export function loadCitizenNeedsFunctionsStarving(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_STARVING] = {
        isFulfilled: isFulfilled,
        tick: tick,
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.foodPerCent < CITIZEN_STARVING_FOOD_PER_CENT) return false;
    return true;
}

function tick(citizen: Citizen, state: ChatSimState) {
    const mushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    if (citizen.foodPerCent < CITIZEN_STARVING_FOOD_PER_CENT) {
        if (mushrooms && mushrooms.counter > 0) {
            if (citizen.stateInfo.stack.length === 0 || citizen.stateInfo.stack[0].state !== CITIZEN_STATE_EAT) {
                setCitizenStateEat(citizen, mushrooms, "inventory");
                return;
            }
        }
    }

    if (citizen.stateInfo.type !== CITIZEN_NEED_STARVING || citizen.stateInfo.stack.length === 0) {
        citizenResetStateTo(citizen, CITIZEN_NEED_STARVING);
        setCitizenThought(citizen, [`I am starving. I need to find food.`], state);
        setCitizenStateGetItem(citizen, INVENTORY_MUSHROOM, 1, true);
    }

    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        tickFunction(citizen, state);
    }
}
