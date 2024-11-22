import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, CitizenStateInfo, setCitizenThought } from "../citizen.js";
import { citizenChangeJob, CitizenJob, findMarketBuilding, isCitizenInInteractDistance, sellItem, sellItemWithInventories } from "./job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";
import { calculateDistance, INVENTORY_MUSHROOM } from "../main.js";
import { CITIZEN_FOOD_AT_HOME_NEED, CITIZEN_FOOD_IN_INVENTORY_NEED } from "../citizenNeeds/citizenNeedFood.js";
import { addChatMessage, createEmptyChat } from "../chatBubble.js";
import { paintInventoryOnMarket } from "./jobMarket.js";
import { inventoryEmptyCitizenToHomeInventory, InventoryItem, inventoryMoveItemBetween } from "../inventory.js";

export type CitizenJobFoodMarket = CitizenJob & {
}
type JobFoodMarketStateInfo = {
    state: "selling" | "goHome" | "repairMarket",
}

export const CITIZEN_JOB_FOOD_MARKET = "Food Market";

export function loadCitizenJobFoodMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_MARKET] = {
        create: create,
        paintInventoryOnMarket: paintInventoryOnMarket,
        tick: tick,
    };
}

export function findClosestFoodMarket(searcher: Citizen, citizens: Citizen[], shouldHaveFood: boolean): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen === searcher) continue;
        const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        if (citizen.job && citizen.job.name === CITIZEN_JOB_FOOD_MARKET && citizen.moveTo === undefined && (!shouldHaveFood || (inventoryMushroom && hasFoodMarketStock(citizen)))) {
            if (closest === undefined) {
                closest = citizen;
                distance = calculateDistance(citizen.position, searcher.position);
            } else {
                const tempDistance = calculateDistance(citizen.position, searcher.position);
                if (tempDistance < distance) {
                    closest = citizen;
                    distance = tempDistance;
                }
            }
        }
    }
    return closest;
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
        const amount = sellItemWithInventories(seller, foodMarket, INVENTORY_MUSHROOM, sellPrice, seller.inventory, job.marketBuilding.inventory, state, requestedAmount);
        if (amount !== undefined && amount > 0) {
            const chat = createEmptyChat();
            addChatMessage(chat, seller, `I want to sell ${requestedAmount}x${INVENTORY_MUSHROOM}`, state);
            addChatMessage(chat, foodMarket, `I would buy ${amount}x${INVENTORY_MUSHROOM} for $${sellPrice * amount}`, state);
            addChatMessage(chat, seller, `Yes please!`, state);
            foodMarket.lastChat = chat;
        }
    } else {
        sellItem(seller, foodMarket, INVENTORY_MUSHROOM, sellPrice, state, requestedAmount);
    }
}

function create(state: ChatSimState): CitizenJobFoodMarket {
    return {
        name: CITIZEN_JOB_FOOD_MARKET,
    }
}

function tick(citizen: Citizen, job: CitizenJobFoodMarket, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (!job.marketBuilding) {
            job.marketBuilding = findMarketBuilding(citizen, state);
        }
        if (!job.marketBuilding) {
            citizen.moveTo = {
                x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
            }
            const citizenState: JobFoodMarketStateInfo = { state: "selling" };
            citizen.stateInfo.stack.push(citizenState);
        } else {
            job.marketBuilding.inhabitedBy = citizen;
            citizen.moveTo = {
                x: job.marketBuilding.position.x,
                y: job.marketBuilding.position.y,
            }
            const citizenState: JobFoodMarketStateInfo = { state: "selling" };
            citizen.stateInfo.stack.push(citizenState);
        }
    }
    const stateInfo = citizen.stateInfo.stack[0] as JobFoodMarketStateInfo;

    if (stateInfo.state === "goHome") {
        if (citizen.moveTo === undefined) {
            if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
                inventoryEmptyCitizenToHomeInventory(citizen, state);
                const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (homeMushrooms && homeMushrooms.counter > CITIZEN_FOOD_AT_HOME_NEED) {
                    const amount = Math.min(homeMushrooms.counter - CITIZEN_FOOD_AT_HOME_NEED, citizen.inventory.size);
                    const actualAmount = inventoryMoveItemBetween(INVENTORY_MUSHROOM, citizen.home.inventory, citizen.inventory, amount);
                    addCitizenLogEntry(citizen, `move ${actualAmount}x${INVENTORY_MUSHROOM} from home inventory to inventory`, state);
                }
            }
            citizen.stateInfo.stack.shift();
        }
    }

    if (stateInfo.state === "selling") {
        if (citizen.moveTo === undefined) {
            citizen.paintBehindBuildings = true;
            if (job.marketBuilding && !isCitizenInInteractDistance(citizen, job.marketBuilding.position)) {
                citizen.stateInfo.stack.shift();
            } else {
                let mushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (job.marketBuilding) {
                    if (mushrooms && mushrooms.counter > 0) {
                        inventoryMoveItemBetween(INVENTORY_MUSHROOM, citizen.inventory, job.marketBuilding.inventory, mushrooms.counter);
                    }
                    mushrooms = job.marketBuilding.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                }
                if (citizen.home) {
                    if (!mushrooms || mushrooms.counter <= 0) {
                        const homeMushrooms = citizen.home.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                        if (homeMushrooms && homeMushrooms.counter > CITIZEN_FOOD_AT_HOME_NEED) {
                            stateInfo.state = "goHome";
                            setCitizenThought(citizen, [
                                `I am out of ${INVENTORY_MUSHROOM}. Go home to get more.`,
                            ], state);

                            citizen.moveTo = {
                                x: citizen.home.position.x,
                                y: citizen.home.position.y,
                            }
                        } else {
                            const reason = [
                                `${INVENTORY_MUSHROOM} run to low.`,
                                `I become a ${CITIZEN_JOB_FOOD_GATHERER} to gather ${INVENTORY_MUSHROOM} myself.`,
                            ];

                            citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, reason);
                        }
                    }
                } else {
                    if (!mushrooms || mushrooms.counter <= CITIZEN_FOOD_IN_INVENTORY_NEED) {
                        const reason = [
                            `${INVENTORY_MUSHROOM} run to low.`,
                            `I become a ${CITIZEN_JOB_FOOD_GATHERER} to gather ${INVENTORY_MUSHROOM} myself.`,
                        ];
                        citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, reason);
                    }
                }
            }
        }
    }
}
