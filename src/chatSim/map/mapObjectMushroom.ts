import { IMAGE_PATH_MUSHROOM } from "../../drawHelper.js";
import { ChatSimState, Position } from "../chatSimModels.js";
import { IMAGES } from "../images.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { ChatSimMap, PaintDataMap } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, mapAddObjectRandomPosition, MapChunkTileObject } from "./mapObject.js";

export type Mushroom = MapChunkTileObject & {
    position: Position,
}

export const MAP_OBJECT_MUSHROOM = "mushroom";

export function loadMapObjectMushroom() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_MUSHROOM] = {
        create: create,
        paint: paint,
        onDelete: onDelete,
        tickGlobal: tickMushroomSpawn,
    }
}

function paint(ctx: CanvasRenderingContext2D, mushroom: Mushroom, paintDataMap: PaintDataMap, state: ChatSimState) {
    const mushroomPaintSize = 30;
    const mushroomImage = IMAGES[IMAGE_PATH_MUSHROOM];
    const paintPos = mapPositionToPaintPosition(mushroom.position, paintDataMap);
    ctx.drawImage(mushroomImage, 0, 0, 200, 200,
        paintPos.x - mushroomPaintSize / 2,
        paintPos.y - mushroomPaintSize / 2,
        mushroomPaintSize, mushroomPaintSize);
}

function tickMushroomSpawn(state: ChatSimState) {
    if (state.map.mushroomCounter >= state.map.maxMushrooms) return;
    const maxSpawn = Math.min(state.map.maxMushrooms - state.map.mushroomCounter, 1000);
    const chunks = Object.keys(state.map.mapChunks);
    for (let i = 0; i < maxSpawn; i++) {
        const result = mapAddObjectRandomPosition(MAP_OBJECT_MUSHROOM, state);
        if (result) state.map.mushroomCounter++;
    }
}

function onDelete(object: MapChunkTileObject, map: ChatSimMap) {
    map.mushroomCounter--;
}

function create(position: Position) {
    const newMushroom: Mushroom = {
        type: MAP_OBJECT_MUSHROOM,
        position: {
            x: position.x,
            y: position.y,
        }
    }
    return newMushroom;
}

