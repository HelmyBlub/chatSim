import { IMAGE_PATH_MUSHROOM } from "../../drawHelper.js";
import { ChatSimState, Position } from "../chatSimModels.js";
import { UiRectangle } from "../rectangle.js";
import { Rectangle } from "../rectangle.js";
import { IMAGES } from "../images.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { ChatSimMap, mapAddTickQueueEntry, PaintDataMap } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, mapAddObjectRandomPosition, MapObject } from "./mapObject.js";

export type Mushroom = MapObject & {
    position: Position,
    foodValue: number,
}

export const MAP_OBJECT_MUSHROOM = "mushroom";
const MUSHROOM_FOOD_VALUE = 0.15;
const MUSHROOM_TICK_INTERVAL = 5000;

export function loadMapObjectMushroom() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_MUSHROOM] = {
        create: create,
        createSelectionData: createSelectionData,
        getMaxVisionDistanceFactor: getMaxVisionDistanceFactor,
        getVisionDistanceFactor: getVisionDistanceFactor,
        onDeleteOnTile: onDelete,
        paint: paint,
        tickGlobal: tickMushroomSpawn,
        tickQueue: tickQueue,
    }
}

function createSelectionData(state: ChatSimState): UiRectangle {
    const width = 500;
    const citizenUiRectangle: UiRectangle = {
        mainRect: {
            topLeft: { x: state.canvas!.width - width, y: 0 },
            height: 100,
            width: width,
        },
        tabs: [
            {
                name: "Generell",
                paint: paintSelectionData,
            },
        ],
        heading: "Mushroom",
    }
    return citizenUiRectangle;
}

function paintSelectionData(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const mushroom = state.inputData.selected?.object as Mushroom;
    if (!mushroom) return;
    const fontSize = 18;
    const padding = 5;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetX = rect.topLeft.x + padding;
    let offsetY = rect.topLeft.y + fontSize + padding;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;
    ctx.fillText(`foodValue: ${mushroom.foodValue}`, offsetX, offsetY + lineSpacing * lineCounter++);

    rect.height = lineSpacing * lineCounter + padding * 2;
}

function getVisionDistanceFactor(mushroom: Mushroom): number {
    return getMaxVisionDistanceFactor() * mushroom.foodValue / MUSHROOM_FOOD_VALUE;
}

function getMaxVisionDistanceFactor() {
    return 0.5;
}

function paint(ctx: CanvasRenderingContext2D, mushroom: Mushroom, paintDataMap: PaintDataMap, state: ChatSimState) {
    const sizeFactor = mushroom.foodValue / MUSHROOM_FOOD_VALUE;
    if (sizeFactor === 0) return;
    const mushroomPaintSize = 30 * sizeFactor;
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
    for (let i = 0; i < maxSpawn; i++) {
        const result = mapAddObjectRandomPosition(MAP_OBJECT_MUSHROOM, state);
        if (result) state.map.mushroomCounter++;
    }
}

function tickQueue(mapObject: MapObject, state: ChatSimState) {
    const mushroom = mapObject as Mushroom;
    mushroom.foodValue += 0.01;
    if (mushroom.foodValue < MUSHROOM_FOOD_VALUE) {
        mapAddTickQueueEntry({ mapObject, time: state.time + MUSHROOM_TICK_INTERVAL }, state);
    }
}

function onDelete(object: MapObject, map: ChatSimMap) {
    map.mushroomCounter--;
}

function create(position: Position) {
    const newMushroom: Mushroom = {
        type: MAP_OBJECT_MUSHROOM,
        position: {
            x: position.x,
            y: position.y,
        },
        foodValue: MUSHROOM_FOOD_VALUE,
    }
    return newMushroom;
}

