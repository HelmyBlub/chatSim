import { ChatSimState } from "../chatSimModels.js";
import { Citizen } from "../citizen.js";
import { nextRandom } from "../main.js";
import { citizenChangeJob, CitizenJob } from "./job.js";
import { CITIZEN_JOB_BUILDING_CONSTRUCTION } from "./jobBuildingContruction.js";

export type CitizenJobHouseMarket = CitizenJob & {
    lastCheckedHouseAvailability?: number,
}

export const CITIZEN_JOB_HOUSE_MARKET = "House Market";
const CHECK_INTERVAL = 1000;

export function loadCitizenJobHouseMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_HOUSE_MARKET] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobHouseMarket {
    return {
        name: CITIZEN_JOB_HOUSE_MARKET,
    }
}

function tick(citizen: Citizen, job: CitizenJobHouseMarket, state: ChatSimState) {

}