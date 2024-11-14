import { ChatSimState } from "../chatSimModels.js";
import { Citizen } from "../citizen.js";
import { getTimeOfDay } from "../main.js";

export const CITIZEN_NEED_SLEEP = "need sleep";

export function loadCitizenNeedsFunctionsSleep(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_SLEEP] = {
        isFulfilled: isFulfilled,
        tick: tick,
    }
}

function tick(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.type !== CITIZEN_NEED_SLEEP) {
        citizen.stateInfo = {
            type: CITIZEN_NEED_SLEEP,
        }
    }
    const sleepDuration = 0.33;
    citizen.energyPerCent += 16 / state.timPerDay / sleepDuration;
    if (citizen.energyPerCent > 1) citizen.energyPerCent = 1;
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.energyPerCent < 0.1) return false;
    if (citizen.energyPerCent < 0.3 && citizen.stateInfo.type === CITIZEN_NEED_SLEEP) return false;
    if (citizen.energyPerCent > 0.99) return true;
    if (citizen.energyPerCent > 0.9 && citizen.stateInfo.type !== CITIZEN_NEED_SLEEP) return true;

    const time = getTimeOfDay(state);
    const goToBedTime = 0.9;
    const sleepDuration = 0.33;
    const wakeUpTime = (goToBedTime + sleepDuration) % 1;
    if (time > goToBedTime || time < wakeUpTime) return false;
    return true;
}

