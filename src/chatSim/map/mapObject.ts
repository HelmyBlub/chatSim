import { ChatSimState, Position } from "../chatSimModels.js";
import { UiRectangle } from "../rectangle.js";
import { loadMapObjectTree, Tree } from "./mapObjectTree.js";
import { ChatSimMap, MapChunk, mapChunkKeyAndTileToPosition, mapGetChunkAndTileForPosition, mapGetChunkForPosition, mapGetRandomEmptyTileInfo, PaintDataMap } from "./map.js";
import { Building, loadMapObjectBuilding } from "./mapObjectBuilding.js";
import { loadMapObjectMushroom, Mushroom } from "./mapObjectMushroom.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { Citizen, CITIZEN_PAINT_SIZE } from "./citizen.js";
import { loadMapObjectFarmTile } from "./mapObjectFarmTile.js";

export type MapObject = {
    type: string,
    position: Position,
    deletedFromMap?: boolean,
}

export type FunctionsMapObject = {
    create?(position: Position, state: ChatSimState): MapObject,
    createSelectionData?(state: ChatSimState): UiRectangle,
    getMaxVisionDistanceFactor(): number,
    getVisionDistanceFactor?(object: MapObject): number,
    onDeleteOnTile?(object: MapObject, map: ChatSimMap): void,
    paint?(ctx: CanvasRenderingContext2D, object: MapObject, paintDataMap: PaintDataMap, state: ChatSimState): void,
    tickGlobal?(state: ChatSimState): void,
    tickQueue?(mapObject: MapObject, state: ChatSimState): void,
}

export type FunctionsMapObjects = { [key: string]: FunctionsMapObject };

export const MAP_OBJECTS_FUNCTIONS: FunctionsMapObjects = {};

export function loadMapObjectsFunctions() {
    loadMapObjectTree();
    loadMapObjectBuilding();
    loadMapObjectMushroom();
    loadMapObjectFarmTile();
}

export function mapAddObjectRandomPosition(objectType: string, state: ChatSimState): MapObject | undefined {
    const chunks = Array.from(state.map.mapChunks.keys());
    const emptyTileInfo = mapGetRandomEmptyTileInfo(state, chunks);
    if (!emptyTileInfo) return;
    const chunk = state.map.mapChunks.get(emptyTileInfo.chunkKey)!;
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

export function mapAddObject(object: MapObject, state: ChatSimState): boolean {
    const chunkAndTile = mapGetChunkAndTileForPosition(object.position, state.map);
    if (chunkAndTile === undefined) return false;
    const chunk = chunkAndTile.chunk;
    const emptyTileIndex = chunk.emptyTiles.findIndex(t => t.tileX === chunkAndTile.tileX && t.tileY === chunkAndTile.tileY);
    if (emptyTileIndex === -1) return false;
    const emptyTile = chunk.emptyTiles.splice(emptyTileIndex, 1)[0];
    chunk.usedTiles.push({
        position: emptyTile,
        usedByType: object.type,
        object: object,
    });
    let chunkObjects = chunk.tileObjects.get(object.type);
    if (!chunkObjects) {
        chunkObjects = [];
        chunk.tileObjects.set(object.type, chunkObjects);
    }
    chunkObjects.push(object);
    return true;
}

export function mapPaintChunkObjects(ctx: CanvasRenderingContext2D, chunks: MapChunk[], paintDataMap: PaintDataMap, state: ChatSimState) {
    for (let chunk of chunks) {
        const types = chunk.tileObjects.keys();
        for (let type of types) {
            const objects = chunk.tileObjects.get(type);
            if (!objects) continue;
            const objectFunctions = MAP_OBJECTS_FUNCTIONS[type];
            if (!objectFunctions.paint) continue;
            for (let object of objects) {
                objectFunctions.paint(ctx, object, paintDataMap, state);
            }
        }
    }
}

export function mapGetMaxObjectVisionDistanceFactor(objectType: string): number {
    const objectFunctions = MAP_OBJECTS_FUNCTIONS[objectType];
    return objectFunctions.getMaxVisionDistanceFactor();
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

export function mapDeleteTileObject(object: MapObject, map: ChatSimMap) {
    const chunk = mapGetChunkForPosition(object.position, map);
    if (!chunk) return;
    const usedTileIndex = chunk.usedTiles.findIndex(t => t.object === object);
    if (usedTileIndex === -1) return;
    const mapObjects = chunk.tileObjects.get(object.type);
    if (!mapObjects) return;
    const objectIndex = mapObjects.findIndex(h => h === object);
    if (objectIndex === -1) return;
    mapObjects.splice(objectIndex, 1);
    object.deletedFromMap = true;
    const usedTile = chunk.usedTiles.splice(usedTileIndex, 1)[0];
    const objectFunctions = MAP_OBJECTS_FUNCTIONS[object.type];
    if (objectFunctions && objectFunctions.onDeleteOnTile) objectFunctions.onDeleteOnTile(object, map);
    chunk.emptyTiles.push({
        tileX: usedTile.position.tileX,
        tileY: usedTile.position.tileY,
    });
}

export function paintSelectionBox(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    if (state.inputData.selected) {
        let size = 60;
        const position = state.inputData.selected.object.position;
        switch (state.inputData.selected.type) {
            case "citizen":
                size = CITIZEN_PAINT_SIZE;
                break;
            case "mushroom":
                size = 20;
                break;
        }
        if (position) {
            const paintPos = mapPositionToPaintPosition(position, state.paintData.map);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.rect(Math.floor(paintPos.x - size / 2), Math.floor(paintPos.y - size / 2), size, size);
            ctx.stroke();
        }
    }
}
