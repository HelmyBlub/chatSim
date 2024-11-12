import { ChatSimState, Citizen } from "./chatSimModels.js";
import { tickCitizenNeeds } from "./citizenNeeds.js";
import { tickCitizenJob } from "./job.js";
import { CITIZEN_JOB_FOOD_MARKET } from "./jobFoodMarket.js";
import { calculateDistance, INVENTORY_MUSHROOM } from "./main.js";

export function canCitizenCarryMore(citizen: Citizen): boolean {
    return getCitizenUsedInventoryCapacity(citizen) < citizen.maxInventory;
}

export function getCitizenUsedInventoryCapacity(citizen: Citizen): number {
    let counter = 0;
    for (let item of citizen.inventory) {
        counter += item.counter;
    }
    return counter;
}

export function tickCitizens(state: ChatSimState) {
    for (let citizen of state.map.citizens) {
        tickCitizen(citizen, state);
    }
    deleteStarvedCitizens(state);
}

function tickCitizen(citizen: Citizen, state: ChatSimState) {
    citizen.foodPerCent -= 0.0010;
    tickCitizenNeeds(citizen, state);
    tickCitizenState(citizen, state);
    citizenMoveToTick(citizen);
}

function tickCitizenState(citizen: Citizen, state: ChatSimState) {
    if (citizen.state === "workingJob") {
        tickCitizenJob(citizen, state);
    } else if (citizen.state === "buyFoodFromMarket") {
        if (citizen.moveTo === undefined) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket) {
                const distance = calculateDistance(foodMarket.position, citizen.position);
                if (distance <= citizen.speed) {
                    const mushroom = foodMarket.inventory.find(i => i.name === INVENTORY_MUSHROOM);
                    if (mushroom) {
                        const mushroomFoodValue = 0.5;
                        citizen.foodPerCent = Math.min(citizen.foodPerCent + mushroomFoodValue, 1);
                        mushroom.counter--;
                        const mushroomCost = 2;
                        citizen.money -= mushroomCost;
                        foodMarket.money += mushroomCost;
                        citizen.state = "workingJob";
                    }
                }
            }
        }
    }
}

function deleteStarvedCitizens(state: ChatSimState) {
    for (let i = state.map.citizens.length - 1; i >= 0; i--) {
        if (state.map.citizens[i].foodPerCent < 0) {
            let deceased = state.map.citizens.splice(i, 1)[0];
            if (deceased.home) {
                if (deceased.home.owner === deceased && state.map.citizens.length > 0) {
                    const randomNewOwnerIndex = Math.floor(Math.random() * state.map.citizens.length);
                    const randomNewOwner = state.map.citizens[randomNewOwnerIndex];
                    deceased.home.owner = randomNewOwner;
                    if (!randomNewOwner.home) {
                        randomNewOwner.home = deceased.home;
                    }
                }
                if (deceased.home.inhabitedBy === deceased) {
                    deceased.home.inhabitedBy = undefined;
                }
            }
        }
    }
}

function citizenMoveToTick(citizen: Citizen) {
    if (citizen.moveTo) {
        const diffX = citizen.moveTo.x - citizen.position.x;
        const diffY = citizen.moveTo.y - citizen.position.y;
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);
        if (citizen.speed - distance > 0) {
            citizen.position.x = citizen.moveTo.x;
            citizen.position.y = citizen.moveTo.y;
            citizen.moveTo = undefined;
        } else {
            const factor = citizen.speed / distance;
            citizen.position.x += diffX * factor;
            citizen.position.y += diffY * factor;
        }
    }
}

export function findClosestFoodMarket(searcher: Citizen, citizens: Citizen[], shouldHaveFood: boolean): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        const ivnentoryMushroom = citizen.inventory.find(i => i.name === INVENTORY_MUSHROOM);
        if (citizen.job && citizen.job.name === CITIZEN_JOB_FOOD_MARKET && (!shouldHaveFood || (ivnentoryMushroom && ivnentoryMushroom.counter > 0))) {
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
