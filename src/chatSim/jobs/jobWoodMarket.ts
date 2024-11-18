import { Building, ChatSimState, Position } from "../chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen, emptyCitizenInventoryToHomeInventory, moveItemBetweenInventories, putItemIntoInventory } from "../citizen.js";
import { CitizenJob, createJob, findMarketBuilding, isCitizenInInteractDistance } from "./job.js";
import { CITIZEN_JOB_BUILDING_CONSTRUCTION } from "./jobBuildingContruction.js";
import { calculateDistance, INVENTORY_WOOD } from "../main.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";

export type CitizenJobWoodMarket = CitizenJob & {
    state: "findLocation" | "selling" | "goHome",
    lastCheckedForConstructionJobs?: number,
    marketBuilding?: Building,
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
        state: "findLocation",
    }
}

function tick(citizen: Citizen, job: CitizenJobWoodMarket, state: ChatSimState) {
    if (job.state === "findLocation") {
        if (job.lastCheckedForConstructionJobs === undefined || job.lastCheckedForConstructionJobs + CHECK_INTERVAL < state.time) {
            let jobExists = false;
            for (let jobber of state.map.citizens) {
                if (jobber.job.name === CITIZEN_JOB_BUILDING_CONSTRUCTION) {
                    jobExists = true;
                    job.lastCheckedForConstructionJobs = state.time;
                    break;
                }
            }
            if (!jobExists) {
                addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_BUILDING_CONSTRUCTION} as their is no citizen with a job in house contruction to sell to`, state);
                citizen.job = createJob(CITIZEN_JOB_BUILDING_CONSTRUCTION, state);
                return;
            }
        }
        if (!job.marketBuilding) {
            job.marketBuilding = findMarketBuilding(citizen, state);
        }
        if (!job.marketBuilding) {
            citizen.moveTo = {
                x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
            }
            job.state = "selling";
        } else {
            job.marketBuilding.inhabitedBy = citizen;
            citizen.moveTo = {
                x: job.marketBuilding.position.x,
                y: job.marketBuilding.position.y,
            }
            job.state = "selling";
        }
    }

    if (job.state === "goHome") {
        if (citizen.moveTo === undefined) {
            if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
                emptyCitizenInventoryToHomeInventory(citizen, state);
                const homeWood = citizen.home.inventory.find(i => i.name === INVENTORY_WOOD);
                if (homeWood && homeWood.counter > 0) {
                    const amount = Math.min(homeWood.counter, citizen.maxInventory - 2);
                    const actualAmount = moveItemBetweenInventories(INVENTORY_WOOD, citizen.home.inventory, citizen.inventory, citizen.maxInventory, amount);
                    addCitizenLogEntry(citizen, `move ${actualAmount}x${INVENTORY_WOOD} from home inventory to inventory`, state);
                }
            }
            job.state = "findLocation";
        }
    }

    if (job.state === "selling") {
        if (citizen.moveTo === undefined) {
            if (job.marketBuilding && !isCitizenInInteractDistance(citizen, job.marketBuilding.position)) {
                job.state = "findLocation";
            } else {
                let wood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
                if (job.marketBuilding) {
                    if (wood && wood.counter > 0) {
                        moveItemBetweenInventories(INVENTORY_WOOD, citizen.inventory, job.marketBuilding.inventory, job.marketBuilding.maxInventory, wood.counter);
                    }
                    wood = job.marketBuilding.inventory.find(i => i.name === INVENTORY_WOOD);
                }
                if (citizen.home) {
                    if (!wood || wood.counter <= 0) {
                        const homeWood = citizen.home.inventory.find(i => i.name === INVENTORY_WOOD);
                        if (homeWood && homeWood.counter > 0) {
                            job.state = "goHome";
                            citizen.moveTo = {
                                x: citizen.home.position.x,
                                y: citizen.home.position.y,
                            }
                            addCitizenLogEntry(citizen, `move home to get ${INVENTORY_WOOD} as inventory empty`, state);
                        } else {
                            switchJob(citizen, state);
                        }
                    }
                } else {
                    if (!wood || wood.counter === 0) {
                        switchJob(citizen, state);
                    }
                }
            }
        }
    }
}
function switchJob(citizen: Citizen, state: ChatSimState) {
    addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_LUMBERJACK} as ${INVENTORY_WOOD} run to low`, state);
    citizen.job = createJob(CITIZEN_JOB_LUMBERJACK, state);
}
