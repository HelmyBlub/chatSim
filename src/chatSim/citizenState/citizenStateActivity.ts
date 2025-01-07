import { ChatSimState } from "../chatSimModels.js";
import { citizenGetVisionDistance, TAG_DOING_NOTHING } from "../citizen.js";
import { citizenAddLogEntry, citizenAddThought, Citizen, citizenStateStackTaskSuccess, citizenMoveTo } from "../citizen.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { nextRandom } from "../main.js";
import { mapIsPositionOutOfBounds } from "../map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";

type RandomMoveData = {
    lastSearchDirection?: number,
}

export const CITIZEN_STATE_DO_NOTHING_AT_HOME = "do nothing at home";
export const CITIZEN_STATE_WALKING_AROUND_RANDOMLY = "walking around randomly";

export function onLoadCitizenStateDefaultTickActivityFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_DO_NOTHING_AT_HOME] = tickCititzenStateDoNothingAtHome;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_WALKING_AROUND_RANDOMLY] = tickCititzenStateWalkingAroundRandomly;
}

export function setCitizenStateDoNothingAtHome(citizen: Citizen) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_DO_NOTHING_AT_HOME, tags: new Set([TAG_DOING_NOTHING]) });
}

export function setCitizenStateWalkingAroundRandomly(citizen: Citizen) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_WALKING_AROUND_RANDOMLY, tags: new Set(), data: {} });
}

function tickCititzenStateWalkingAroundRandomly(citizen: Citizen, state: ChatSimState) {
    if (!citizen.moveTo) {
        if (citizen.happinessData.happiness > 0.5) {
            citizenAddThought(citizen, "I feel happy again.", state);
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        const data = citizen.stateInfo.stack[0].data as RandomMoveData;
        let newSearchDirection;
        if (data.lastSearchDirection === undefined) {
            newSearchDirection = nextRandom(state.randomSeed) * Math.PI * 2;
        } else {
            newSearchDirection = data.lastSearchDirection + nextRandom(state.randomSeed) * Math.PI / 2 - Math.PI / 4;
        }
        const randomTurnIfOutOfBound = nextRandom(state.randomSeed) < 0.2 ? 0.3 : -0.3;
        const walkDistance = citizenGetVisionDistance(citizen, state) * 0.75;
        while (true) {
            const newMoveTo = {
                x: citizen.position.x + Math.cos(newSearchDirection) * walkDistance,
                y: citizen.position.y + Math.sin(newSearchDirection) * walkDistance,
            }
            if (mapIsPositionOutOfBounds(newMoveTo, state.map)) {
                newSearchDirection += randomTurnIfOutOfBound;
            } else {
                citizenMoveTo(citizen, newMoveTo);
                data.lastSearchDirection = newSearchDirection;
                return;
            }
        }
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
        } else {
            citizenAddLogEntry(citizen, `moving home`, state);
            citizenMoveTo(citizen, citizen.home.position);
            return;
        }
    }
}
