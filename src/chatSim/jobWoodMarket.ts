import { ChatSimState, Citizen } from "./chatSimModels.js";
import { CitizenJob, createJob } from "./job.js";
import { CITIZEN_JOB_HOUSE_CONSTRUCTION } from "./jobHouseContruction.js";

export type CitizenJobWoodMarket = CitizenJob & {
    state: "takeRandomLocation" | "selling"
    lastCheckedForConstructionJobs?: number,
}

export const CITIZEN_JOB_WOOD_MARKET = "Wood Market";
const CHECK_INTERVAL = 1000;

export function loadCitizenJobWoodMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_WOOD_MARKET] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobWoodMarket {
    return {
        name: CITIZEN_JOB_WOOD_MARKET,
        state: "takeRandomLocation",
    }
}

function tick(citizen: Citizen, job: CitizenJobWoodMarket, state: ChatSimState) {
    if (job.lastCheckedForConstructionJobs === undefined || job.lastCheckedForConstructionJobs + CHECK_INTERVAL < performance.now()) {
        let jobExists = false;
        for (let jobber of state.map.citizens) {
            if (jobber.job.name === CITIZEN_JOB_HOUSE_CONSTRUCTION) {
                jobExists = true;
                job.lastCheckedForConstructionJobs = performance.now();
                break;
            }
        }
        if (!jobExists) {
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