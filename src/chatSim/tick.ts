import { calculateDistance, ChatSimState, Citizen, Mushroom } from "./main.js";

export function chatSimTick(state: ChatSimState) {
    state.time += 16;
    for (let citizen of state.map.citizens) {
        tickCitizen(citizen, state);
    }
    mushroomSpawnTick(state);
    deleteStarvedCitizens(state);
}

function searchJob(citizen: Citizen, state: ChatSimState) {
    if (citizen.job) return;
    if (state.map.citizens[0] === citizen) {
        citizen.job = "food gatherer";
        citizen.state = "gatherFood";
        return;
    }
    if (Math.random() < 0.7) {
        citizen.job = "food gatherer";
        citizen.state = "gatherFood";
    } else {
        citizen.job = "food market";
        citizen.state = "stationary";
        citizen.maxCarry = 100;
        citizen.moveTo = {
            x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
            y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
        }
    }
}

function findClosestFoodMarket(searcher: Citizen, citizens: Citizen[], shouldHaveFood: boolean): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen.job === "food market" && (!shouldHaveFood || citizen.carryStuff.length > 0)) {
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

function tickCitizen(citizen: Citizen, state: ChatSimState) {
    citizen.foodPerCent -= 0.0010;
    searchJob(citizen, state);
    if (citizen.state === "idle") {
        if (!citizen.moveTo) {
            citizen.moveTo = {
                x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
            }
        }
    } else if (citizen.state === "gatherFood") {
        if (!citizen.moveTo && state.map.mushrooms.length > 0) {
            const mushroomIndex = Math.floor(Math.random() * state.map.mushrooms.length);
            citizen.moveTo = {
                x: state.map.mushrooms[mushroomIndex].position.x,
                y: state.map.mushrooms[mushroomIndex].position.y,
            }
        }
        for (let i = state.map.mushrooms.length - 1; i >= 0; i--) {
            const mushroom = state.map.mushrooms[i];
            const distance = calculateDistance(mushroom.position, citizen.position);
            if (distance < 10) {
                const gatheredMushroom = state.map.mushrooms.splice(i, 1)[0];
                citizen.carryStuff.push(gatheredMushroom);
                if (citizen.job === "food gatherer") {
                    if (citizen.skill[citizen.job] === undefined) citizen.skill[citizen.job] = 0;
                    if (Math.random() < citizen.skill[citizen.job] / 100) {
                        citizen.carryStuff.push({
                            foodValue: gatheredMushroom.foodValue,
                            position: { x: 0, y: 0 },
                        });
                    }
                    if (citizen.skill[citizen.job] < 100) citizen.skill[citizen.job] += 1;
                } else if (citizen.job === "food market") {
                    citizen.state = "stationary";
                    citizen.moveTo = {
                        x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                        y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
                    }
                }
                if (citizen.carryStuff.length >= citizen.maxCarry) {
                    citizen.state = "sellingToMarket";
                    const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, false);
                    if (foodMarket) {
                        citizen.moveTo = {
                            x: foodMarket.position.x,
                            y: foodMarket.position.y,
                        }
                    } else {
                        citizen.state = "idle";
                    }
                };
                break;
            }
        }
    } else if (citizen.state === "buyFoodFromMarket") {
        if (citizen.moveTo === undefined) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket) {
                const distance = calculateDistance(foodMarket.position, citizen.position);
                if (distance <= citizen.speed) {
                    const mushroom = foodMarket.carryStuff.shift();
                    if (mushroom) {
                        citizen.foodPerCent = Math.min(citizen.foodPerCent + mushroom.foodValue, 1);
                        const mushroomCost = 2;
                        citizen.money -= mushroomCost;
                        foodMarket.money += mushroomCost;
                        if (citizen.job === "food market") citizen.state = "stationary";
                        if (citizen.job === "food gatherer") citizen.state = "gatherFood";
                    }
                }
            }
        }
    } else if (citizen.state === "sellingToMarket") {
        if (citizen.moveTo === undefined) {
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, false);
            if (foodMarket) {
                const distance = calculateDistance(foodMarket.position, citizen.position);
                if (distance <= citizen.speed) {
                    const sellerAmount = citizen.carryStuff.length;
                    const marketMaxBuyAmount = Math.min(foodMarket.money, foodMarket.maxCarry - foodMarket.carryStuff.length);
                    const toSell = Math.min(sellerAmount, marketMaxBuyAmount);
                    const mushroomCost = 1;
                    for (let i = 0; i < toSell; i++) {
                        const mushroom = citizen.carryStuff.shift();
                        if (mushroom) {
                            foodMarket.carryStuff.push(mushroom);
                            foodMarket.money -= mushroomCost;
                            citizen.money += mushroomCost;
                        }
                    }
                    if (citizen.job === "food gatherer") citizen.state = "gatherFood";
                } else {
                    citizen.moveTo = {
                        x: foodMarket.position.x,
                        y: foodMarket.position.y,
                    }
                }
            } else {
                citizen.state = "idle";
            }
        }
    }
    if (citizen.foodPerCent < 0.5) {
        let foodFound = false;
        if (citizen.money >= 2) {
            citizen.state = "buyFoodFromMarket";
            const foodMarket = findClosestFoodMarket(citizen, state.map.citizens, true);
            if (foodMarket) {
                citizen.moveTo = {
                    x: foodMarket.position.x,
                    y: foodMarket.position.y,
                }
                foodFound = true;
            }
        }
        if (!foodFound && citizen.carryStuff.length > 0) {
            const mushroomToEat: Mushroom = citizen.carryStuff.shift()!;
            citizen.foodPerCent = Math.min(citizen.foodPerCent + mushroomToEat.foodValue, 1);
            foodFound = true;
            if (citizen.job === "food gatherer") {
                citizen.state = "idle";
                if (citizen.carryStuff.length < citizen.maxCarry) citizen.state = "gatherFood";
            }
        }
        if (!foodFound && citizen.state !== "gatherFood") citizen.state = "gatherFood";
    }
    citizenMoveToTick(citizen);
}

function deleteStarvedCitizens(state: ChatSimState) {
    for (let i = state.map.citizens.length - 1; i >= 0; i--) {
        if (state.map.citizens[i].foodPerCent < 0) {
            state.map.citizens.splice(i, 1);
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

function mushroomSpawnTick(state: ChatSimState) {
    if (state.map.mushrooms.length < state.map.maxMushrooms) {
        const newMushrooms: Mushroom = {
            foodValue: 1,
            position: {
                x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
            }
        }
        state.map.mushrooms.push(newMushrooms);
    }
}