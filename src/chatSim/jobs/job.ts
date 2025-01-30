import { ChatSimState, Position } from "../chatSimModels.js";
import { BuildingMarket } from "../map/mapObjectBuilding.js";
import { Citizen, citizenAddLogEntry, CITIZEN_STATE_THINKING, citizenSetThought, citizenCheckTodoList, citizenStopMoving } from "../citizen.js";
import { loadCitizenJobFoodGatherer } from "./jobFoodGatherer.js";
import { loadCitizenJobFoodMarket } from "./jobFoodMarket.js";
import { loadCitizenJobHouseConstruction } from "./jobBuildingContruction.js";
import { loadCitizenJobHouseMarket } from "./jobHouseMarket.js";
import { loadCitizenJobLumberjack } from "./jobLumberjack.js";
import { loadCitizenJobWoodMarket } from "./jobWoodMarket.js";
import { calculateDistance } from "../main.js";
import { Inventory, inventoryGetAvailableCapacity } from "../inventory.js";
import { findBuilding } from "../citizenState/citizenStateGetBuilding.js";

export type CitizenJob = {
    name: string,
    marketBuilding?: BuildingMarket,
}

export type FunctionsCitizenJob = {
    create(state: ChatSimState): CitizenJob,
    tick(citizen: Citizen, job: CitizenJob, state: ChatSimState): void,
}

export type FunctionsCitizenJobs = { [key: string]: FunctionsCitizenJob };
export const CITIZEN_STATE_TYPE_CHANGE_JOB = "change job";

export function loadCitizenJobsFunctions(state: ChatSimState) {
    loadCitizenJobFoodGatherer(state);
    loadCitizenJobLumberjack(state);
    loadCitizenJobHouseConstruction(state);
    loadCitizenJobFoodMarket(state);
    loadCitizenJobWoodMarket(state);
    //loadCitizenJobHouseMarket(state);
}

export function citizenChangeJob(citizen: Citizen, jobName: string, state: ChatSimState, reason: string[]) {
    const newJob = createJob(jobName, state);
    if (!newJob) return;
    citizen.job = newJob;
    citizenStopMoving(citizen);
    citizen.stateInfo = {
        type: CITIZEN_STATE_TYPE_CHANGE_JOB,
        stack: [{ state: CITIZEN_STATE_THINKING, tags: new Set() }],
        tags: citizen.stateInfo.tags,
    };
    citizenSetThought(citizen, reason, state);
}

export function createJob(jobname: string, state: ChatSimState): CitizenJob | undefined {
    const jobFunctions = state.functionsCitizenJobs[jobname];
    if (!jobFunctions) return undefined;
    return jobFunctions.create(state);
}

export function tickCitizenJob(citizen: Citizen, state: ChatSimState) {
    if (citizenCheckTodoList(citizen, state)) return;
    const jobFunctions = state.functionsCitizenJobs[citizen.job.name];
    if (jobFunctions === undefined) {
        console.log("job functions missing for job " + citizen.job);
        return;
    }
    jobFunctions.tick(citizen, citizen.job, state);
}

export function isCitizenAtPosition(citizen: Citizen, target: Position) {
    const distance = calculateDistance(citizen.position, target);
    return distance <= citizen.speed;
}

export function isCitizenInVisionDistance(citizen: Citizen, target: Position) {
    const distance = calculateDistance(citizen.position, target);
    return distance <= 120;
}

export function buyItemWithInventories(seller: Citizen, buyer: Citizen, itemName: string, itemPrice: number, sellerInventory: Inventory, buyerInventory: Inventory, state: ChatSimState, requestedAmount: number | undefined = undefined): number | undefined {
    return sellItemWithInventories(seller, buyer, itemName, itemPrice, sellerInventory, buyerInventory, state, requestedAmount);
}

export function sellItemWithInventories(seller: Citizen, buyer: Citizen, itemName: string, itemPrice: number, sellerInventory: Inventory, buyerInventory: Inventory, state: ChatSimState, requestedAmount: number | undefined = undefined): number | undefined {
    const sellerItem = sellerInventory.items.find(i => i.name === itemName);
    if (!sellerItem) return;
    const sellerAmount = sellerItem.counter;
    let buyerInventoryCapacity = inventoryGetAvailableCapacity(buyerInventory, itemName);
    const buyerInventoryMoneyAmount = Math.min(buyerInventoryCapacity, Math.floor(buyer.money / itemPrice));
    const buyerAmount = requestedAmount !== undefined ? Math.min(buyerInventoryMoneyAmount, requestedAmount) : buyerInventoryMoneyAmount;
    const tradeAmount = Math.min(sellerAmount, buyerAmount);
    if (tradeAmount === 0) {
        return;
    }
    let buyerItem = buyerInventory.items.find(i => i.name === itemName);
    if (!buyerItem) {
        buyerItem = { name: itemName, counter: 0 };
        buyerInventory.items.push(buyerItem);
    }
    sellerItem.counter -= tradeAmount;
    buyerItem.counter += tradeAmount;
    const totalPrice = itemPrice * tradeAmount;
    seller.money += totalPrice;
    buyer.money -= totalPrice;
    citizenAddLogEntry(seller, `sold ${tradeAmount} ${itemName} to ${buyer.name} for $${totalPrice}`, state);
    citizenAddLogEntry(buyer, `bought ${tradeAmount} ${itemName} from ${seller.name} for $${totalPrice}`, state);
    return tradeAmount;
}

export function buyItem(seller: Citizen, buyer: Citizen, itemName: string, itemPrice: number, state: ChatSimState, requestedAmount: number | undefined = undefined) {
    return sellItem(seller, buyer, itemName, itemPrice, state, requestedAmount);
}

export function sellItem(seller: Citizen, buyer: Citizen, itemName: string, itemPrice: number, state: ChatSimState, requestedAmount: number | undefined = undefined) {
    return sellItemWithInventories(seller, buyer, itemName, itemPrice, seller.inventory, buyer.inventory, state, requestedAmount);
}

export function findMarketBuilding(citizen: Citizen, state: ChatSimState): BuildingMarket | undefined {
    const building = findBuilding(citizen, "Market", state);
    if (building) return building as BuildingMarket;
    return undefined;

}
