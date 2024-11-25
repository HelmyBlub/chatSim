import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, CitizenStateInfo, setCitizenThought } from "../citizen.js";
import { citizenChangeJob, CitizenJob, findMarketBuilding, isCitizenInInteractDistance, sellItem, sellItemWithInventories } from "./job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";
import { calculateDistance, INVENTORY_MUSHROOM } from "../main.js";
import { CITIZEN_FOOD_AT_HOME_NEED, CITIZEN_FOOD_IN_INVENTORY_NEED } from "../citizenNeeds/citizenNeedFood.js";
import { addChatMessage, createEmptyChat } from "../chatBubble.js";
import { CitizenJobMarket, createJobMarket, paintInventoryOnMarket, tickMarket } from "./jobMarket.js";
import { inventoryEmptyCitizenToHomeInventory, InventoryItem, inventoryMoveItemBetween } from "../inventory.js";

export type CitizenJobFoodMarket = CitizenJobMarket & {
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

function findClosestFoodMarket(searcher: Citizen, citizens: Citizen[], shouldHaveFood: boolean): Citizen | undefined {
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
    return createJobMarket(state, CITIZEN_JOB_FOOD_MARKET, [INVENTORY_MUSHROOM]);
}

function tick(citizen: Citizen, job: CitizenJobFoodMarket, state: ChatSimState) {
    if (citizen.stateInfo.type !== CITIZEN_STATE_TYPE_WORKING_JOB) {
        citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB, stack: [] };
    }
    tickMarket(citizen, job, state);
}
