import { Building, ChatSimState, InventoryStuff } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, emptyCitizenInventoryToHomeInventory, moveItemBetweenInventories, putItemIntoInventory } from "../citizen.js";
import { CitizenJob, createJob, findMarketBuilding, isCitizenInInteractDistance, sellItem, sellItemWithInventories } from "./job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { CITIZEN_FOOD_AT_HOME_NEED, CITIZEN_FOOD_IN_INVENTORY_NEED } from "../citizenNeeds/citizenNeedFood.js";

export type CitizenJobFoodMarket = CitizenJob & {
    state: "findLocation" | "selling" | "goHome" | "repairMarket",
    marketBuilding?: Building,
}

export const CITIZEN_JOB_FOOD_MARKET = "Food Market";

export function loadCitizenJobFoodMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_MARKET] = {
        create: create,
        tick: tick,
    };
}

export function hasFoodMarketStock(foodMarket: Citizen): boolean {
    if (foodMarket.job.name !== CITIZEN_JOB_FOOD_MARKET) return false;
    const job = foodMarket.job as CitizenJobFoodMarket;
    let mushrooms: InventoryStuff | undefined = undefined;
    if (job.marketBuilding) {
        mushrooms = job.marketBuilding.inventory.find(i => i.name === INVENTORY_MUSHROOM);
        if (mushrooms && mushrooms.counter > 0) return true;
    } else {
        mushrooms = foodMarket.inventory.find(i => i.name === INVENTORY_MUSHROOM);
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
        state: "findLocation",
    }
}

function tick(citizen: Citizen, job: CitizenJobFoodMarket, state: ChatSimState) {
    if (job.marketBuilding && job.marketBuilding.deterioration > 0.5 && job.state !== "repairMarket") {
        job.state = "repairMarket";
        citizen.moveTo = {
            x: job.marketBuilding.position.x,
            y: job.marketBuilding.position.y,
        }
    }
    if (job.state === "repairMarket") {
        if (citizen.moveTo === undefined) {
            if (job.marketBuilding && job.marketBuilding.deterioration > 0.5) {
                job.marketBuilding.deterioration -= 0.5;
            }
            job.state = "findLocation";
        }
    }
    if (job.state === "findLocation") {
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
                const homeMushrooms = citizen.home.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                if (homeMushrooms && homeMushrooms.counter > CITIZEN_FOOD_AT_HOME_NEED) {
                    const amount = Math.min(homeMushrooms.counter - CITIZEN_FOOD_AT_HOME_NEED, citizen.maxInventory);
                    const actualAmount = moveItemBetweenInventories(INVENTORY_MUSHROOM, citizen.home.inventory, citizen.inventory, citizen.maxInventory, amount);
                    addCitizenLogEntry(citizen, `move ${actualAmount}x${INVENTORY_MUSHROOM} from home inventory to inventory`, state);
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
                let mushrooms = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                if (job.marketBuilding) {
                    if (mushrooms && mushrooms.counter > 0) {
                        moveItemBetweenInventories(INVENTORY_MUSHROOM, citizen.inventory, job.marketBuilding.inventory, job.marketBuilding.maxInventory, mushrooms.counter);
                    }
                    mushrooms = job.marketBuilding.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                }
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
    }
}

function switchJob(citizen: Citizen, state: ChatSimState) {
    addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_GATHERER} as ${INVENTORY_MUSHROOM} run to low`, state);
    citizen.job = createJob(CITIZEN_JOB_FOOD_GATHERER, state);
}
