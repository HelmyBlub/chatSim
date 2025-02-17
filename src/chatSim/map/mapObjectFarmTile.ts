import { ChatSimState, Position } from "../chatSimModels.js";
import { UiRectangle } from "../rectangle.js";
import { Rectangle } from "../rectangle.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { mapGetChunkForPosition, PaintDataMap } from "./map.js";
import { MAP_OBJECTS_FUNCTIONS, MapObject, mapPaintChunkObjects } from "./mapObject.js";
import { isCitizenInInteractionDistance } from "./citizen.js";
import { Mushroom } from "./mapObjectMushroom.js";

export type FarmTile = MapObject & {
    position: Position,
    growSlotSize: number,
    growSlots: (MapObject | undefined)[],
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

export function farmTileDeleteGrowSlot(mapObject: MapObject, state: ChatSimState) {
    const chunk = mapGetChunkForPosition(mapObject.position, state.map);
    if (!chunk) return undefined;
    const farmTiles = chunk.tileObjects.get(MAP_OBJECT_FARM_TILE) as FarmTile[];
    if (!farmTiles) return undefined;
    const mushroomFarmTile = isOnFarmTile(mapObject.position, farmTiles, state);
    for (let i = 0; i < mushroomFarmTile!.growSlots.length; i++) {
        if (mushroomFarmTile!.growSlots[i] === mapObject) {
            mushroomFarmTile!.growSlots[i] = undefined;
        }
    }
}

function isOnFarmTile(position: Position, farmTiles: FarmTile[], state: ChatSimState): FarmTile | undefined {
    const tileSize = state.map.tileSize;
    for (let farmTile of farmTiles) {
        if (farmTile.position.x - tileSize / 2 < position.x && position.x < farmTile.position.x + tileSize / 2
            && farmTile.position.y - tileSize / 2 < position.y && position.y < farmTile.position.y + tileSize / 2
        ) {
            return farmTile;
        }
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
    const farmTile = state.inputData.selected?.object as FarmTile;
    if (!farmTile) return;
    const fontSize = 18;
    const padding = 5;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetX = rect.topLeft.x + padding;
    let offsetY = rect.topLeft.y + fontSize + padding;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;
    for (let slot of farmTile.growSlots) {
        if (slot === undefined) continue;
        const mushroom = slot as Mushroom;
        ctx.fillText(`slot ${slot.type}: ${mushroom.foodValue}`, offsetX, offsetY + lineSpacing * lineCounter++);
    }

    rect.height = lineSpacing * lineCounter + padding * 2;
}

function getMaxVisionDistanceFactor() {
    return 1;
}

function paint(ctx: CanvasRenderingContext2D, farmTile: FarmTile, paintDataMap: PaintDataMap, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(farmTile.position, paintDataMap);
    ctx.fillStyle = "darkgreen";
    const tileSize = state.map.tileSize;
    ctx.fillRect(paintPos.x - tileSize / 2, paintPos.y - tileSize / 2, tileSize, tileSize);
    for (let slot of farmTile.growSlots) {
        if (!slot) continue;
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

