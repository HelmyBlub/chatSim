import { ChatSimState } from "../chatSimModels.js";
import { citizenAddThought, Citizen, citizenAddTodo, citizenIsThinking, citizenStopMoving, citizenMoveTo, CITIZEN_STATE_TYPE_TICK_FUNCTIONS } from "../map/citizen.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { calculateDistance, getTimeOfDay } from "../main.js";
import { playChatSimSound, SOUND_PATH_SNORE } from "../sounds.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { CITIZEN_NEEDS_FUNCTIONS, citizenNeedOnNeedFulfilled } from "./citizenNeed.js";

export const CITIZEN_NEED_SLEEP = "need sleep";
export const CITIZEN_NEED_STATE_SLEEPING = "sleeping";

export function loadCitizenNeedsFunctionsSleep() {
    CITIZEN_NEEDS_FUNCTIONS[CITIZEN_NEED_SLEEP] = {
        isFulfilled: isFulfilled,
    }
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_SLEEP] = citizenNeedTickSleep;
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.energyPerCent < 0.1 || citizenIsGoingToSleep(citizen)) return false;
    if (citizen.energyPerCent > 0.85) return true;

    const time = getTimeOfDay(state.time, state);
    const goToBedTime = citizen.goToBedTime;
    const sleepDuration = citizen.sleepDuration;
    const wakeUpTime = (goToBedTime + sleepDuration) % 1;
    if ((goToBedTime > wakeUpTime && (time > goToBedTime || time < wakeUpTime))
        || (goToBedTime < wakeUpTime && (time > goToBedTime && time < wakeUpTime))) {
        citizenAddTodo(citizen, 1 - citizen.energyPerCent, CITIZEN_NEED_SLEEP, `I want to sleep soon.`, state);
    }
    return true;
}

export function citizenIsSleeping(citizen: Citizen): boolean {
    if (citizen.stateInfo.type === CITIZEN_NEED_SLEEP
        && citizen.stateInfo.stack.length > 0
        && citizen.stateInfo.stack[0].state === CITIZEN_NEED_STATE_SLEEPING
    ) {
        return true;
    }
    return false;
}

export function citizenIsGoingToSleep(citizen: Citizen): boolean {
    if (citizen.stateInfo.type === CITIZEN_NEED_SLEEP) {
        return true;
    }
    return false;
}

export function citizenNeedTickSleep(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.home && citizen.energyPerCent > 0.1) {
            const homeDistance = calculateDistance(citizen.position, citizen.home.position);
            if (homeDistance < 1000) {
                citizenAddThought(citizen, `I am tired. I go home to sleep.`, state);
                citizen.stateInfo.stack.unshift({ state: "move home", tags: new Set() });
                citizenMoveTo(citizen, citizen.home.position);
            } else {
                citizenAddThought(citizen, `I am tired. I am to far away from home. I sleep here.`, state);
                citizen.stateInfo.stack.unshift({ state: CITIZEN_NEED_STATE_SLEEPING, tags: new Set() });
                if (citizen.moveTo) citizenStopMoving(citizen);
            }
        } else {
            citizen.stateInfo.stack.unshift({ state: CITIZEN_NEED_STATE_SLEEPING, tags: new Set() });
            citizenAddThought(citizen, `I am falling asleep.`, state);
            if (citizen.moveTo) citizenStopMoving(citizen);
        }
        return;
    }
    if (citizen.stateInfo.stack[0].state === "move home") {
        if (citizen.moveTo === undefined && !citizenIsThinking(citizen, state)) {
            citizenAddThought(citizen, `I am falling asleep.`, state);
            citizen.stateInfo.stack[0].state = CITIZEN_NEED_STATE_SLEEPING;
            citizen.paintData.paintBehindBuildings = true;
        }
    }

    if (citizen.stateInfo.stack[0].state === CITIZEN_NEED_STATE_SLEEPING) {
        const sleepDuration = citizen.sleepDuration;
        let sleepRegenerationFactor = 1;
        if (citizen.home && isCitizenAtPosition(citizen, citizen.home.position)) {
            sleepRegenerationFactor *= 1.2;
        }
        const divider = 200 * Math.PI * 2;
        const animationPerCent = (state.time / divider) % 1;
        const animationDuration1Tick = state.tickInterval / divider;
        if (animationPerCent < animationDuration1Tick) {
            playChatSimSound(SOUND_PATH_SNORE, citizen.position, state, 1, 75);
        }
        citizen.energyPerCent += 16 / state.timPerDay / sleepDuration * sleepRegenerationFactor;
        if (citizen.energyPerCent > 1) {
            citizen.energyPerCent = 1;
            citizenAddThought(citizen, `Waking up.`, state);
            citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_SLEEP, state);
            return;
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
