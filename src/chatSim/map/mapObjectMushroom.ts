import { IMAGE_PATH_MUSHROOM } from "../../drawHelper.js";
import { ChatSimState, Position, UiRectangle } from "../chatSimModels.js";
import { MUSHROOM_FOOD_VALUE } from "../citizenNeeds/citizenNeedFood.js";
import { IMAGES } from "../images.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { ChatSimMap, PaintDataMap } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, mapAddObjectRandomPosition, MapObject } from "./mapObject.js";

export type Mushroom = MapObject & {
    position: Position,
}

export const MAP_OBJECT_MUSHROOM = "mushroom";

export function loadMapObjectMushroom() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_MUSHROOM] = {
        create: create,
        createSelectionData: createSelectionData,
        getMaxVisionDistanceFactor: getMaxVisionDistanceFactor,
        onDeleteOnTile: onDelete,
        paint: paint,
        tickGlobal: tickMushroomSpawn,
    }
}

function createSelectionData(state: ChatSimState): UiRectangle {
    const width = 500;
    const citizenUiRectangle: UiRectangle = {
        rect: {
            topLeft: { x: state.canvas!.width - width, y: 0 },
            height: 100,
            width: width,
        },
        tabs: [
            {
                name: "Generel",
                paint: paintSelectionData,
            },
        ],
        currentTabYOffset: 0,
    }
    return citizenUiRectangle;
}

function paintSelectionData(ctx: CanvasRenderingContext2D, uiRec: UiRectangle, state: ChatSimState) {
    const mushroom = state.inputData.selected?.object as Mushroom;
    if (!mushroom) return;
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetX = uiRec.rect.topLeft.x;
    let offsetY = uiRec.rect.topLeft.y + fontSize + uiRec.currentTabYOffset;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;
    ctx.fillText(`Mushroom:`, offsetX, offsetY + lineSpacing * lineCounter++);
    ctx.fillText(`    foodValue: ${MUSHROOM_FOOD_VALUE}`, offsetX, offsetY + lineSpacing * lineCounter++);

    uiRec.rect.height = lineSpacing * lineCounter + uiRec.currentTabYOffset;
}

function getMaxVisionDistanceFactor() {
    return 0.5;
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
    for (let i = 0; i < maxSpawn; i++) {
        const result = mapAddObjectRandomPosition(MAP_OBJECT_MUSHROOM, state);
        if (result) state.map.mushroomCounter++;
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
        }
    }
    return newMushroom;
}

