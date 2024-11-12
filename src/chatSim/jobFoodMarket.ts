import { ChatSimState, Citizen } from "./chatSimModels.js";
import { CitizenJob } from "./job.js";

export type CitizenJobFoodMarket = CitizenJob & {
    state: "takeRandomLocation" | "selling"
}

export const CITIZEN_JOB_FOOD_MARKET = "Food Market";

export function loadCitizenJobFoodMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_MARKET] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobFoodMarket {
    return {
        name: CITIZEN_JOB_FOOD_MARKET,
        state: "takeRandomLocation",
    }
}

function tick(citizen: Citizen, job: CitizenJobFoodMarket, state: ChatSimState) {
    if (job.state === "takeRandomLocation") {
        citizen.moveTo = {
            x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
            y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
        }
        job.state = "selling";
    }
}