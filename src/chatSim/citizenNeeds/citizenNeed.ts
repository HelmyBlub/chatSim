import { ChatSimState } from "../chatSimModels.js";
import { addCitizenThought, Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, citizenRemoveTodo, citizenResetStateTo } from "../citizen.js";
import { CITIZEN_NEED_FOOD, loadCitizenNeedsFunctionsFood } from "./citizenNeedFood.js";
import { CITIZEN_NEED_HOME, loadCitizenNeedsFunctionsHome } from "./citizenNeedHome.js";
import { CITIZEN_NEED_SLEEP, loadCitizenNeedsFunctionsSleep } from "./citizenNeedSleep.js";
import { CITIZEN_NEED_STARVING, loadCitizenNeedsFunctionsStarving } from "./citizenNeedStarving.js";

export type CitizenNeedFunctions = {
    isFulfilled(citizen: Citizen, state: ChatSimState): boolean,
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

export function checkCitizenNeeds(citizen: Citizen, state: ChatSimState) {
    const isTimeToCheckAllNeeds = citizen.needs.nextCompleteNeedCheckStartTime === undefined || citizen.needs.nextCompleteNeedCheckStartTime <= state.time;
    if (isTimeToCheckAllNeeds) {
        checkAllNeeds(citizen, state);
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

export function citizenNeedOnNeedFulfilled(citizen: Citizen, need: string, state: ChatSimState) {
    if (citizen.needs.lastFailingNeed === undefined) {
        citizenRemoveTodo(citizen, need);
        citizenResetStateTo(citizen, CITIZEN_STATE_TYPE_WORKING_JOB);
        return;
    }
    const startingNeedOrderIndex = NEED_ORDER.findIndex(n => n === citizen.needs.lastFailingNeed) + 1;
    citizen.needs.lastFailingNeed = undefined;
    citizenResetStateTo(citizen, CITIZEN_STATE_TYPE_WORKING_JOB);
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
        if (citizen.needs.lastFailingNeed !== failingNeed) {
            citizen.needs.lastFailingNeed = failingNeed;
            citizenResetStateTo(citizen, failingNeed);
        }
    } else {
        citizen.needs.lastFailingNeed = undefined;
    }
}

