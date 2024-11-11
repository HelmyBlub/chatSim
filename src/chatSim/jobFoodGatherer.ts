import { CitizenJob, createJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_FOOD_MARKET } from "./jobFoodMarket.js";
import { calculateDistance, ChatSimState, Citizen, INVENTORY_MUSHROOM, SKILL_GATHERING } from "./main.js";
import { canCitizenCarryMore } from "./tick.js";

export type CitizenJobFoodGatherer = CitizenJob & {
    state: "gathering" | "selling",
}

export const CITIZEN_JOB_FOOD_GATHERER = "Food Gatherer";

export function loadCitizenJobFoodGatherer(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_GATHERER] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobFoodGatherer {
    return {
        name: CITIZEN_JOB_FOOD_GATHERER,
        state: "gathering",
    }
}


function tick(citizen: Citizen, job: CitizenJobFoodGatherer, state: ChatSimState) {
    if (job.state === "gathering") {
        if (canCitizenCarryMore(citizen)) {
            moveToMushroom(citizen, state);
            const isCloseToMushroomIndex = isCloseToMushroom(citizen, state);
            if (isCloseToMushroomIndex !== undefined) {
                pickUpMushroom(citizen, state, isCloseToMushroomIndex);
            }
        } else {
            job.state = "selling";
        }
    }
    if (job.state === "selling") {
        const foodMarket = findAFoodMarketWhichHasMoneyAndCapacity(citizen, state.map.citizens);
        if (foodMarket) {
            if (isCitizenInInteractDistance(foodMarket, citizen)) {
                const mushroomPrice = 1;
                sellItem(citizen, foodMarket, INVENTORY_MUSHROOM, mushroomPrice);
                job.state = "gathering";
            } else {
                citizen.moveTo = {
                    x: foodMarket.position.x,
                    y: foodMarket.position.y,
                }
            }
        } else {
            citizen.job = createJob(CITIZEN_JOB_FOOD_MARKET, state);
        }
    }
}

function findAFoodMarketWhichHasMoneyAndCapacity(searcher: Citizen, citizens: Citizen[]): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen.job && citizen.job.name === CITIZEN_JOB_FOOD_MARKET && citizen.money > 2 && canCitizenCarryMore(citizen)) {
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


function sellMushrooms(citizen: Citizen, foodMarket: Citizen) {
    const sellerAmount = citizen.inventory.length;
    const marketMaxBuyAmount = Math.min(foodMarket.money, foodMarket.maxInventory - foodMarket.inventory.length);
    const toSell = Math.min(sellerAmount, marketMaxBuyAmount);
    const mushroomCost = 1;
    for (let i = 0; i < toSell; i++) {
        const mushroom = citizen.inventory.shift();
        if (mushroom) {
            foodMarket.inventory.push(mushroom);
            foodMarket.money -= mushroomCost;
            citizen.money += mushroomCost;
        }
    }
}

function pickUpMushroom(citizen: Citizen, state: ChatSimState, mushroomIndex: number) {
    state.map.mushrooms.splice(mushroomIndex, 1)[0];
    let inventoryMushroom = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
    if (inventoryMushroom === undefined) {
        inventoryMushroom = { name: INVENTORY_MUSHROOM, counter: 0 };
        citizen.inventory.push(inventoryMushroom);
    }
    inventoryMushroom.counter++;
    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (Math.random() < skillGathering / 100) {
        inventoryMushroom.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}

function isCloseToMushroom(citizen: Citizen, state: ChatSimState): number | undefined {
    for (let i = state.map.mushrooms.length - 1; i >= 0; i--) {
        const mushroom = state.map.mushrooms[i];
        const distance = calculateDistance(mushroom.position, citizen.position);
        if (distance < 10) return i;
    }
    return undefined;
}

function moveToMushroom(citizen: Citizen, state: ChatSimState) {
    if (!citizen.moveTo && state.map.mushrooms.length > 0) {
        const mushroomIndex = Math.floor(Math.random() * state.map.mushrooms.length);
        citizen.moveTo = {
            x: state.map.mushrooms[mushroomIndex].position.x,
            y: state.map.mushrooms[mushroomIndex].position.y,
        }
    }
}