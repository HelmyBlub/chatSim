import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CitizenStateInfo } from "../citizen.js";
import { citizenChangeJob, CitizenJob } from "./job.js";
import { CITIZEN_JOB_BUILDING_CONSTRUCTION } from "./jobBuildingContruction.js";

export type CitizenJobHouseMarket = CitizenJob & {
    lastCheckedHouseAvailability?: number,
}

type JobHouseMarketStateInfo = CitizenStateInfo & {
    state?: "selling",
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
    const stateInfo = citizen.stateInfo as JobHouseMarketStateInfo;

    if (job.lastCheckedHouseAvailability === undefined || job.lastCheckedHouseAvailability + CHECK_INTERVAL < state.time) {
        let housesAvailable = false;
        for (let house of state.map.buildings) {
            if (house.inhabitedBy) {
                housesAvailable = true;
                job.lastCheckedHouseAvailability = state.time;
                break;
            }
        }
        if (!housesAvailable) {
            citizenChangeJob(citizen, CITIZEN_JOB_BUILDING_CONSTRUCTION, state, [`there is no house to market`]);
            return;
        }
    }
    if (stateInfo.state === undefined) {
        citizen.moveTo = {
            x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
            y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
        }
        stateInfo.state = "selling";
    }
}