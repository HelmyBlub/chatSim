import { ChatSimState, Position } from "../chatSimModels.js";
import { loadMapObjectTree } from "./tree.js";
import { ChatSimMap, MapChunk, mapChunkKeyAndTileToPosition, mapGetChunkForPosition, mapGetRandomEmptyTileInfo, PaintDataMap } from "./map.js";
import { loadMapObjectBuilding } from "./building.js";
import { loadMapObjectMushroom } from "./mapObjectMushroom.js";

export type MapChunkTileObject = {
    type: string,
    position: Position,
}

export type FunctionsMapObject = {
    create?(position: Position, state: ChatSimState): MapChunkTileObject,
    getVisionDistance?(object: MapChunkTileObject): number,
    onDelete?(object: MapChunkTileObject, map: ChatSimMap): void,
    paint(ctx: CanvasRenderingContext2D, object: MapChunkTileObject, paintDataMap: PaintDataMap, state: ChatSimState): void,
    tickGlobal?(state: ChatSimState): void,
}

export type FunctionsMapObjects = { [key: string]: FunctionsMapObject };

export const MAP_OBJECTS_FUNCTIONS: FunctionsMapObjects = {};

export function loadMapObjectsFunctions() {
    loadMapObjectTree();
    loadMapObjectBuilding();
    loadMapObjectMushroom();
}

export function mapAddObjectRandomPosition(objectType: string, state: ChatSimState): MapChunkTileObject | undefined {
    const chunks = Object.keys(state.map.mapChunks);
    const emptyTileInfo = mapGetRandomEmptyTileInfo(state, chunks);
    if (!emptyTileInfo) return;
    const chunk = state.map.mapChunks[emptyTileInfo.chunkKey];
    const emptyTile = chunk.emptyTiles[emptyTileInfo.tileIndex];
    const mapPosition = mapChunkKeyAndTileToPosition(emptyTileInfo.chunkKey, emptyTile, state.map);
    if (!mapPosition) return;

    const objectFunctions = MAP_OBJECTS_FUNCTIONS[objectType];
    if (!objectFunctions.create) {
        console.log(`mapAddObjectRandomPosition not possible for ${objectType}`);
        return;
    }
    const object = objectFunctions.create(mapPosition, state);

    chunk.emptyTiles.splice(emptyTileInfo.tileIndex, 1);
    chunk.usedTiles.push({
        position: emptyTile,
        usedByType: objectType,
        object: object,
    });
    let chunkObjects = chunk.tileObjects.get(objectType);
    if (!chunkObjects) {
        chunkObjects = [];
        chunk.tileObjects.set(objectType, chunkObjects);
    }
    chunkObjects.push(object);
    return object;
}

export function paintChunkObjects(ctx: CanvasRenderingContext2D, chunks: MapChunk[], paintDataMap: PaintDataMap, state: ChatSimState) {
    for (let chunk of chunks) {
        const types = chunk.tileObjects.keys();
        for (let type of types) {
            const objects = chunk.tileObjects.get(type);
            if (!objects) continue;
            const objectFunctions = MAP_OBJECTS_FUNCTIONS[type];
            for (let object of objects) {
                objectFunctions.paint(ctx, object, paintDataMap, state);
            }
        }
    }
}

export function mapObjectsTickGlobal(state: ChatSimState) {
    const keys = Object.keys(MAP_OBJECTS_FUNCTIONS);
    for (let key of keys) {
        const objectFunctions = MAP_OBJECTS_FUNCTIONS[key];
        if (objectFunctions.tickGlobal) {
            objectFunctions.tickGlobal(state);
        }
    }
}

export function mapDeleteObject(object: MapChunkTileObject, map: ChatSimMap) {
    const chunk = mapGetChunkForPosition(object.position, map);
    if (!chunk) return;
    const usedTileIndex = chunk.usedTiles.findIndex(t => t.object === object);
    if (usedTileIndex === -1) return;
    const mapObjects = chunk.tileObjects.get(object.type);
    if (!mapObjects) return;
    const objectIndex = mapObjects.findIndex(h => h === object);
    if (objectIndex === -1) return;
    mapObjects.splice(objectIndex, 1);
    const usedTile = chunk.usedTiles.splice(usedTileIndex, 1)[0];
    const objectFunctions = MAP_OBJECTS_FUNCTIONS[object.type];
    if (objectFunctions && objectFunctions.onDelete) objectFunctions.onDelete(object, map);
    chunk.emptyTiles.push({
        tileX: usedTile.position.tileX,
        tileY: usedTile.position.tileY,
    });
}
