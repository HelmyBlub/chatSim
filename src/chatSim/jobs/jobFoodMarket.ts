import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, citizenResetStateTo } from "../citizen.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { CitizenJobMarket, createJobMarket, tickMarket } from "./jobMarket.js";

export type CitizenJobFoodMarket = CitizenJobMarket & {
}

export const CITIZEN_JOB_FOOD_MARKET = "Food Market";

export function loadCitizenJobFoodMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_MARKET] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobFoodMarket {
    return createJobMarket(state, CITIZEN_JOB_FOOD_MARKET, [INVENTORY_MUSHROOM]);
}

function tick(citizen: Citizen, job: CitizenJobFoodMarket, state: ChatSimState) {
    if (citizen.stateInfo.type !== CITIZEN_STATE_TYPE_WORKING_JOB) {
        citizenResetStateTo(citizen, CITIZEN_STATE_TYPE_WORKING_JOB);
    }
    tickMarket(citizen, job, state);
}
