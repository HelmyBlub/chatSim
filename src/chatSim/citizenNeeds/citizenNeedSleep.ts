import { ChatSimState } from "../chatSimModels.js";
import { addCitizenThought, Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, citizenResetStateTo, isCitizenThinking, setCitizenThought } from "../citizen.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { calculateDistance, getTimeOfDay } from "../main.js";
import { playChatSimSound, SOUND_PATH_SNORE } from "../sounds.js";
import { citizenNeedOnNeedFulfilled } from "./citizenNeed.js";

export const CITIZEN_NEED_SLEEP = "need sleep";
export const CITIZEN_NEED_STATE_SLEEPING = "sleeping";

export function loadCitizenNeedsFunctionsSleep(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_SLEEP] = {
        isFulfilled: isFulfilled,
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.energyPerCent < 0.1) return false;
    if (citizen.energyPerCent > 0.85) return true;

    const time = getTimeOfDay(state.time, state);
    const goToBedTime = citizen.goToBedTime;
    const sleepDuration = citizen.sleepDuration;
    const wakeUpTime = (goToBedTime + sleepDuration) % 1;
    if ((goToBedTime > wakeUpTime && (time > goToBedTime || time < wakeUpTime))
        || (goToBedTime < wakeUpTime && (time > goToBedTime && time < wakeUpTime))) {
        return false;
    }
    return true;
}

export function citizenNeedTickSleep(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.home && citizen.energyPerCent > 0.1) {
            const homeDistance = calculateDistance(citizen.position, citizen.home.position);
            if (homeDistance < 1000) {
                addCitizenThought(citizen, `I am tired. I go home to sleep.`, state);
                citizen.stateInfo.stack.unshift({ state: "move home" });
                citizen.moveTo = {
                    x: citizen.home.position.x,
                    y: citizen.home.position.y,
                }
            } else {
                addCitizenThought(citizen, `I am tired. I am to far away from home. I sleep here.`, state);
                citizen.stateInfo.stack.unshift({ state: CITIZEN_NEED_STATE_SLEEPING });
                if (citizen.moveTo) citizen.moveTo = undefined;
            }
        } else {
            citizen.stateInfo.stack.unshift({ state: CITIZEN_NEED_STATE_SLEEPING });
            addCitizenThought(citizen, `I am falling asleep.`, state);
            if (citizen.moveTo) citizen.moveTo = undefined;
        }
        return;
    }
    if (citizen.stateInfo.stack[0].state === "move home") {
        if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
            addCitizenThought(citizen, `I am falling asleep.`, state);
            citizen.stateInfo.stack[0].state = CITIZEN_NEED_STATE_SLEEPING;
            citizen.paintBehindBuildings = true;
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
            addCitizenThought(citizen, `Waking up.`, state);
            citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_SLEEP, state);
            return;
        }
    }
}
