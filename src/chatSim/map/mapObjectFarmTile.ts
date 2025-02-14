import { ChatSimState, Position } from "../chatSimModels.js";
import { UiRectangle } from "../rectangle.js";
import { Rectangle } from "../rectangle.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { PaintDataMap } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapObject, mapPaintChunkObjects } from "./mapObject.js";

export type FarmTile = MapObject & {
    position: Position,
    growSlotSize: number,
    growSlots: MapObject[],
}

export const MAP_OBJECT_FARM_TILE = "Farm Tile";

export function loadMapObjectFarmTile() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_FARM_TILE] = {
        create: create,
        createSelectionData: createSelectionData,
        getMaxVisionDistanceFactor: getMaxVisionDistanceFactor,
        paint: paint,
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
        heading: "Farm Tile",
    }
    return citizenUiRectangle;
}

function paintSelectionData(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const mushroom = state.inputData.selected?.object as FarmTile;
    if (!mushroom) return;
    const fontSize = 18;
    const padding = 5;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetX = rect.topLeft.x + padding;
    let offsetY = rect.topLeft.y + fontSize + padding;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;
    ctx.fillText(`todo`, offsetX, offsetY + lineSpacing * lineCounter++);

    rect.height = lineSpacing * lineCounter + padding * 2;
}

function getMaxVisionDistanceFactor() {
    return 1;
}

function paint(ctx: CanvasRenderingContext2D, farmTile: FarmTile, paintDataMap: PaintDataMap, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(farmTile.position, paintDataMap);
    ctx.fillStyle = "darkgreen";
    ctx.fillRect(paintPos.x, paintPos.y, 20, 20);
    for (let slot of farmTile.growSlots) {
        const objectFunctions = MAP_OBJECTS_FUNCTIONS[slot.type];
        if (!objectFunctions.paint) continue;
        objectFunctions.paint(ctx, slot, paintDataMap, state);
    }
}

function create(position: Position) {
    const newFarmTile: FarmTile = {
        type: MAP_OBJECT_FARM_TILE,
        position: {
            x: position.x,
            y: position.y,
        },
        growSlots: [],
        growSlotSize: 2,
    }
    return newFarmTile;
}

