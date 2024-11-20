import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CITIZEN_STATE_TYPE_WORKING_JOB } from "../citizen.js";
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

export function loadCitizenNeedsFunctions(state: ChatSimState) {
    loadCitizenNeedsFunctionsStarving(state);
    loadCitizenNeedsFunctionsFood(state);
    loadCitizenNeedsFunctionsHome(state);
    loadCitizenNeedsFunctionsSleep(state);
}

export function tickCitizenNeeds(citizen: Citizen, state: ChatSimState) {
    const checkInterval = 1000;
    if (citizen.needs.lastSuccededCheckedNeedsTime !== undefined && citizen.needs.lastSuccededCheckedNeedsTime + checkInterval > state.time) return;
    const needs = [CITIZEN_NEED_STARVING, CITIZEN_NEED_SLEEP, CITIZEN_NEED_FOOD, CITIZEN_NEED_HOME];
    let needsFulfilled = true;
    for (let need of needs) {
        const needFunctions = state.functionsCitizenNeeds[need];
        if (!needFunctions.isFulfilled(citizen, state)) {
            needFunctions.tick(citizen, state);
            needsFulfilled = false;
            break;
        }
    }
    if (needsFulfilled) {
        citizen.needs.lastSuccededCheckedNeedsTime = state.time;
        if (citizen.stateInfo.type !== CITIZEN_STATE_TYPE_WORKING_JOB) citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
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
