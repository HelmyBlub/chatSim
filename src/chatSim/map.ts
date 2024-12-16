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
    const tilesHorizontal = 100;
    const tilesVertical = 100;
    const maxTrees = 300;
    const maxMushrooms = 600;
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

export function mapIsPositionVisible(position: Position, mapPaint: PaintDataMap) {
    const visionWidth = mapPaint.paintWidth / mapPaint.zoom;
    const visionHeight = mapPaint.paintHeight / mapPaint.zoom;
    const mapVisionTopLeft: Position = {
        x: mapPaint.cameraPosition.x - visionWidth / 2,
        y: mapPaint.cameraPosition.y - visionHeight / 2,
    };
    if (mapVisionTopLeft.x <= position.x && mapVisionTopLeft.x + visionWidth >= position.x
        && mapVisionTopLeft.y <= position.y && mapVisionTopLeft.y + visionHeight >= position.y
    ) {
        return true;
    }
    return false;
}

export function mapIsPositionOutOfBounds(position: Position, map: ChatSimMap): boolean {
    if (- map.mapWidth / 2 > position.x || map.mapWidth / 2 < position.x
        || - map.mapHeight / 2 > position.y || map.mapHeight / 2 < position.y
    ) {
        return true;
    }
    return false;
}

export function mapCanvasPositionToMapPosition(canvasPosition: Position, mapPaint: PaintDataMap) {
    const visionWidth = mapPaint.paintWidth / mapPaint.zoom;
    const visionHeight = mapPaint.paintHeight / mapPaint.zoom;
    const mapVisionTopLeft: Position = {
        x: mapPaint.cameraPosition.x - visionWidth / 2,
        y: mapPaint.cameraPosition.y - visionHeight / 2,
    };
    return {
        x: mapVisionTopLeft.x + canvasPosition.x / mapPaint.zoom,
        y: mapVisionTopLeft.y + canvasPosition.y / mapPaint.zoom,
    }
}

export function mapGetVisionBorderPositionClosestToPoint(position: Position, mapPaint: PaintDataMap) {
    const visionWidth = mapPaint.paintWidth / mapPaint.zoom;
    const visionHeight = mapPaint.paintHeight / mapPaint.zoom;
    const mapVisionTopLeft: Position = {
        x: mapPaint.cameraPosition.x - visionWidth / 2,
        y: mapPaint.cameraPosition.y - visionHeight / 2,
    };
    const distanceLeft = position.x - mapVisionTopLeft.x;
    const distanceRight = mapVisionTopLeft.x + visionWidth - position.x;
    const distanceTop = position.y - mapVisionTopLeft.y;
    const distanceBottom = mapVisionTopLeft.y + visionHeight - position.y;
    if (distanceLeft > 0 && distanceRight > 0) {
        if (distanceTop > 0 && distanceBottom > 0) {
            const min = Math.min(distanceLeft, distanceRight, distanceBottom, distanceTop);
            if (min === distanceLeft) return { x: mapVisionTopLeft.x, y: position.y };
            if (min === distanceRight) return { x: mapVisionTopLeft.x + visionWidth, y: position.y };
            if (min === distanceTop) return { x: position.x, y: mapVisionTopLeft.y };
            if (min === distanceBottom) return { x: position.x, y: mapVisionTopLeft.y + visionHeight };
        } else {
            if (distanceTop < distanceBottom) {
                return { x: position.x, y: mapVisionTopLeft.y };
            } else {
                return { x: position.x, y: mapVisionTopLeft.y + visionHeight }
            }
        }
    } else {
        if (distanceTop > 0 && distanceBottom > 0) {
            if (distanceLeft < distanceRight) {
                return { x: mapVisionTopLeft.x, y: position.y };
            } else {
                return { x: mapVisionTopLeft.x + visionWidth, y: position.y };
            }
        } else {
            if (distanceTop < 0 && distanceLeft < 0) return { x: mapVisionTopLeft.x, y: mapVisionTopLeft.y };
            if (distanceTop < 0 && distanceRight < 0) return { x: mapVisionTopLeft.x + visionWidth, y: mapVisionTopLeft.y };
            if (distanceBottom < 0 && distanceLeft < 0) return { x: mapVisionTopLeft.x, y: mapVisionTopLeft.y + visionHeight };
            if (distanceBottom < 0 && distanceRight < 0) return { x: mapVisionTopLeft.x + visionWidth, y: mapVisionTopLeft.y + visionHeight };
        }
    }
    throw "should not happen";
}

export function removeBuildingFromMap(building: Building, map: ChatSimMap) {
    const usedTileIndex = map.usedTiles.findIndex(t => t.object === building);
    if (usedTileIndex === -1) return;
    const houseIndex = map.buildings.findIndex(h => h === building);
    if (houseIndex === -1) return;
    map.buildings.splice(houseIndex, 1);
    building.deletedFromMap = true;
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
    const maxSpawn = Math.min(state.map.maxTrees - state.map.trees.length, 100);
    for (let i = 0; i < maxSpawn; i++) {
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
        if (state.map.emptyTiles.length === 0) return undefined;
    }
}

function mushroomSpawnTick(state: ChatSimState) {
    if (state.map.mushrooms.length >= state.map.maxMushrooms) return;
    if (state.map.emptyTiles.length === 0) return undefined;
    const maxSpawn = Math.min(state.map.maxMushrooms - state.map.mushrooms.length, 100);
    for (let i = 0; i < maxSpawn; i++) {
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
        if (state.map.emptyTiles.length === 0) return undefined;
    }
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
