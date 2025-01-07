import { ChatSimState } from "../chatSimModels.js";
import { TAG_DOING_NOTHING } from "../citizen.js";
import { citizenAddLogEntry, citizenAddThought, Citizen, citizenStateStackTaskSuccess, citizenMoveTo } from "../citizen.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";

export const CITIZEN_STATE_DO_NOTHING_AT_HOME = "do nothing at home";

export function onLoadCitizenStateDefaultTickActivityFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_DO_NOTHING_AT_HOME] = tickCititzenStateDoNothingAtHome;
}

export function setCitizenStateDoNothingAtHome(citizen: Citizen) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_DO_NOTHING_AT_HOME, tags: [TAG_DOING_NOTHING] });
}

function tickCititzenStateDoNothingAtHome(citizen: Citizen, state: ChatSimState) {
    if (!citizen.home) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }

    if (!citizen.moveTo) {
        if (isCitizenAtPosition(citizen, citizen.home.position)) {
            if (citizen.happinessData.happiness > 0.5) {
                citizenAddThought(citizen, "I feel happy again.", state);
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        } else {
            citizenAddLogEntry(citizen, `moving home`, state);
            citizenMoveTo(citizen, citizen.home.position);
            return;
        }
    }
}
