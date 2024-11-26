import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen } from "../citizen.js";
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
                addCitizenLogEntry(citizen, `moved into a house from ${availableHouse.owner}`, state);
                availableHouse.inhabitedBy = citizen;
                citizen.home = availableHouse;
            } else {
                addCitizenLogEntry(citizen, `I want a home.`, state);
                citizen.stateInfo = { type: CITIZEN_NEED_HOME, stack: [] };
                setCitizenStateGetBuilding(citizen, "House");
            }
        }
    }
    if (citizen.home && citizen.home.deterioration > 0.2) {
        if (citizen.stateInfo.type !== CITIZEN_NEED_HOME || citizen.stateInfo.stack.length === 0) {
            citizen.stateInfo = { type: CITIZEN_NEED_HOME, stack: [] };
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

