import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen } from "../citizen.js";
import { CitizenJob, createJob } from "./job.js";
import { CITIZEN_JOB_BUILDING_CONSTRUCTION } from "./jobBuildingContruction.js";

export type CitizenJobHouseMarket = CitizenJob & {
    state: "takeRandomLocation" | "selling"
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
        state: "takeRandomLocation",
    }
}

function tick(citizen: Citizen, job: CitizenJobHouseMarket, state: ChatSimState) {
    if (job.lastCheckedHouseAvailability === undefined || job.lastCheckedHouseAvailability + CHECK_INTERVAL < state.time) {
        let housesAvailable = false;
        for (let house of state.map.houses) {
            if (house.inhabitedBy) {
                housesAvailable = true;
                job.lastCheckedHouseAvailability = state.time;
                break;
            }
        }
        if (!housesAvailable) {
            addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_BUILDING_CONSTRUCTION} as their is no house to market`, state);
            citizen.job = createJob(CITIZEN_JOB_BUILDING_CONSTRUCTION, state);
            return;
        }
    }
    if (job.state === "takeRandomLocation") {
        citizen.moveTo = {
            x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
            y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
        }
        job.state = "selling";
    }
}