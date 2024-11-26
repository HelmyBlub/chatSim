import { ChatSimState, Position } from "../chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen, CitizenStateInfo, citizenStateStackTaskSuccess, setCitizenThought } from "../citizen.js";
import { citizenChangeJob, CitizenJob, findMarketBuilding, isCitizenInInteractDistance } from "./job.js";
import { CITIZEN_JOB_BUILDING_CONSTRUCTION } from "./jobBuildingContruction.js";
import { calculateDistance, INVENTORY_WOOD } from "../main.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { IMAGE_PATH_WOOD_PLANK } from "../../drawHelper.js";
import { inventoryEmptyCitizenToHomeInventory, inventoryMoveItemBetween } from "../inventory.js";

export type CitizenJobWoodMarket = CitizenJob & {
    lastCheckedForConstructionJobs?: number,
}

type JobWoodMarketStateInfo = {
    state: "selling" | "goHome",
}

export const CITIZEN_JOB_WOOD_MARKET = "Wood Market";
const CHECK_INTERVAL = 1000;

export function loadCitizenJobWoodMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_WOOD_MARKET] = {
        create: create,
        paintInventoryOnMarket: paintInventoryOnMarket,
        tick: tick,
    };
}

export function findClosestWoodMarket(position: Position, state: ChatSimState, hasStock: boolean = false, willBuy: boolean = false): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of state.map.citizens) {
        if (citizen.job.name === CITIZEN_JOB_WOOD_MARKET && citizen.moveTo === undefined) {
            if (hasStock) {
                const wood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
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
    }
}

function paintInventoryOnMarket(ctx: CanvasRenderingContext2D, citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    if (!job.marketBuilding) return;
    const woodPlankPaintSize = 30;
    const paintPos = mapPositionToPaintPosition(job.marketBuilding.position, state.paintData.map);
    const wood = job.marketBuilding.inventory.items.find(i => i.name === INVENTORY_WOOD);
    if (!wood || wood.counter === 0) return;
    for (let i = 0; i < Math.min(20, wood.counter); i++) {
        const offsetX = - 38 + Math.floor(i / 10) * 45;
        const offsetY = - 2 - (i % 10) * 2;
        ctx.drawImage(state.images[IMAGE_PATH_WOOD_PLANK], 0, 0, 200, 200, paintPos.x + offsetX, paintPos.y + offsetY, woodPlankPaintSize, woodPlankPaintSize);
    }
}

function tick(citizen: Citizen, job: CitizenJobWoodMarket, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
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
                citizenChangeJob(citizen, CITIZEN_JOB_BUILDING_CONSTRUCTION, state, [`there is no citizen with a job in house contruction to sell to`]);
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
            const citizenState: JobWoodMarketStateInfo = { state: "selling" };
            citizen.stateInfo.stack.unshift(citizenState);
        } else {
            job.marketBuilding.inhabitedBy = citizen;
            citizen.moveTo = {
                x: job.marketBuilding.position.x,
                y: job.marketBuilding.position.y,
            }
            const citizenState: JobWoodMarketStateInfo = { state: "selling" };
            citizen.stateInfo.stack.unshift(citizenState);
        }
    }
    if (citizen.stateInfo.stack.length === 0) return;
    const stateInfo = citizen.stateInfo.stack[0] as JobWoodMarketStateInfo;

    if (stateInfo.state === "goHome") {
        if (citizen.moveTo === undefined) {
            if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
                inventoryEmptyCitizenToHomeInventory(citizen, state);
                const homeWood = citizen.home.inventory.items.find(i => i.name === INVENTORY_WOOD);
                if (homeWood && homeWood.counter > 0) {
                    const amount = Math.min(homeWood.counter, citizen.inventory.size - 2);
                    const actualAmount = inventoryMoveItemBetween(INVENTORY_WOOD, citizen.home.inventory, citizen.inventory, amount);
                    addCitizenLogEntry(citizen, `move ${actualAmount}x${INVENTORY_WOOD} from home inventory to inventory`, state);
                }
            }
            citizenStateStackTaskSuccess(citizen);
        }
    }

    if (stateInfo.state === "selling") {
        if (citizen.moveTo === undefined) {
            citizen.paintBehindBuildings = true;
            if (job.marketBuilding && !isCitizenInInteractDistance(citizen, job.marketBuilding.position)) {
                citizenStateStackTaskSuccess(citizen);
            } else {
                let wood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
                if (job.marketBuilding) {
                    if (wood && wood.counter > 0) {
                        inventoryMoveItemBetween(INVENTORY_WOOD, citizen.inventory, job.marketBuilding.inventory, wood.counter);
                    }
                    wood = job.marketBuilding.inventory.items.find(i => i.name === INVENTORY_WOOD);
                }
                if (citizen.home) {
                    if (!wood || wood.counter <= 0) {
                        const homeWood = citizen.home.inventory.items.find(i => i.name === INVENTORY_WOOD);
                        if (homeWood && homeWood.counter > 0) {
                            stateInfo.state = "goHome";
                            setCitizenThought(citizen, [
                                `I am out of ${INVENTORY_WOOD}. Go home to get more.`,
                            ], state);

                            citizen.moveTo = {
                                x: citizen.home.position.x,
                                y: citizen.home.position.y,
                            }
                        } else {
                            citizenChangeJob(citizen, CITIZEN_JOB_LUMBERJACK, state, [`${INVENTORY_WOOD} run to low`]);
                        }
                    }
                } else {
                    if (!wood || wood.counter === 0) {
                        citizenChangeJob(citizen, CITIZEN_JOB_LUMBERJACK, state, [`${INVENTORY_WOOD} run to low`]);
                    }
                }
            }
        }
    }
}
