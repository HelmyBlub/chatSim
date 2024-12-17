import { Mushroom, ChatSimState, Position } from "./chatSimModels.js";
import { Building, BuildingType, createBuilding, tickBuildings } from "./building.js";
import { Citizen } from "./citizen.js";
import { calculateDistance, nextRandom } from "./main.js";
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
    defaultChunkLength: number,
    tileCounterHorizontal: number,
    tileCounterVertical: number,
    zeroChunkTopLeft: Position,
    mapHeight: number,
    mapWidth: number,
    citizens: Citizen[],
    maxMushrooms: number,
    mushroomCounter: number,
    maxTrees: number,
    treeCounter: number,
    mapChunks: { [key: string]: MapChunk },
}

export type MapChunk = {
    tilesHorizontal: number,
    tilesVertical: number,
    usedTiles: Tile[],
    emptyTiles: TilePosition[],
    mushrooms: Mushroom[],
    trees: Tree[],
    buildings: Building[],
}

export function createDefaultMap(): ChatSimMap {
    const tilesHorizontal = 100;
    const tilesVertical = 100;
    const maxTrees = 300;
    const maxMushrooms = 600;
    const map: ChatSimMap = createMap(tilesHorizontal, tilesVertical, maxMushrooms, maxTrees);
    fillAllChunksAtStart(map);
    return map;
}

export function createMap(tilesHorizontal: number, tilesVertical: number, maxMushrooms: number, maxTrees: number) {
    const tileSize = 60;
    const map: ChatSimMap = {
        tileSize: tileSize,
        defaultChunkLength: 8,
        tileCounterHorizontal: tilesHorizontal,
        tileCounterVertical: tilesVertical,
        mapHeight: tileSize * tilesVertical,
        mapWidth: tileSize * tilesHorizontal,
        citizens: [],
        maxMushrooms: maxMushrooms,
        mushroomCounter: 0,
        maxTrees: maxTrees,
        treeCounter: 0,
        zeroChunkTopLeft: { x: 100, y: 50 },
        mapChunks: {},
    }
    fillAllChunksAtStart(map);
    return map;
}

export function createBuildingOnRandomTile(owner: Citizen, state: ChatSimState, buildingType: BuildingType, buildPositionCenter: Position): Building | undefined {
    const emptyTileInfo = getRandomEmptyTileInfoInDistance(state, buildPositionCenter, 400);
    if (!emptyTileInfo) return undefined;
    const chunk = state.map.mapChunks[emptyTileInfo.chunkKey];
    const emptyTile = chunk.emptyTiles[emptyTileInfo.tileIndex];
    const mapPosition = chunkKeyAndTileToPosition(emptyTileInfo.chunkKey, emptyTile, state.map);
    if (!mapPosition) return;
    const house = createBuilding(owner, mapPosition, buildingType);
    chunk.buildings.push(house);
    chunk.emptyTiles.splice(emptyTileInfo.tileIndex, 1);
    chunk.usedTiles.push({
        position: emptyTile,
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
    const chunk = mapGetChunkForPosition(position, map);
    if (!chunk) return true;
    const chunkDefaultSize = map.tileSize * map.defaultChunkLength;
    const positionChunkX = position.x % chunkDefaultSize;
    const positionChunkY = position.y % chunkDefaultSize;
    if (chunk.tilesHorizontal * map.tileSize > positionChunkX && chunk.tilesVertical * map.tileSize > positionChunkY) {
        return false;
    }
    return true;
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
    const chunk = mapGetChunkForPosition(building.position, map);
    if (!chunk) return;
    const usedTileIndex = chunk.usedTiles.findIndex(t => t.object === building);
    if (usedTileIndex === -1) return;
    const houseIndex = chunk.buildings.findIndex(h => h === building);
    if (houseIndex === -1) return;
    chunk.buildings.splice(houseIndex, 1);
    building.deletedFromMap = true;
    const usedTile = chunk.usedTiles.splice(usedTileIndex, 1)[0];
    chunk.emptyTiles.push({
        tileX: usedTile.position.tileX,
        tileY: usedTile.position.tileY,
    });
}

export function removeTreeFromMap(tree: Tree, map: ChatSimMap) {
    const chunk = mapGetChunkForPosition(tree.position, map);
    if (!chunk) return;
    const usedTileIndex = chunk.usedTiles.findIndex(t => t.object === tree);
    if (usedTileIndex === -1) return;
    const treeIndex = chunk.trees.findIndex(h => h === tree);
    if (treeIndex === -1) return;
    chunk.trees.splice(treeIndex, 1);
    const usedTile = chunk.usedTiles.splice(usedTileIndex, 1)[0];
    map.treeCounter--;
    chunk.emptyTiles.push({
        tileX: usedTile.position.tileX,
        tileY: usedTile.position.tileY,
    });
}

export function removeMushroomFromMap(mushroom: Mushroom, map: ChatSimMap) {
    const chunk = mapGetChunkForPosition(mushroom.position, map);
    if (!chunk) return;
    const usedTileIndex = chunk.usedTiles.findIndex(t => t.object === mushroom);
    if (usedTileIndex === -1) return;
    const mushroomIndex = chunk.mushrooms.findIndex(h => h === mushroom);
    if (mushroomIndex === -1) return;
    chunk.mushrooms.splice(mushroomIndex, 1);
    const usedTile = chunk.usedTiles.splice(usedTileIndex, 1)[0];
    map.mushroomCounter--;
    chunk.emptyTiles.push({
        tileX: usedTile.position.tileX,
        tileY: usedTile.position.tileY,
    });
}

export function tickChatSimMap(state: ChatSimState) {
    tickTreeSpawn(state);
    mushroomSpawnTick(state);
    tickBuildings(state);
}

export function chunkKeyToPosition(chunkKey: string, map: ChatSimMap): Position | undefined {
    const chunkXY = chunkKeyToChunkXy(chunkKey);
    if (!chunkXY) return undefined;
    return chunkXyToPosition(chunkXY.x, chunkXY.y, map);
}

export function chunkXyToPosition(chunkX: number, chunkY: number, map: ChatSimMap): Position {
    const chunkSize = map.defaultChunkLength * map.tileSize;
    return {
        x: chunkX * chunkSize + map.zeroChunkTopLeft.x,
        y: chunkY * chunkSize + map.zeroChunkTopLeft.y,
    }
}

export function mapPositionToChunkXy(position: Position, map: ChatSimMap): { chunkX: number, chunkY: number } {
    const chunkSize = map.defaultChunkLength * map.tileSize;
    const chunkX = Math.floor((position.x - map.zeroChunkTopLeft.x) / chunkSize);
    const chunkY = Math.floor((position.y - map.zeroChunkTopLeft.y) / chunkSize);
    return { chunkX, chunkY };
}

export function mapGetChunkForPosition(position: Position, map: ChatSimMap): MapChunk | undefined {
    const chunkXY = mapPositionToChunkXy(position, map);
    const chunkKey = chunkXyToChunkKey(chunkXY.chunkX, chunkXY.chunkY);
    const chunk = map.mapChunks[chunkKey];
    return chunk;
}

export function mapGetChunksInDistance(position: Position, map: ChatSimMap, distance: number): MapChunk[] {
    const mapChunks: MapChunk[] = [];

    const chunkSize = map.tileSize * map.defaultChunkLength;
    const chunkXNotRounded = (position.x - map.zeroChunkTopLeft.x) / chunkSize;
    const chunkYNotRounded = (position.y - map.zeroChunkTopLeft.y) / chunkSize;
    const checkDistance = distance / chunkSize + 1;
    for (let x = -checkDistance; x < checkDistance; x++) {
        for (let y = -checkDistance; y < checkDistance; y++) {
            const currentChunkX = Math.floor(chunkXNotRounded + x);
            const currentChunkY = Math.floor(chunkYNotRounded + y);
            const distanceToChunk = calculateDistanceToChunkXY(position, currentChunkX, currentChunkY, map);
            if (distanceToChunk > distance) continue;
            const key = chunkXyToChunkKey(currentChunkX, currentChunkY);
            const chunk = map.mapChunks[key];
            if (chunk) mapChunks.push(chunk);
        }
    }

    return mapChunks;
}

export function mapGetChunkKeysInDistance(position: Position, map: ChatSimMap, distance: number): string[] {
    const mapChunkKeys: string[] = [];

    const chunkSize = map.tileSize * map.defaultChunkLength;
    const chunkXNotRounded = (position.x - map.zeroChunkTopLeft.x) / chunkSize;
    const chunkYNotRounded = (position.y - map.zeroChunkTopLeft.y) / chunkSize;
    const checkDistance = distance / chunkSize + 1;
    for (let x = -checkDistance; x < checkDistance; x++) {
        for (let y = -checkDistance; y < checkDistance; y++) {
            const currentChunkX = Math.floor(chunkXNotRounded + x);
            const currentChunkY = Math.floor(chunkYNotRounded + y);
            const distanceToChunk = calculateDistanceToChunkXY(position, currentChunkX, currentChunkY, map);
            if (distanceToChunk > distance) continue;
            const key = chunkXyToChunkKey(currentChunkX, currentChunkY);
            const chunk = map.mapChunks[key];
            if (chunk) mapChunkKeys.push(key);
        }
    }

    return mapChunkKeys;
}

function calculateDistanceToChunkXY(position: Position, chunkX: number, chunkY: number, map: ChatSimMap): number {
    const chunkPos = chunkXyToPosition(chunkX, chunkY, map);
    const chunkSize = map.tileSize * map.defaultChunkLength;
    const closest = mapGetRectanglePositionClosestToPosition(position, chunkPos, chunkSize, chunkSize);
    return calculateDistance(position, closest);
}

function tickTreeSpawn(state: ChatSimState) {
    if (state.map.treeCounter >= state.map.maxTrees) return;
    const maxSpawn = Math.min(state.map.maxTrees - state.map.treeCounter, 100);
    for (let i = 0; i < maxSpawn; i++) {
        const emptyTileInfo = getRandomEmptyTileInfo(state);
        if (!emptyTileInfo) return;
        const chunk = state.map.mapChunks[emptyTileInfo.chunkKey];
        const emptyTile = chunk.emptyTiles[emptyTileInfo.tileIndex];
        const mapPosition = chunkKeyAndTileToPosition(emptyTileInfo.chunkKey, emptyTile, state.map);
        if (!mapPosition) return;
        const newTree: Tree = createTree(mapPosition);
        chunk.emptyTiles.splice(emptyTileInfo.tileIndex, 1);
        state.map.treeCounter++;
        chunk.usedTiles.push({
            position: emptyTile,
            usedByType: "Tree",
            object: newTree,
        });
        chunk.trees.push(newTree);
    }
}

function mushroomSpawnTick(state: ChatSimState) {
    if (state.map.mushroomCounter >= state.map.maxMushrooms) return;
    const maxSpawn = Math.min(state.map.maxMushrooms - state.map.mushroomCounter, 100);
    for (let i = 0; i < maxSpawn; i++) {
        const emptyTileInfo = getRandomEmptyTileInfo(state);
        if (!emptyTileInfo) return;
        const chunk = state.map.mapChunks[emptyTileInfo.chunkKey];
        const emptyTile = chunk.emptyTiles[emptyTileInfo.tileIndex];
        const mapPosition = chunkKeyAndTileToPosition(emptyTileInfo.chunkKey, emptyTile, state.map);
        if (!mapPosition) return;
        const mushroom: Mushroom = {
            position: {
                x: mapPosition.x,
                y: mapPosition.y,
            }
        }
        chunk.emptyTiles.splice(emptyTileInfo.tileIndex, 1);
        state.map.mushroomCounter++;
        chunk.usedTiles.push({
            position: emptyTile,
            usedByType: "Mushroom",
            object: mushroom,
        });
        chunk.mushrooms.push(mushroom);
    }
}

function chunkKeyToChunkXy(chunkKey: string): Position | undefined {
    const temp = chunkKey.split("_");
    if (temp.length !== 2) return undefined;
    const chunkX = parseInt(temp[0]);
    const chunkY = parseInt(temp[1]);
    return {
        x: chunkX,
        y: chunkY,
    }
}

function chunkKeyAndTileToPosition(chunkKey: string, tileXY: TilePosition, map: ChatSimMap): Position | undefined {
    const chunkPosition = chunkKeyToPosition(chunkKey, map);
    if (!chunkPosition) return undefined;
    return {
        x: chunkPosition.x + tileXY.tileX * map.tileSize + map.tileSize / 2,
        y: chunkPosition.y + tileXY.tileY * map.tileSize + map.tileSize / 2,
    }
}

function chunkXyToChunkKey(chunkX: number, chunkY: number): string {
    return `${chunkX}_${chunkY}`;
}

function getRandomEmptyTileInfoInDistance(state: ChatSimState, position: Position, distance: number): { tileIndex: number, chunkKey: string } | undefined {
    const chunkKeysInDistane = mapGetChunkKeysInDistance(position, state.map, distance);
    return getRandomEmptyTileInfo(state, chunkKeysInDistane);
}

function getRandomEmptyTileInfo(state: ChatSimState, chunkKeys: string[] | undefined = undefined): { tileIndex: number, chunkKey: string } | undefined {
    const maxTries = 10;
    let tryCounter = 0;
    const chunkKeysToConsider = chunkKeys ? chunkKeys : Object.keys(state.map.mapChunks);
    while (tryCounter < maxTries) {
        tryCounter++;
        const randomChunkKeyIndex = Math.floor(nextRandom(state.randomSeed) * chunkKeysToConsider.length);
        const randomChunkKey = chunkKeysToConsider[randomChunkKeyIndex];
        const randomChunk = state.map.mapChunks[randomChunkKey];
        if (randomChunk.emptyTiles.length > 0) {
            const randomTileIndex = Math.floor(nextRandom(state.randomSeed) * randomChunk.emptyTiles.length);
            return { tileIndex: randomTileIndex, chunkKey: randomChunkKey };
        }
    }
    return undefined;
}

function fillAllChunksAtStart(map: ChatSimMap) {
    if (Object.keys(map.mapChunks).length > 0) return;
    const chunkSize = map.defaultChunkLength * map.tileSize;
    const horizontalChunkCoutner = Math.ceil(map.tileCounterHorizontal / map.defaultChunkLength);
    const verticalChunkCoutner = Math.ceil(map.tileCounterVertical / map.defaultChunkLength);
    let chunkKey = "";
    for (let x = 0; x < horizontalChunkCoutner; x++) {
        for (let y = 0; y < verticalChunkCoutner; y++) {
            const chunkX = x - Math.floor(horizontalChunkCoutner / 2);
            const chunkY = y - Math.floor(verticalChunkCoutner / 2);
            chunkKey = chunkXyToChunkKey(chunkX, chunkY);
            const chunk: MapChunk = {
                buildings: [],
                mushrooms: [],
                trees: [],
                tilesHorizontal: map.defaultChunkLength,
                tilesVertical: map.defaultChunkLength,
                emptyTiles: [],
                usedTiles: [],
            }
            if (x === horizontalChunkCoutner - 1) {
                chunk.tilesHorizontal = map.tileCounterHorizontal % map.defaultChunkLength;
            }
            if (y === verticalChunkCoutner - 1) {
                chunk.tilesVertical = map.tileCounterVertical % map.defaultChunkLength;
            }
            for (let chunkTileX = 0; chunkTileX < chunk.tilesHorizontal; chunkTileX++) {
                for (let chunkTileY = 0; chunkTileY < chunk.tilesVertical; chunkTileY++) {
                    chunk.emptyTiles.push({
                        tileX: chunkTileX,
                        tileY: chunkTileY,
                    });
                }
            }
            map.mapChunks[chunkKey] = chunk;
        }
    }
}

function mapGetRectanglePositionClosestToPosition(position: Position, rectangleTopLeft: Position, rectangleWidth: number, rectangleHeight: number): Position {
    const distanceLeft = position.x - rectangleTopLeft.x;
    const distanceRight = rectangleTopLeft.x + rectangleWidth - position.x;
    const distanceTop = position.y - rectangleTopLeft.y;
    const distanceBottom = rectangleTopLeft.y + rectangleHeight - position.y;
    if (distanceLeft >= 0 && distanceRight >= 0) {
        if (distanceTop > 0 && distanceBottom > 0) {
            return { x: position.x, y: position.y };
        } else {
            if (distanceTop < distanceBottom) {
                return { x: position.x, y: rectangleTopLeft.y };
            } else {
                return { x: position.x, y: rectangleTopLeft.y + rectangleHeight }
            }
        }
    } else {
        if (distanceTop >= 0 && distanceBottom >= 0) {
            if (distanceLeft < distanceRight) {
                return { x: rectangleTopLeft.x, y: position.y };
            } else {
                return { x: rectangleTopLeft.x + rectangleWidth, y: position.y };
            }
        } else {
            if (distanceTop < 0 && distanceLeft < 0) return { x: rectangleTopLeft.x, y: rectangleTopLeft.y };
            if (distanceTop < 0 && distanceRight < 0) return { x: rectangleTopLeft.x + rectangleWidth, y: rectangleTopLeft.y };
            if (distanceBottom < 0 && distanceLeft < 0) return { x: rectangleTopLeft.x, y: rectangleTopLeft.y + rectangleHeight };
            if (distanceBottom < 0 && distanceRight < 0) return { x: rectangleTopLeft.x + rectangleWidth, y: rectangleTopLeft.y + rectangleHeight };
        }
    }
    throw "should not happen";
}
