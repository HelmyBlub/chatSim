import { ChatSimState } from "./chatSimModels.js";
import { getCitizenUsedInventoryCapacity, Citizen, addCitizenLogEntry } from "./citizen.js";
import { loadCitizenJobFoodGatherer } from "./jobFoodGatherer.js";
import { loadCitizenJobFoodMarket } from "./jobFoodMarket.js";
import { loadCitizenJobHouseConstruction } from "./jobHouseContruction.js";
import { loadCitizenJobHouseMarket } from "./jobHouseMarket.js";
import { loadCitizenJobLumberjack } from "./jobLumberjack.js";
import { loadCitizenJobWoodMarket } from "./jobWoodMarket.js";
import { calculateDistance } from "./main.js";

export type CitizenJob = {
    name: string,
    state: string,
}

export type FunctionsCitizenJob = {
    create(state: ChatSimState): CitizenJob,
    tick(citizen: Citizen, job: CitizenJob, state: ChatSimState): void,
}

export type FunctionsCitizenJobs = { [key: string]: FunctionsCitizenJob };

export function loadCitizenJobsFunctions(state: ChatSimState) {
    loadCitizenJobFoodGatherer(state);
    loadCitizenJobLumberjack(state);
    loadCitizenJobHouseConstruction(state);
    loadCitizenJobFoodMarket(state);
    loadCitizenJobWoodMarket(state);
    loadCitizenJobHouseMarket(state);
}

export function createJob(jobname: string, state: ChatSimState): CitizenJob {
    const jobFunctions = state.functionsCitizenJobs[jobname];
    return jobFunctions.create(state);
}

export function tickCitizenJob(citizen: Citizen, state: ChatSimState) {
    if (!citizen.job) return;
    const jobFunctions = state.functionsCitizenJobs[citizen.job.name];
    if (jobFunctions === undefined) {
        console.log("job functions missing for job " + citizen.job);
        return;
    }
    jobFunctions.tick(citizen, citizen.job, state);
}

export function isCitizenInInteractDistance(citizen: Citizen, target: Citizen) {
    const distance = calculateDistance(citizen.position, target.position);
    return distance <= target.speed;
}

export function sellItem(seller: Citizen, buyer: Citizen, itemName: string, itemPrice: number, state: ChatSimState) {
    const sellerItem = seller.inventory.find(i => i.name === itemName);
    if (!sellerItem) return;
    const sellerAmount = sellerItem.counter;
    const buyerAmount = Math.min(buyer.maxInventory - getCitizenUsedInventoryCapacity(buyer), Math.floor(buyer.money / itemPrice));
    const tradeAmount = Math.min(sellerAmount, buyerAmount);
    let buyerItem = buyer.inventory.find(i => i.name === itemName);
    if (!buyerItem) {
        buyerItem = { name: itemName, counter: 0 };
        buyer.inventory.push(buyerItem);
    }
    sellerItem.counter -= tradeAmount;
    buyerItem.counter += tradeAmount;
    const totalPrice = itemPrice * tradeAmount;
    seller.money += totalPrice;
    buyer.money -= totalPrice;
    addCitizenLogEntry(seller, `sold ${tradeAmount} ${itemName} to ${buyer.name} for $${totalPrice}`, state);
    addCitizenLogEntry(seller, `bought ${tradeAmount} ${itemName} from ${seller.name} for $${totalPrice}`, state);
}
