import { ChatSimState } from "../chatSimModels.js";
import { Citizen, citizenAddTodo, citizenSetThought } from "../citizen.js";
import { setCitizenStateDoNothingAtHome } from "../citizenState/citizenStateActivity.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { citizenNeedOnNeedFulfilled } from "./citizenNeed.js";

export const CITIZEN_NEED_HAPPINESS = "need happiness";

export const CITIZEN_DO_LEISURE_AT_HAPPINESS_PER_CENT = -0.5;
export function loadCitizenNeedsFunctionsHappiness(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_HAPPINESS] = {
        isFulfilled: isFulfilled,
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.happinessData.happiness < CITIZEN_DO_LEISURE_AT_HAPPINESS_PER_CENT) {
        citizenAddTodo(citizen, Math.abs(citizen.happinessData.happiness) * 0.5, CITIZEN_NEED_HAPPINESS, `I should do something which makes me happy soon.`, state);
    }
    return true;
}

export function citizenNeedTickHappiness(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.happinessData.happiness < CITIZEN_DO_LEISURE_AT_HAPPINESS_PER_CENT) {
            citizenSetThought(citizen, [`I am too unhappy. I need to do something.`], state);
            // TODO: find a activity which makes citizen happy
            setCitizenStateDoNothingAtHome(citizen);
            return;
        } else {
            citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_HAPPINESS, state);
            return;
        }
    }

    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        tickFunction(citizen, state);
    }
}
