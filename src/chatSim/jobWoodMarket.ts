import { CitizenJob } from "./job.js";
import { ChatSimState, Citizen } from "./main.js";

export type CitizenJobWoodMarket = CitizenJob & {
    state: "takeRandomLocation" | "selling"
}

export const CITIZEN_JOB_WOOD_MARKET = "Wood Market";

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
    if (job.state === "takeRandomLocation") {
        citizen.moveTo = {
            x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
            y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
        }
        job.state = "selling";
    }
}