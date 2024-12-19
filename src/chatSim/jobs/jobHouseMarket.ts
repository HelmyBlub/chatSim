import { ChatSimState } from "../chatSimModels.js";
import { Citizen } from "../citizen.js";
import { nextRandom } from "../main.js";
import { citizenChangeJob, CitizenJob } from "./job.js";
import { CITIZEN_JOB_BUILDING_CONSTRUCTION } from "./jobBuildingContruction.js";

export type CitizenJobHouseMarket = CitizenJob & {
    lastCheckedHouseAvailability?: number,
}

type JobHouseMarketStateInfo = {
    state: "selling",
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
    if (job.lastCheckedHouseAvailability === undefined || job.lastCheckedHouseAvailability + CHECK_INTERVAL < state.time) {
        let housesAvailable = false;
        if (!housesAvailable) {
            citizenChangeJob(citizen, CITIZEN_JOB_BUILDING_CONSTRUCTION, state, [`there is no house to market`]);
            return;
        }
    }
    if (citizen.stateInfo.stack.length === 0) {
        citizen.moveTo = {
            x: nextRandom(state.randomSeed) * state.map.width - state.map.width / 2,
            y: nextRandom(state.randomSeed) * state.map.height - state.map.height / 2,
        }
        const citizenState: JobHouseMarketStateInfo = { state: "selling" };
        citizen.stateInfo.stack.unshift(citizenState);
    }
}