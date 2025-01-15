import { ChatSimState } from "../chatSimModels.js";
import { citizenMoveToRandom, citizenStopMoving, TAG_DOING_NOTHING } from "../citizen.js";
import { citizenAddLogEntry, citizenAddThought, Citizen, citizenStateStackTaskSuccess, citizenMoveTo } from "../citizen.js";
import { isCitizenAtPosition, isCitizenInInteractionDistance, isCitizenInVisionDistance } from "../jobs/job.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateSmallTalk } from "./citizenStateSmallTalk.js";

type RandomMoveData = {
    lastSearchDirection?: number,
    startTime: number,
}

type TalkToSomebodyData = {
    lastSearchDirection?: number,
    citizenInVisionDistance?: Citizen,
    talkStarted?: boolean,
}

export const CITIZEN_STATE_DO_NOTHING_AT_HOME = "do nothing at home";
export const CITIZEN_STATE_WALKING_AROUND_RANDOMLY = "walking around randomly";
export const CITIZEN_STATE_TALK_TO_SOMEBODY = "talk to somebody";

export function onLoadCitizenStateDefaultTickActivityFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_DO_NOTHING_AT_HOME] = tickCititzenStateDoNothingAtHome;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_WALKING_AROUND_RANDOMLY] = tickCititzenStateWalkingAroundRandomly;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_TALK_TO_SOMEBODY] = tickCititzenStateTalkToSomebody;
}

export function setCitizenStateDoNothingAtHome(citizen: Citizen, state: ChatSimState) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_DO_NOTHING_AT_HOME, data: state.time, tags: new Set([TAG_DOING_NOTHING]) });
}

export function setCitizenStateWalkingAroundRandomly(citizen: Citizen, state: ChatSimState) {
    const data: RandomMoveData = { startTime: state.time };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_WALKING_AROUND_RANDOMLY, data: data, tags: new Set() });
}

export function setCitizenStateTalkToSomebody(citizen: Citizen) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_TALK_TO_SOMEBODY, tags: new Set(), data: {} });
}

function tickCititzenStateTalkToSomebody(citizen: Citizen, state: ChatSimState) {
    if (!citizen.moveTo) {
        const data = citizen.stateInfo.stack[0].data as TalkToSomebodyData;
        if (data.talkStarted) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (!data.citizenInVisionDistance) {
            data.citizenInVisionDistance = state.map.citizens.find(c => c !== citizen && isCitizenInVisionDistance(citizen, c.position));
        }
        if (data.citizenInVisionDistance) {
            data.talkStarted = true;
            setCitizenStateSmallTalk(citizen, citizen, data.citizenInVisionDistance);
            return;
        } else {
            data.lastSearchDirection = citizenMoveToRandom(citizen, state, data.lastSearchDirection);
        }
    }
}

function tickCititzenStateWalkingAroundRandomly(citizen: Citizen, state: ChatSimState) {
    if (!citizen.moveTo) {
        if (citizen.happinessData.happiness > 0.5) {
            citizenAddThought(citizen, "I feel happy again.", state);
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        const data = citizen.stateInfo.stack[0].data as RandomMoveData;
        const timepassed = state.time - data.startTime;
        if (timepassed > state.timPerDay / 4) {
            citizenAddThought(citizen, "I walked around enough.", state);
            citizenStateStackTaskSuccess(citizen);
            return;
        }

        data.lastSearchDirection = citizenMoveToRandom(citizen, state, data.lastSearchDirection);
    }
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
            const timepassed = state.time - citizen.stateInfo.stack[0].data;
            if (timepassed > state.timPerDay / 4) {
                citizenAddThought(citizen, "I did enough doing nothing.", state);
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
