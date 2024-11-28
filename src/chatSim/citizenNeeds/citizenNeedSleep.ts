import { ChatSimState } from "../chatSimModels.js";
import { Citizen, citizenResetStateTo, isCitizenThinking, setCitizenThought } from "../citizen.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { getTimeOfDay } from "../main.js";

export const CITIZEN_NEED_SLEEP = "need sleep";
export const CITIZEN_NEED_STATE_SLEEPING = "sleeping";

export function loadCitizenNeedsFunctionsSleep(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_SLEEP] = {
        isFulfilled: isFulfilled,
        tick: tick,
    }
}

function tick(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.type !== CITIZEN_NEED_SLEEP) {
        citizen.stateInfo.type = CITIZEN_NEED_SLEEP;
        citizen.stateInfo.stack = [];
    }
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.home && citizen.energyPerCent > 0.1) {
            citizen.stateInfo.stack.unshift({ state: "move home" });
            citizen.moveTo = {
                x: citizen.home.position.x,
                y: citizen.home.position.y,
            }
        } else {
            citizen.stateInfo.stack.unshift({ state: CITIZEN_NEED_STATE_SLEEPING });
            if (citizen.moveTo) citizen.moveTo = undefined;
        }
        return;
    }
    if (citizen.stateInfo.stack[0].state === "move home") {
        if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
            citizen.stateInfo.stack[0].state = CITIZEN_NEED_STATE_SLEEPING;
            citizen.paintBehindBuildings = true;
        }
    }

    if (citizen.stateInfo.stack[0].state === CITIZEN_NEED_STATE_SLEEPING) {
        const sleepDuration = 0.36;
        let sleepRegenerationFactor = 1;
        if (citizen.home && isCitizenAtPosition(citizen, citizen.home.position)) {
            sleepRegenerationFactor *= 1.2;
        }
        citizen.energyPerCent += 16 / state.timPerDay / sleepDuration * sleepRegenerationFactor;
        if (citizen.energyPerCent > 1) citizen.energyPerCent = 1;
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.energyPerCent < 0.1) {
        sleep(citizen, ["I am falling asleep."], state);
        return false;
    }
    if (citizen.energyPerCent < 0.3 && citizen.stateInfo.type === CITIZEN_NEED_SLEEP) return false;
    if (citizen.energyPerCent > 0.99) {
        return true;
    }
    if (citizen.energyPerCent > 0.9 && citizen.stateInfo.type !== CITIZEN_NEED_SLEEP) {
        return true;
    }

    const time = getTimeOfDay(state.time, state);
    const goToBedTime = 0.9;
    const sleepDuration = 0.33;
    const wakeUpTime = (goToBedTime + sleepDuration) % 1;
    if (time > goToBedTime || time < wakeUpTime) {
        sleep(citizen, [`It is dark outside and i want to sleep`], state);
        return false;
    }
    return true;
}

function sleep(citizen: Citizen, reason: string[], state: ChatSimState) {
    if (citizen.stateInfo.type === CITIZEN_NEED_SLEEP) return;
    citizenResetStateTo(citizen, CITIZEN_NEED_SLEEP);
    setCitizenThought(citizen, reason, state);
}

