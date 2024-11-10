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
    citizen.job = "food gatherer";
    citizen.state = "gatherFood";
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
                }
                if (citizen.carryStuff.length >= citizen.maxCarry) citizen.state = "idle";
                //citizen.foodPerCent = Math.min(citizen.foodPerCent + mushroom.foodValue, 1);
                break;
            }
        }
    }
    if (citizen.foodPerCent < 0.5) {
        if (citizen.carryStuff.length > 0) {
            const mushroomToEat: Mushroom = citizen.carryStuff.shift()!;
            citizen.foodPerCent = Math.min(citizen.foodPerCent + mushroomToEat.foodValue, 1);
            if (citizen.job === "food gatherer" && citizen.carryStuff.length < citizen.maxCarry) citizen.state = "gatherFood";
        } else {
            if (citizen.state !== "gatherFood") citizen.state = "gatherFood";
        }
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