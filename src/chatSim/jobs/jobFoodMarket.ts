import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, emptyCitizenInventoryToHomeInventory, putItemIntoInventory } from "../citizen.js";
import { CitizenJob, createJob, isCitizenInInteractDistance } from "./job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { CITIZEN_FOOD_AT_HOME_NEED, CITIZEN_FOOD_IN_INVENTORY_NEED } from "../citizenNeeds/citizenNeedFood.js";

export type CitizenJobFoodMarket = CitizenJob & {
    state: "takeRandomLocation" | "selling" | "goHome"
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
    if (job.state === "goHome") {
        if (citizen.moveTo === undefined) {
            if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
                emptyCitizenInventoryToHomeInventory(citizen, state);
                const homeMushrooms = citizen.home.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                if (homeMushrooms && homeMushrooms.counter > CITIZEN_FOOD_AT_HOME_NEED) {
                    const amount = Math.min(homeMushrooms.counter - CITIZEN_FOOD_AT_HOME_NEED, citizen.maxInventory);
                    const actualAmount = putItemIntoInventory(INVENTORY_MUSHROOM, citizen.inventory, citizen.maxInventory, amount);
                    addCitizenLogEntry(citizen, `move ${actualAmount}x${INVENTORY_MUSHROOM} from home inventory to inventory`, state);
                }
            }
            job.state = "takeRandomLocation";
        }
    }

    if (job.state === "selling") {
        const mushrooms = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
        if (citizen.home) {
            if (!mushrooms || mushrooms.counter <= 0) {
                const homeMushrooms = citizen.home.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                if (homeMushrooms && homeMushrooms.counter > CITIZEN_FOOD_AT_HOME_NEED) {
                    job.state = "goHome";
                    citizen.moveTo = {
                        x: citizen.home.position.x,
                        y: citizen.home.position.y,
                    }
                    addCitizenLogEntry(citizen, `move home to get ${INVENTORY_MUSHROOM} as inventory empty`, state);
                } else {
                    switchJob(citizen, state);
                }
            }
        } else {
            if (!mushrooms || mushrooms.counter <= CITIZEN_FOOD_IN_INVENTORY_NEED) {
                switchJob(citizen, state);
            }
        }
    }
}

function switchJob(citizen: Citizen, state: ChatSimState) {
    addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_GATHERER} as ${INVENTORY_MUSHROOM} run to low`, state);
    citizen.job = createJob(CITIZEN_JOB_FOOD_GATHERER, state);
}
