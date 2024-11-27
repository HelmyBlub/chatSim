import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, addCitizenThought, Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, citizenResetStateTo } from "../citizen.js";
import { setCitizenStateGetBuilding, setCitizenStateRepairBuilding } from "../jobs/citizenStateGetBuilding.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";

export const CITIZEN_NEED_HOME = "need home";

export function loadCitizenNeedsFunctionsHome(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_HOME] = {
        isFulfilled: isFulfilled,
        tick: tick,
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.home === undefined) return false;
    if (citizen.home.deterioration > 0.2) return false;
    return true;
}

function tick(citizen: Citizen, state: ChatSimState) {
    if (!citizen.home) {
        if (citizen.stateInfo.type !== CITIZEN_NEED_HOME) {
            const availableHouse = state.map.buildings.find(h => h.inhabitedBy === undefined && h.buildProgress === undefined && h.type === "House");
            if (availableHouse) {
                addCitizenThought(citizen, `I moved into a house from ${availableHouse.owner}`, state);
                availableHouse.inhabitedBy = citizen;
                citizen.home = availableHouse;
            } else {
                citizenResetStateTo(citizen, CITIZEN_NEED_HOME);
                addCitizenThought(citizen, `I want a home.`, state);
                setCitizenStateGetBuilding(citizen, "House");
            }
        }
    } else {
        if (citizen.home.deterioration > 1) {
            citizen.home = undefined;
            return;
        }
    }
    if (citizen.home && citizen.home.deterioration > 0.2) {
        if (citizen.stateInfo.type !== CITIZEN_NEED_HOME || citizen.stateInfo.stack.length === 0) {
            if (citizen.stateInfo.type !== CITIZEN_NEED_HOME) citizenResetStateTo(citizen, CITIZEN_NEED_HOME);
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

