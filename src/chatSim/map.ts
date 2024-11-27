import { Mushroom, ChatSimState, Position } from "./chatSimModels.js";
import { Building, BuildingType, createBuilding, tickBuildings } from "./building.js";
import { Citizen } from "./citizen.js";
import { nextRandom } from "./main.js";
import { createTree, Tree } from "./tree.js";

export type TilePosition = {
    tileX: number,
    tileY: number,
}

export type Tile = {
    position: TilePosition,
    usedByType: string,
    object: any,
}

export type PaintDataMap = {
    paintOffset: Position
    paintHeight: number
    paintWidth: number
    zoom: number
    cameraPosition: Position
    lockCameraToSelected: boolean
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
    buildings: Building[],
    maxTrees: number,
}

export function createDefaultMap(): ChatSimMap {
    const tilesHorizontal = 16;
    const tilesVertical = 9;
    const maxTrees = 3;
    const maxMushrooms = 6;
    const map: ChatSimMap = createMap(tilesHorizontal, tilesVertical, maxMushrooms, maxTrees);
    fillAllTilesAtStart(map);
    return map;
}

export function createMap(tilesHorizontal: number, tilesVertical: number, maxMushrooms: number, maxTrees: number) {
    const tileSize = 60;
    const map: ChatSimMap = {
        tileSize: tileSize,
        tileCounterHorizontal: tilesHorizontal,
        tileCounterVertical: tilesVertical,
        mapHeight: tileSize * tilesVertical,
        mapWidth: tileSize * tilesHorizontal,
        citizens: [],
        mushrooms: [],
        maxMushrooms: maxMushrooms,
        maxTrees: maxTrees,
        trees: [],
        buildings: [],
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
    state.map.buildings.push(house);
    state.map.emptyTiles.splice(emptyTileIndex, 1);
    state.map.usedTiles.push({
        position: tilePosition,
        usedByType: buildingType,
        object: house,
    });
    return house;
}

export function removeBuildingFromMap(building: Building, map: ChatSimMap) {
    const usedTileIndex = map.usedTiles.findIndex(t => t.object === building);
    if (usedTileIndex === -1) return;
    const houseIndex = map.buildings.findIndex(h => h === building);
    if (houseIndex === -1) return;
    map.buildings.splice(houseIndex, 1);
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
    tickTreeSpawn(state);
    mushroomSpawnTick(state);
    tickBuildings(state);
}

function tickTreeSpawn(state: ChatSimState) {
    if (state.map.trees.length >= state.map.maxTrees) return;
    if (state.map.emptyTiles.length === 0) return undefined;
    const emptyTileIndex = getRandomEmptyTileIndex(state);
    const tilePosition = state.map.emptyTiles[emptyTileIndex];
    const mapPosition = tilePositionToMapPosition(tilePosition, state.map);
    const newTree: Tree = createTree(mapPosition);
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

function getRandomEmptyTileIndex(state: ChatSimState): number {
    return Math.floor(nextRandom(state.randomSeed) * state.map.emptyTiles.length);
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
