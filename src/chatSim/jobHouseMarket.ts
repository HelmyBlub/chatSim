import { CitizenJob, createJob } from "./job.js";
import { CITIZEN_JOB_HOUSE_CONSTRUCTION } from "./jobHouseContruction.js";
import { ChatSimState, Citizen } from "./main.js";

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
    if (job.lastCheckedHouseAvailability === undefined || job.lastCheckedHouseAvailability + CHECK_INTERVAL < performance.now()) {
        let housesAvailable = false;
        for (let house of state.map.houses) {
            if (house.available) {
                housesAvailable = true;
                job.lastCheckedHouseAvailability = performance.now();
                break;
            }
        }
        if (!housesAvailable) {
            citizen.job = createJob(CITIZEN_JOB_HOUSE_CONSTRUCTION, state);
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