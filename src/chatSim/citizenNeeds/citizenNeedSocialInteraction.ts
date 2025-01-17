import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CITIZEN_STATE_TYPE_TICK_FUNCTIONS, citizenAddThought, citizenAddTodo } from "../citizen.js";
import { setCitizenStateTalkToSomebody } from "../citizenState/citizenStateActivity.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { CITIZEN_NEEDS_FUNCTIONS, citizenNeedOnNeedFulfilled } from "./citizenNeed.js";

export const CITIZEN_NEED_SCOIAL_INTERACTION = "need social interaction";

export function loadCitizenNeedsFunctionsSocialInteraction() {
    CITIZEN_NEEDS_FUNCTIONS[CITIZEN_NEED_SCOIAL_INTERACTION] = {
        isFulfilled: isFulfilled,
    }
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_SCOIAL_INTERACTION] = citizenNeedTickSocialInteraction;
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.happinessData.isExtrovert && citizen.happinessData.socialBattery < 0.5) {
        citizenAddTodo(citizen, Math.abs(citizen.happinessData.socialBattery) * 0.7, CITIZEN_NEED_SCOIAL_INTERACTION, `I want to have some social interaction soon.`, state);
    }
    return true;
}

export function citizenNeedTickSocialInteraction(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.happinessData.socialBattery < 0.5) {
            citizenAddThought(citizen, `I need some social interaction.`, state);
            setCitizenStateTalkToSomebody(citizen);
            return;
        } else {
            citizenAddThought(citizen, `I feel better.`, state);
            citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_SCOIAL_INTERACTION, state);
            return;
        }
    }
    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        tickFunction(citizen, state);
    }
}
