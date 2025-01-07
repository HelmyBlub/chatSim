import { ChatSimState } from "../chatSimModels.js";
import { Citizen, citizenAddThought, citizenAddTodo, citizenSetThought, TAG_AT_HOME, TAG_DOING_NOTHING, TAG_OUTSIDE, TAG_PHYSICALLY_ACTIVE, TAG_WALKING_AROUND } from "../citizen.js";
import { setCitizenStateDoNothingAtHome, setCitizenStateWalkingAroundRandomly } from "../citizenState/citizenStateActivity.js";
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
        citizenAddTodo(citizen, Math.abs(citizen.happinessData.happiness) * 0.8, CITIZEN_NEED_HAPPINESS, `I should do something which makes me happy soon.`, state);
    }
    return true;
}

export function citizenNeedTickHappiness(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.happinessData.happiness < CITIZEN_DO_LEISURE_AT_HAPPINESS_PER_CENT) {
            citizenAddThought(citizen, `I am too unhappy. I need to do something.`, state);
            // TODO: find a activity which makes citizen happy
            if (citizen.happinessData.happinessTagFactors.has(TAG_AT_HOME)
                || citizen.happinessData.happinessTagFactors.has(TAG_DOING_NOTHING)
            ) {
                citizenAddThought(citizen, `I like to do nothing at home.`, state);
                setCitizenStateDoNothingAtHome(citizen);
                return;
            }
            if (citizen.happinessData.happinessTagFactors.has(TAG_WALKING_AROUND)
                || citizen.happinessData.happinessTagFactors.has(TAG_OUTSIDE)
                || citizen.happinessData.happinessTagFactors.has(TAG_PHYSICALLY_ACTIVE)
            ) {
                citizenAddThought(citizen, `I like walk around a bit.`, state);
                setCitizenStateWalkingAroundRandomly(citizen);
                return;
            }
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
