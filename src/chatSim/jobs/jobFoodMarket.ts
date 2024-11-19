import { ChatSimState, InventoryItem } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, emptyCitizenInventoryToHomeInventory, moveItemBetweenInventories } from "../citizen.js";
import { citizenChangeJob, CitizenJob, findMarketBuilding, isCitizenInInteractDistance, sellItem, sellItemWithInventories } from "./job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { CITIZEN_FOOD_AT_HOME_NEED, CITIZEN_FOOD_IN_INVENTORY_NEED } from "../citizenNeeds/citizenNeedFood.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { IMAGE_PATH_MUSHROOM } from "../../drawHelper.js";

export type CitizenJobFoodMarket = CitizenJob & {
}
type JobFoodMarketStateInfo = {
    type: string,
    state?: "selling" | "goHome" | "repairMarket",
}

export const CITIZEN_JOB_FOOD_MARKET = "Food Market";

export function loadCitizenJobFoodMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_MARKET] = {
        create: create,
        paintInventoryOnMarket: paintInventoryOnMarket,
        tick: tick,
    };
}

export function hasFoodMarketStock(foodMarket: Citizen): boolean {
    if (foodMarket.job.name !== CITIZEN_JOB_FOOD_MARKET) return false;
    const job = foodMarket.job as CitizenJobFoodMarket;
    let mushrooms: InventoryItem | undefined = undefined;
    if (job.marketBuilding) {
        mushrooms = job.marketBuilding.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        if (mushrooms && mushrooms.counter > 0) return true;
    } else {
        mushrooms = foodMarket.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        if (!mushrooms || mushrooms.counter <= 0) return false;
        if (foodMarket.home) {
            return true;
        } else {
            if (mushrooms.counter <= CITIZEN_FOOD_IN_INVENTORY_NEED) return false;
            return true;
        }
    }
    return false;
}

export function buyFoodFromFoodMarket(foodMarket: Citizen, buyer: Citizen, requestedAmount: number, state: ChatSimState) {
    if (foodMarket.job.name !== CITIZEN_JOB_FOOD_MARKET) return false;
    const job = foodMarket.job as CitizenJobFoodMarket;
    const buyPrice = 2;
    if (job.marketBuilding) {
        sellItemWithInventories(foodMarket, buyer, INVENTORY_MUSHROOM, buyPrice, job.marketBuilding.inventory, buyer.inventory, state, requestedAmount);
    } else {
        sellItem(foodMarket, buyer, INVENTORY_MUSHROOM, buyPrice, state, requestedAmount);
    }
}

export function sellFoodToFoodMarket(foodMarket: Citizen, seller: Citizen, requestedAmount: number, state: ChatSimState) {
    if (foodMarket.job.name !== CITIZEN_JOB_FOOD_MARKET) return false;
    const job = foodMarket.job as CitizenJobFoodMarket;
    const sellPrice = 1;
    if (job.marketBuilding) {
        sellItemWithInventories(seller, foodMarket, INVENTORY_MUSHROOM, sellPrice, seller.inventory, job.marketBuilding.inventory, state, requestedAmount);
    } else {
        sellItem(seller, foodMarket, INVENTORY_MUSHROOM, sellPrice, state, requestedAmount);
    }
}

function create(state: ChatSimState): CitizenJobFoodMarket {
    return {
        name: CITIZEN_JOB_FOOD_MARKET,
    }
}

function paintInventoryOnMarket(ctx: CanvasRenderingContext2D, citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    if (!job.marketBuilding) return;
    const mushroomPaintSize = 14;
    const paintPos = mapPositionToPaintPosition(job.marketBuilding.position, state.paintData.map);
    const mushrooms = job.marketBuilding.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    if (!mushrooms || mushrooms.counter === 0) return;
    for (let i = 0; i < Math.min(13, mushrooms.counter); i++) {
        ctx.drawImage(state.images[IMAGE_PATH_MUSHROOM], 0, 0, 200, 200, paintPos.x + i * 5 - 38, paintPos.y - 2, mushroomPaintSize, mushroomPaintSize);
    }
}

function tick(citizen: Citizen, job: CitizenJobFoodMarket, state: ChatSimState) {
    const stateInfo = citizen.stateInfo as JobFoodMarketStateInfo;

    if (job.marketBuilding && job.marketBuilding.deterioration > 0.5 && stateInfo.state !== "repairMarket") {
        stateInfo.state = "repairMarket";
        citizen.moveTo = {
            x: job.marketBuilding.position.x,
            y: job.marketBuilding.position.y,
        }
    }
    if (stateInfo.state === "repairMarket") {
        if (citizen.moveTo === undefined) {
            if (job.marketBuilding && job.marketBuilding.deterioration > 0.5) {
                job.marketBuilding.deterioration -= 0.5;
            }
            stateInfo.state = undefined;
        }
    }
    if (stateInfo.state === undefined) {
        if (!job.marketBuilding) {
            job.marketBuilding = findMarketBuilding(citizen, state);
        }
        if (!job.marketBuilding) {
            citizen.moveTo = {
                x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
            }
            stateInfo.state = "selling";
        } else {
            job.marketBuilding.inhabitedBy = citizen;
            citizen.moveTo = {
                x: job.marketBuilding.position.x,
                y: job.marketBuilding.position.y,
            }
            stateInfo.state = "selling";
        }
    }
    if (stateInfo.state === "goHome") {
        if (citizen.moveTo === undefined) {
            if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
                emptyCitizenInventoryToHomeInventory(citizen, state);
                const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (homeMushrooms && homeMushrooms.counter > CITIZEN_FOOD_AT_HOME_NEED) {
                    const amount = Math.min(homeMushrooms.counter - CITIZEN_FOOD_AT_HOME_NEED, citizen.inventory.size);
                    const actualAmount = moveItemBetweenInventories(INVENTORY_MUSHROOM, citizen.home.inventory, citizen.inventory, amount);
                    addCitizenLogEntry(citizen, `move ${actualAmount}x${INVENTORY_MUSHROOM} from home inventory to inventory`, state);
                }
            }
            stateInfo.state = undefined;
        }
    }

    if (stateInfo.state === "selling") {
        if (citizen.moveTo === undefined) {
            if (job.marketBuilding && !isCitizenInInteractDistance(citizen, job.marketBuilding.position)) {
                stateInfo.state = undefined;
            } else {
                let mushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (job.marketBuilding) {
                    if (mushrooms && mushrooms.counter > 0) {
                        moveItemBetweenInventories(INVENTORY_MUSHROOM, citizen.inventory, job.marketBuilding.inventory, mushrooms.counter);
                    }
                    mushrooms = job.marketBuilding.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                }
                if (citizen.home) {
                    if (!mushrooms || mushrooms.counter <= 0) {
                        const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                        if (homeMushrooms && homeMushrooms.counter > CITIZEN_FOOD_AT_HOME_NEED) {
                            stateInfo.state = "goHome";
                            citizen.moveTo = {
                                x: citizen.home.position.x,
                                y: citizen.home.position.y,
                            }
                            addCitizenLogEntry(citizen, `move home to get ${INVENTORY_MUSHROOM} as inventory empty`, state);
                        } else {
                            citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, `${INVENTORY_MUSHROOM} run to low`);
                        }
                    }
                } else {
                    if (!mushrooms || mushrooms.counter <= CITIZEN_FOOD_IN_INVENTORY_NEED) {
                        citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, `${INVENTORY_MUSHROOM} run to low`);
                    }
                }
            }
        }
    }
}
