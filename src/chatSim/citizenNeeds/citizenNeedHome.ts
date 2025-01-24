import { ChatSimState } from "../chatSimModels.js";
import { citizenAddThought, Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, citizenAddTodo, citizenResetStateTo, CITIZEN_STATE_TYPE_TICK_FUNCTIONS, citizenMoveTo } from "../citizen.js";
import { findBuilding, setCitizenStateGetBuilding, setCitizenStateRepairBuilding } from "../citizenState/citizenStateGetBuilding.js";
import { isCitizenInVisionDistance } from "../jobs/job.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { CITIZEN_NEEDS_FUNCTIONS, citizenNeedOnNeedFulfilled } from "./citizenNeed.js";

export const CITIZEN_NEED_HOME = "need home";

export function loadCitizenNeedsFunctionsHome() {
    CITIZEN_NEEDS_FUNCTIONS[CITIZEN_NEED_HOME] = {
        isFulfilled: isFulfilled,
    }
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_HOME] = citizenNeedTickHome;
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.home === undefined) return false;
    if (isCitizenInVisionDistance(citizen, citizen.home.position) && citizen.home.deterioration > 0.2) {
        if (citizen.home.deletedFromMap) {
            citizen.home = undefined;
            citizenAddThought(citizen, `My home disappeared.`, state);
            return false;
        } else {
            citizenAddTodo(citizen, citizen.home.deterioration * 0.8, CITIZEN_NEED_HOME, `I need to remember to repair my home.`, state);
        }
    }
    if (citizen.memory.home.lastTimeVisited === undefined) citizen.memory.home.lastTimeVisited = state.time;
    if (state.time - citizen.memory.home.lastTimeVisited > state.timPerDay * 2) {
        citizenAddTodo(citizen, 0.8, CITIZEN_NEED_HOME, `I have not been home in a long time. I should check it soon.`, state);
    }
    return true;
}

export function citizenNeedTickHome(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.home && citizen.home.deterioration <= 0.2) {
            citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_HOME, state);
            citizen.memory.home.lastTimeVisited = state.time;
            return;
        }
        if (!citizen.home) {
            const availableHouse = findBuilding(citizen, "House", state);
            if (availableHouse) {
                citizenAddThought(citizen, `I moved into a house from ${availableHouse.owner}`, state);
                availableHouse.inhabitedBy = citizen;
                citizen.home = availableHouse;
            } else {
                citizenAddThought(citizen, `I want a home.`, state);
                setCitizenStateGetBuilding(citizen, "House");
                return;
            }
        }
        if (citizen.home) {
            if (citizen.moveTo === undefined) {
                if (state.time - citizen.memory.home.lastTimeVisited! > state.timPerDay * 2 && !isCitizenInVisionDistance(citizen, citizen.home.position)) {
                    citizenAddThought(citizen, `I go check on my home, Has been a long time.`, state);
                    citizenMoveTo(citizen, citizen.home.position);
                    return;
                }

                if (citizen.home.deterioration > 0.2) {
                    if (citizen.home.deletedFromMap) {
                        citizen.home = undefined;
                        return;
                    }
                    citizenAddThought(citizen, `I need to repair my home.`, state);
                    setCitizenStateRepairBuilding(citizen, citizen.home);
                    return;
                }
            }
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

