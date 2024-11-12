import { ChatSimState, Tree, Mushroom } from "./chatSimModels.js";
import { tickCitizens } from "./citizen.js";

export function chatSimTick(state: ChatSimState) {
    state.time += 16;
    tickCitizens(state);
    mushroomSpawnTick(state);
    treeSpawnTick(state);
    tickHouses(state);
}

function tickHouses(state: ChatSimState) {
    for (let i = 0; i < state.map.houses.length; i++) {
        const house = state.map.houses[i];
        house.deterioration += 0.00005;
        if (house.deterioration > 1) {
            const brokenDownHouse = state.map.houses.splice(i, 1)[0];
            if (brokenDownHouse.inhabitedBy) brokenDownHouse.inhabitedBy.home = undefined;
        }
    }
}

function treeSpawnTick(state: ChatSimState) {
    if (state.map.trees.length < state.map.maxTrees) {
        const newTree: Tree = {
            woodValue: 10,
            position: {
                x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
            }
        }
        state.map.trees.push(newTree);
    }
}

function mushroomSpawnTick(state: ChatSimState) {
    if (state.map.mushrooms.length < state.map.maxMushrooms) {
        const newMushrooms: Mushroom = {
            position: {
                x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
                y: Math.random() * state.map.mapHeight - state.map.mapHeight / 2,
            }
        }
        state.map.mushrooms.push(newMushrooms);
    }
}
