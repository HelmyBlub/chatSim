import { ChatSimState, Position } from "../chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen } from "../citizen.js";
import { CitizenJob, createJob } from "./job.js";
import { CITIZEN_JOB_HOUSE_CONSTRUCTION } from "./jobHouseContruction.js";
import { calculateDistance, INVENTORY_WOOD } from "../main.js";

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

export function findClosestWoodMarket(position: Position, state: ChatSimState, hasStock: boolean = false, willBuy: boolean = false): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of state.map.citizens) {
        if (citizen.job.name === CITIZEN_JOB_WOOD_MARKET && citizen.moveTo === undefined) {
            if (hasStock) {
                const wood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
                if (!wood || wood.counter === 0) continue;
            }
            if (willBuy && (citizen.money < 2 || canCitizenCarryMore(citizen))) {
                continue;
            }
            if (closest === undefined) {
                closest = citizen;
                distance = calculateDistance(citizen.position, position);
            } else {
                const tempDistance = calculateDistance(citizen.position, position);
                if (tempDistance < distance) {
                    distance = tempDistance;
                    closest = citizen;
                }
            }
        }
    }
    return closest;
}

function create(state: ChatSimState): CitizenJobWoodMarket {
    return {
        name: CITIZEN_JOB_WOOD_MARKET,
        state: "takeRandomLocation",
    }
}

function tick(citizen: Citizen, job: CitizenJobWoodMarket, state: ChatSimState) {
    if (job.lastCheckedForConstructionJobs === undefined || job.lastCheckedForConstructionJobs + CHECK_INTERVAL < state.time) {
        let jobExists = false;
        for (let jobber of state.map.citizens) {
            if (jobber.job.name === CITIZEN_JOB_HOUSE_CONSTRUCTION) {
                jobExists = true;
                job.lastCheckedForConstructionJobs = state.time;
                break;
            }
        }
        if (!jobExists) {
            addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_HOUSE_CONSTRUCTION} as their is no citizen with a job in house contruction to sell to`, state);
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