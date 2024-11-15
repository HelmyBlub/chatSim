import { Mushroom, Tree, Building, ChatSimState, Position, BuildingType } from "./chatSimModels.js";
import { Citizen } from "./citizen.js";

export type TilePosition = {
    tileX: number,
    tileY: number,
}

export type Tile = {
    position: TilePosition,
    usedByType: string,
    object: any,
}

export type ChatSimMap = {
    tileSize: number,
    tileCounterHorizontal: number,
    tileCounterVertical: number,
    mapHeight: number,
    mapWidth: number,
    citizens: Citizen[],
    mushrooms: Mushroom[],
    maxMushrooms: number,
    usedTiles: Tile[],
    emptyTiles: TilePosition[],
    trees: Tree[],
    houses: Building[],
    maxTrees: number,
}

export function createDefaultMap(): ChatSimMap {
    const tileSize = 60;
    const tilesHorizontal = 10;
    const tilesVertical = 10;
    const map: ChatSimMap = {
        tileSize: tileSize,
        tileCounterHorizontal: tilesHorizontal,
        tileCounterVertical: tilesVertical,
        mapHeight: tileSize * tilesVertical,
        mapWidth: tileSize * tilesHorizontal,
        citizens: [],
        mushrooms: [],
        maxMushrooms: 3,
        maxTrees: 2,
        trees: [],
        houses: [],
        emptyTiles: [],
        usedTiles: [],
    }
    fillAllTilesAtStart(map);
    return map;
}

export function createBuildingOnRandomTile(owner: Citizen, state: ChatSimState, buildingType: BuildingType): Building | undefined {
    if (state.map.emptyTiles.length === 0) return undefined;
    const emptyTileIndex = getRandomEmptyTileIndex(state);
    const tilePosition = state.map.emptyTiles[emptyTileIndex];
    const mapPosition = tilePositionToMapPosition(tilePosition, state.map);
    const house = createBuilding(owner, mapPosition, buildingType);
    state.map.houses.push(house);
    state.map.emptyTiles.splice(emptyTileIndex, 1);
    state.map.usedTiles.push({
        position: tilePosition,
        usedByType: buildingType,
        object: house,
    });
    return house;
}

export function removeHouseFromMap(house: Building, map: ChatSimMap) {
    const usedTileIndex = map.usedTiles.findIndex(t => t.object === house);
    if (usedTileIndex === -1) return;
    const houseIndex = map.houses.findIndex(h => h === house);
    if (houseIndex === -1) return;
    map.houses.splice(houseIndex, 1);
    const usedTile = map.usedTiles.splice(usedTileIndex, 1)[0];
    map.emptyTiles.push({
        tileX: usedTile.position.tileX,
        tileY: usedTile.position.tileY,
    });
}

export function removeTreeFromMap(tree: Tree, map: ChatSimMap) {
    const usedTileIndex = map.usedTiles.findIndex(t => t.object === tree);
    if (usedTileIndex === -1) return;
    const treeIndex = map.trees.findIndex(h => h === tree);
    if (treeIndex === -1) return;
    map.trees.splice(treeIndex, 1);
    const usedTile = map.usedTiles.splice(usedTileIndex, 1)[0];
    map.emptyTiles.push({
        tileX: usedTile.position.tileX,
        tileY: usedTile.position.tileY,
    });
}

export function removeMushroomFromMap(mushroom: Mushroom, map: ChatSimMap) {
    const usedTileIndex = map.usedTiles.findIndex(t => t.object === mushroom);
    if (usedTileIndex === -1) return;
    const mushroomIndex = map.mushrooms.findIndex(h => h === mushroom);
    if (mushroomIndex === -1) return;
    map.mushrooms.splice(mushroomIndex, 1);
    const usedTile = map.usedTiles.splice(usedTileIndex, 1)[0];
    map.emptyTiles.push({
        tileX: usedTile.position.tileX,
        tileY: usedTile.position.tileY,
    });
}

export function tilePositionToMapPosition(tilePosition: TilePosition, map: ChatSimMap): Position {
    return {
        x: tilePosition.tileX * map.tileSize + map.tileSize / 2 - map.mapWidth / 2,
        y: tilePosition.tileY * map.tileSize + map.tileSize / 2 - map.mapHeight / 2,
    }
}

export function tickChatSimMap(state: ChatSimState) {
    treeSpawnTick(state);
    mushroomSpawnTick(state);
    tickHouses(state);
}

function treeSpawnTick(state: ChatSimState) {
    if (state.map.trees.length >= state.map.maxTrees) return;
    if (state.map.emptyTiles.length === 0) return undefined;
    const emptyTileIndex = getRandomEmptyTileIndex(state);
    const tilePosition = state.map.emptyTiles[emptyTileIndex];
    const mapPosition = tilePositionToMapPosition(tilePosition, state.map);
    const newTree: Tree = {
        woodValue: 10,
        position: {
            x: mapPosition.x,
            y: mapPosition.y,
        }
    }
    state.map.emptyTiles.splice(emptyTileIndex, 1);
    state.map.usedTiles.push({
        position: tilePosition,
        usedByType: "Tree",
        object: newTree,
    });
    state.map.trees.push(newTree);
}

function mushroomSpawnTick(state: ChatSimState) {
    if (state.map.mushrooms.length >= state.map.maxMushrooms) return;
    if (state.map.emptyTiles.length === 0) return undefined;
    const emptyTileIndex = getRandomEmptyTileIndex(state);
    const tilePosition = state.map.emptyTiles[emptyTileIndex];
    const mapPosition = tilePositionToMapPosition(tilePosition, state.map);
    const mushroom: Mushroom = {
        position: {
            x: mapPosition.x,
            y: mapPosition.y,
        }
    }
    state.map.emptyTiles.splice(emptyTileIndex, 1);
    state.map.usedTiles.push({
        position: tilePosition,
        usedByType: "Mushroom",
        object: mushroom,
    });
    state.map.mushrooms.push(mushroom);
}

function tickHouses(state: ChatSimState) {
    for (let i = 0; i < state.map.houses.length; i++) {
        const house = state.map.houses[i];
        house.deterioration += 0.00005;
        if (house.deterioration > 1) {
            removeHouseFromMap(house, state.map);
            if (house.inhabitedBy) house.inhabitedBy.home = undefined;
        }
    }
}

function getRandomEmptyTileIndex(state: ChatSimState): number {
    return Math.floor(Math.random() * state.map.emptyTiles.length);
}

function createBuilding(owner: Citizen, position: Position, type: BuildingType): Building {
    return {
        type: type,
        owner: owner,
        inventory: [],
        maxInventory: 50,
        position: {
            x: position.x,
            y: position.y,
        },
        buildProgress: 0,
        deterioration: 0,
    }
}

function fillAllTilesAtStart(map: ChatSimMap) {
    if (map.emptyTiles.length !== 0) return;
    for (let x = 0; x < map.tileCounterHorizontal; x++) {
        for (let y = 0; y < map.tileCounterVertical; y++) {
            map.emptyTiles.push({
                tileX: x,
                tileY: y,
            });
        }
    }
}