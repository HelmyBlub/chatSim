import { ChatSimState } from "../chatSimModels.js";
import { addCitizenThought, Citizen, CITIZEN_STATE_TYPE_WORKING_JOB } from "../citizen.js";
import { CITIZEN_NEED_FOOD, loadCitizenNeedsFunctionsFood } from "./citizenNeedFood.js";
import { CITIZEN_NEED_HOME, loadCitizenNeedsFunctionsHome } from "./citizenNeedHome.js";
import { CITIZEN_NEED_SLEEP, loadCitizenNeedsFunctionsSleep } from "./citizenNeedSleep.js";
import { CITIZEN_NEED_STARVING, loadCitizenNeedsFunctionsStarving } from "./citizenNeedStarving.js";

export type CitizenNeedFunctions = {
    isFulfilled(citizen: Citizen, state: ChatSimState): boolean,
    tick(citizen: Citizen, state: ChatSimState): void,
    createDefaultData?(): any,
}

export type CitizenNeedsFunctions = { [key: string]: CitizenNeedFunctions };

const NEED_ORDER: string[] = [];

export function loadCitizenNeedsFunctions(state: ChatSimState) {
    NEED_ORDER.push(CITIZEN_NEED_STARVING, CITIZEN_NEED_SLEEP, CITIZEN_NEED_FOOD, CITIZEN_NEED_HOME);
    loadCitizenNeedsFunctionsStarving(state);
    loadCitizenNeedsFunctionsFood(state);
    loadCitizenNeedsFunctionsHome(state);
    loadCitizenNeedsFunctionsSleep(state);
}

export function tickCitizenNeeds(citizen: Citizen, state: ChatSimState) {
    const isTimeToCheckAllNeeds = citizen.needs.nextCompleteNeedCheckStartTime === undefined || citizen.needs.nextCompleteNeedCheckStartTime <= state.time;
    if (isTimeToCheckAllNeeds) {
        checkAllNeeds(citizen, state);
    } else {
        const hasToTickFailingNeed = citizen.needs.lastFailingNeed !== undefined && citizen.stateInfo.type === citizen.needs.lastFailingNeed;
        if (hasToTickFailingNeed) {
            const needFunctions = state.functionsCitizenNeeds[citizen.needs.lastFailingNeed!];
            needFunctions.tick(citizen, state);
        }
    }
}
export function getCitizenNeedData(need: string, citizen: Citizen, state: ChatSimState) {
    let needData = citizen.needs.needsData[need];
    if (!needData) {
        const needFunctions = state.functionsCitizenNeeds[need];
        if (needFunctions && needFunctions.createDefaultData) {
            needData = needFunctions.createDefaultData();
            citizen.needs.needsData[need] = needData;
        }
    }
    return needData;
}

export function citizenNeedFailingNeedFulfilled(citizen: Citizen, state: ChatSimState) {
    if (citizen.needs.lastFailingNeed === undefined) return;
    const startingNeedOrderIndex = NEED_ORDER.findIndex(n => n === citizen.needs.lastFailingNeed) + 1;
    citizen.needs.lastFailingNeed = undefined;
    checkAllNeeds(citizen, state, startingNeedOrderIndex);
}

function checkAllNeeds(citizen: Citizen, state: ChatSimState, startingNeedOrderIndex: number = 0) {
    const checkInterval = 1000;
    if (startingNeedOrderIndex === 0) citizen.needs.nextCompleteNeedCheckStartTime = state.time + checkInterval;
    let failingNeed: string | undefined = undefined;
    for (let i = startingNeedOrderIndex; i < NEED_ORDER.length; i++) {
        const need = NEED_ORDER[i];
        if (need === citizen.needs.lastFailingNeed) {
            failingNeed = need;
            break;
        }
        const needFunctions = state.functionsCitizenNeeds[need];
        if (!needFunctions.isFulfilled(citizen, state)) {
            failingNeed = need;
            break;
        }
    }
    if (failingNeed) {
        const needFunctions = state.functionsCitizenNeeds[failingNeed];
        citizen.needs.lastFailingNeed = failingNeed;
        needFunctions.tick(citizen, state);
    } else {
        citizen.needs.lastFailingNeed = undefined;
        if (citizen.stateInfo.type !== CITIZEN_STATE_TYPE_WORKING_JOB) {
            citizen.stateInfo = {
                type: CITIZEN_STATE_TYPE_WORKING_JOB, stack: []
            };
            addCitizenThought(citizen, `Back to work.`, state);
        }
    }
}

