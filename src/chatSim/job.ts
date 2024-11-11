import { CITIZEN_JOB_FOOD_GATHERER, loadCitizenJobFoodGatherer } from "./jobFoodGatherer.js";
import { loadCitizenJobFoodMarket } from "./jobFoodMarket.js";
import { loadCitizenJobLumberjack } from "./jobLumberjack.js";
import { loadCitizenJobWoodMarket } from "./jobWoodMarket.js";
import { calculateDistance, ChatSimState, Citizen } from "./main.js"
import { getCitizenUsedInventoryCapacity } from "./tick.js";

export type CitizenJob = {
    name: string,
    state: string,
}

export type FunctionsCitizenJob = {
    create(state: ChatSimState): CitizenJob,
    tick(citizen: Citizen, job: CitizenJob, state: ChatSimState): void,
}

export type FunctionsCitizenJobs = { [key: string]: FunctionsCitizenJob };

export function loadCitizenJobs(state: ChatSimState) {
    loadCitizenJobFoodGatherer(state);
    loadCitizenJobLumberjack(state);
    loadCitizenJobFoodMarket(state);
    loadCitizenJobWoodMarket(state);
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

export function isCitizenInInteractDistance(foodMarket: Citizen, seller: Citizen) {
    const distance = calculateDistance(foodMarket.position, seller.position);
    return distance <= seller.speed;
}

export function sellItem(seller: Citizen, buyer: Citizen, itemName: string, itemPrice: number) {
    const sellerItem = seller.inventory.find(i => i.name = itemName);
    if (!sellerItem) return;
    const sellerAmount = sellerItem.counter;
    const buyerAmount = Math.min(buyer.maxInventory - getCitizenUsedInventoryCapacity(buyer), Math.floor(buyer.money / itemPrice));
    const tradeAmount = Math.min(sellerAmount, buyerAmount);
    let buyerItem = seller.inventory.find(i => i.name = itemName);
    if (!buyerItem) {
        buyerItem = { name: itemName, counter: 0 };
        buyer.inventory.push(buyerItem);
    }
    sellerItem.counter -= tradeAmount;
    buyerItem.counter += tradeAmount;
    seller.money += itemPrice * tradeAmount;
    buyer.money -= itemPrice * tradeAmount;
}
