import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CITIZEN_STATE_TYPE_WORKING_JOB } from "../citizen.js";
import { isCitizenInInteractDistance } from "../jobs/job.js";
import { calculateDistance, getTimeOfDay } from "../main.js";

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
        if (citizen.home && citizen.energyPerCent > 0.1) {
            citizen.stateInfo.state = "move home";
            citizen.moveTo = {
                x: citizen.home.position.x,
                y: citizen.home.position.y,
            }
        } else {
            citizen.stateInfo.state = "sleeping";
            if (citizen.moveTo) citizen.moveTo = undefined;
        }
    }
    if (citizen.stateInfo.state === "move home") {
        if (citizen.moveTo === undefined) {
            citizen.stateInfo.state = "sleeping";
        }
    }

    if (citizen.stateInfo.state === "sleeping") {
        const sleepDuration = 0.36;
        let sleepRegenerationFactor = 1;
        if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
            sleepRegenerationFactor *= 1.2;
        }
        citizen.energyPerCent += 16 / state.timPerDay / sleepDuration * sleepRegenerationFactor;
        if (citizen.energyPerCent > 1) citizen.energyPerCent = 1;
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.energyPerCent < 0.1) return false;
    if (citizen.energyPerCent < 0.3 && citizen.stateInfo.type === CITIZEN_NEED_SLEEP) return false;
    if (citizen.energyPerCent > 0.99) {
        return noSleep(citizen);
    }
    if (citizen.energyPerCent > 0.9 && citizen.stateInfo.type !== CITIZEN_NEED_SLEEP) {
        if (citizen.stateInfo.type === CITIZEN_NEED_SLEEP) {
            citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
        }
        return noSleep(citizen);
    }

    const time = getTimeOfDay(state);
    const goToBedTime = 0.9;
    const sleepDuration = 0.33;
    const wakeUpTime = (goToBedTime + sleepDuration) % 1;
    if (time > goToBedTime || time < wakeUpTime) return false;
    return noSleep(citizen);
}

function noSleep(citizen: Citizen): boolean {
    if (citizen.stateInfo.type === CITIZEN_NEED_SLEEP) {
        citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
    }
    return true;
}
