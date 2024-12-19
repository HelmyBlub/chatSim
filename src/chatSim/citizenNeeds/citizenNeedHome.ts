import { ChatSimState } from "../chatSimModels.js";
import { addCitizenThought, Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, citizenAddTodo, citizenResetStateTo } from "../citizen.js";
import { findBuilding, setCitizenStateGetBuilding, setCitizenStateRepairBuilding } from "../citizenState/citizenStateGetBuilding.js";
import { isCitizenInVisionDistance } from "../jobs/job.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { citizenNeedOnNeedFulfilled } from "./citizenNeed.js";

export const CITIZEN_NEED_HOME = "need home";

export function loadCitizenNeedsFunctionsHome(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_HOME] = {
        isFulfilled: isFulfilled,
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.home === undefined) return false;
    if (isCitizenInVisionDistance(citizen, citizen.home.position) && citizen.home.deterioration > 0.2) {
        if (citizen.home.deletedFromMap) {
            citizen.home = undefined;
            addCitizenThought(citizen, `My home disappeared.`, state);
            return false;
        } else {
            citizenAddTodo(citizen, citizen.home.deterioration * 0.8, CITIZEN_NEED_HOME, `I need to remember to repair my home.`, state);
        }
    }
    return true;
}

export function citizenNeedTickHome(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.home && citizen.home.deterioration <= 0.2) {
            citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_HOME, state);
            return;
        }
        if (!citizen.home) {
            const availableHouse = findBuilding(citizen, "House", state);
            if (availableHouse) {
                addCitizenThought(citizen, `I moved into a house from ${availableHouse.owner}`, state);
                availableHouse.inhabitedBy = citizen;
                citizen.home = availableHouse;
            } else {
                addCitizenThought(citizen, `I want a home.`, state);
                setCitizenStateGetBuilding(citizen, "House");
            }
        }
        if (citizen.home && citizen.home.deterioration > 0.2) {
            if (citizen.home.deletedFromMap) {
                citizen.home = undefined;
                return;
            }
            addCitizenThought(citizen, `I need to repair my home.`, state);
            setCitizenStateRepairBuilding(citizen, citizen.home);
        }
    }
    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        if (tickFunction) {
            tickFunction(citizen, state);
            return;
        }
    }
}

