import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, citizenResetStateTo } from "../citizen.js";
import { INVENTORY_WOOD } from "../inventory.js";
import { CitizenJobMarket, createJobMarket, tickMarket } from "./jobMarket.js";

export type CitizenJobWoodMarket = CitizenJobMarket & {
}

export const CITIZEN_JOB_WOOD_MARKET = "Wood Market";

export function loadCitizenJobWoodMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_WOOD_MARKET] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobWoodMarket {
    return createJobMarket(state, CITIZEN_JOB_WOOD_MARKET, [INVENTORY_WOOD]);
}

function tick(citizen: Citizen, job: CitizenJobWoodMarket, state: ChatSimState) {
    if (citizen.stateInfo.type !== CITIZEN_STATE_TYPE_WORKING_JOB) {
        citizenResetStateTo(citizen, CITIZEN_STATE_TYPE_WORKING_JOB);
    }
    tickMarket(citizen, job, state);
}
