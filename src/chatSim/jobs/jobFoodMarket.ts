import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen } from "../citizen.js";
import { CITIZEN_FOOD_IN_INVENTORY_NEED } from "../citizenNeeds/citizenNeed.js";
import { CitizenJob, createJob } from "./job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";
import { INVENTORY_MUSHROOM } from "../main.js";

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
    const mushrooms = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
    if (!mushrooms || mushrooms.counter <= CITIZEN_FOOD_IN_INVENTORY_NEED) {
        addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_GATHERER} as mushrooms run to low`, state);
        citizen.job = createJob(CITIZEN_JOB_FOOD_GATHERER, state);
    }
}