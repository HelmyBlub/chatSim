import { IMAGE_PATH_CITIZEN_HOUSE, IMAGE_PATH_BUILDING_MARKET, IMAGE_PATH_WOOD_PLANK, drawTextWithOutline } from "../../drawHelper.js";
import { ChatSimState, Position } from "../chatSimModels.js";
import { UiRectangle } from "../rectangle.js";
import { Rectangle } from "../rectangle.js";
import { Citizen } from "./citizen.js";
import { IMAGES } from "../images.js";
import { Inventory, InventoryItem, paintInventoryItem, paintInventoryMoney } from "../inventory.js";
import { isCitizenInInteractionDistance } from "./citizen.js";
import { BUILDING_DATA } from "../jobs/jobBuildingContruction.js";
import { INVENTORY_MUSHROOM, INVENTORY_WOOD } from "../inventory.js";
import { ChatSimMap, mapGetRandomEmptyTileInfoInDistance, MapChunk, mapChunkKeyAndTileToPosition, PaintDataMap, mapAddTickQueueEntry } from "./map.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { MAP_OBJECTS_FUNCTIONS, mapAddObject, MapObject, mapDeleteTileObject } from "./mapObject.js";

export type BuildingType = "Market" | "House"
export type Building = MapObject & {
    buildingType: BuildingType
    owner: Citizen
    inhabitedBy?: Citizen
    buildProgress?: number
    deterioration: number
    inventory: Inventory
    brokeDownTime?: number,
}

export type BuildingMarket = Building & {
    queue?: Citizen[]
    displayedItem?: string,
    counter: {
        items: InventoryItem[],
        money: number,
    }
}

export const MAP_OBJECT_BUILDING = "building";
const BUILDING_TICK_INTERVAL = 5500;

export function loadMapObjectBuilding() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_BUILDING] = {
        createSelectionData: createSelectionData,
        getMaxVisionDistanceFactor: getMaxVisionDistanceFactor,
        paint: paint,
        tickQueue: mapObjectTickQueue,
    }
}

export function createBuildingOnRandomTile(owner: Citizen, state: ChatSimState, buildingType: BuildingType, buildPositionCenter: Position): Building | undefined {
    const emptyTileInfo = mapGetRandomEmptyTileInfoInDistance(state, buildPositionCenter, 400);
    if (!emptyTileInfo) return undefined;
    const chunk = state.map.mapChunks.get(emptyTileInfo.chunkKey)!;
    const emptyTile = chunk.emptyTiles[emptyTileInfo.tileIndex];
    const mapPosition = mapChunkKeyAndTileToPosition(emptyTileInfo.chunkKey, emptyTile, state.map);
    if (!mapPosition) return;
    const building = createBuilding(owner, mapPosition, buildingType);
    const success = mapAddObject(building, state);
    if (success) {
        mapAddTickQueueEntry({ mapObject: building, time: state.time + BUILDING_TICK_INTERVAL }, state);
        return building;
    }
    debugger;
    return undefined;
}

export function marketGetCounterPosition(market: BuildingMarket): Position {
    return {
        x: market.position.x,
        y: market.position.y - 2,
    }
}

export function marketHasQueue(market: BuildingMarket) {
    if (!market.queue || market.queue.length === 0) return false;
    let index = market.queue.length;
    do {
        index--;
        const customer = market.queue[index];
        const queueMapPosition = marketGetQueueMapPosition(customer, market, index);
        if (!isCitizenInInteractionDistance(customer, queueMapPosition)) {
            market.queue.splice(index, 1);
        } else {
            return true;
        }
    } while (index > 0);
    return false;
}

export function marketGetQueuePosition(citizen: Citizen, market: BuildingMarket): number {
    if (!market.queue) market.queue = [];
    const queueIndex = market.queue.findIndex(c => c === citizen);
    if (queueIndex === -1) {
        market.queue.push(citizen);
        if (market.queue.length > 1) {
            let index = market.queue.length - 1;
            do {
                index--;
                const customerAheadInQueue = market.queue[index];
                const queueMapPosition = marketGetQueueMapPosition(customerAheadInQueue, market, index);
                if (!isCitizenInInteractionDistance(customerAheadInQueue, queueMapPosition)) {
                    market.queue.splice(index, 1);
                } else {
                    break;
                }
            } while (index > 0);
        }
        return market.queue.length - 1;
    } else {
        return queueIndex;
    }
}

export function marketGetQueueMapPosition(citizen: Citizen, market: BuildingMarket, queuePosition: number | undefined = undefined): Position {
    let queueNumber = queuePosition;
    if (queueNumber === undefined) queueNumber = marketGetQueuePosition(citizen, market);
    return {
        x: market.position.x + (queueNumber + 1) * 25 + 20,
        y: market.position.y + 17 - queueNumber,
    }
}

export function buildingGetFirstBrokenStateDeterioration(buildingType: BuildingType) {
    return 0.2 + 0.8 / BUILDING_DATA[buildingType].woodAmount;
}

export function createBuilding(owner: Citizen, position: Position, type: BuildingType): Building {
    const building: Building = {
        type: MAP_OBJECT_BUILDING,
        buildingType: type,
        owner: owner,
        inventory: {
            items: [],
            reservedSpace: [
                {
                    counter: 6,
                    name: INVENTORY_MUSHROOM
                },
                {
                    counter: 3,
                    name: INVENTORY_WOOD
                },
            ],
            size: 50,
        },
        position: {
            x: position.x,
            y: position.y,
        },
        buildProgress: 0,
        deterioration: 0,
    };
    if (type === "Market") {
        const market: BuildingMarket = {
            ...building,
            counter: {
                items: [],
                money: 0
            }
        }
        return market;
    }
    return building;
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
    }
    return citizenUiRectangle;
}

function mapObjectTickQueue(mapObject: MapObject, state: ChatSimState) {
    const building = mapObject as Building;
    if (building.deterioration < 1) {
        building.deterioration += 0.01;
        if (building.deterioration >= 1) {
            building.inventory.items = [];
            building.brokeDownTime = state.time;
        }
    } else if (building.brokeDownTime !== undefined) {
        const deleteDelay = BUILDING_DATA[building.buildingType].woodAmount * 60000;
        if (building.brokeDownTime + deleteDelay < state.time) {
            mapDeleteTileObject(building, state.map);
        }
    }
    if (!building.deletedFromMap) {
        mapAddTickQueueEntry({ mapObject, time: state.time + BUILDING_TICK_INTERVAL }, state);
    }
}

function paintSelectionData(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const building = state.inputData.selected?.object as Building;
    if (!building) return;
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetX = rect.topLeft.x;
    let offsetY = rect.topLeft.y + fontSize;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;
    ctx.fillText(`Building: ${building.buildingType}`, offsetX, offsetY + lineSpacing * lineCounter++);
    ctx.fillText(`    Owner: ${building.owner.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
    if (building.inhabitedBy !== undefined) ctx.fillText(`    Inhabited by: ${building.inhabitedBy.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
    if (building.buildProgress !== undefined) ctx.fillText(`    Build Progress: ${(building.buildProgress * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
    ctx.fillText(`    Deterioration: ${(building.deterioration * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
    ctx.fillText(`    Inventory:`, offsetX, offsetY + lineSpacing * lineCounter++);
    for (let item of building.inventory.items) {
        ctx.fillText(`        ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
    }
    if (building.buildingType === "Market") {
        const market = building as BuildingMarket;
        ctx.fillText(`    Counter:`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`        money: ${market.counter.money}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`        items:`, offsetX, offsetY + lineSpacing * lineCounter++);
        for (let item of market.counter.items) {
            ctx.fillText(`            ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
    }

    rect.height = lineSpacing * lineCounter;
}

function getMaxVisionDistanceFactor() {
    return 2;
}

function paint(ctx: CanvasRenderingContext2D, building: Building, paintDataMap: PaintDataMap, state: ChatSimState) {
    const citizenHouseImage = IMAGES[IMAGE_PATH_CITIZEN_HOUSE];
    const marketImage = IMAGES[IMAGE_PATH_BUILDING_MARKET];
    const buildingPaintSize = 80;
    const buildingImageSize = 200;
    const houseNameOffsetY = 90 * buildingPaintSize / buildingImageSize;
    const marketNameOffsetY = 181 * buildingPaintSize / buildingImageSize;
    const marketJobOffsetY = 161 * buildingPaintSize / buildingImageSize;
    ctx.font = "8px Arial";
    let buildingImageIndex = 1;
    const woodRequired = BUILDING_DATA[building.buildingType].woodAmount;
    const firstBroken = buildingGetFirstBrokenStateDeterioration(building.buildingType);
    if (building.deterioration >= firstBroken) {
        const stepSize = (1 - firstBroken) / (woodRequired - 1);
        buildingImageIndex = Math.floor(((building.deterioration - firstBroken) / stepSize)) + 2;
    }
    const paintPos = mapPositionToPaintPosition(building.position, state.paintData.map);
    let factor = (building.buildProgress !== undefined ? building.buildProgress : 1);
    const image = building.buildingType === "House" ? citizenHouseImage : marketImage;
    ctx.drawImage(image, 0, buildingImageSize * buildingImageIndex - buildingImageSize * factor, buildingImageSize, buildingImageSize * factor,
        paintPos.x - buildingPaintSize / 2,
        paintPos.y - buildingPaintSize / 2 + buildingPaintSize - buildingPaintSize * factor,
        buildingPaintSize, buildingPaintSize * factor);
    if (building.buildProgress !== undefined) {
        const wood = building.inventory.items.find(i => i.name === INVENTORY_WOOD);
        if (wood) {
            const woodPaintSize = 30;
            for (let i = 0; i < wood.counter; i++) {
                const offsetY = buildingPaintSize / 2 - i * 2 - woodPaintSize;
                ctx.drawImage(IMAGES[IMAGE_PATH_WOOD_PLANK], 0, 0, 200, 200,
                    paintPos.x,
                    paintPos.y + offsetY,
                    woodPaintSize, woodPaintSize);
            }
        }
    }
    if (building.inhabitedBy && building.deterioration < 1) {
        const nameOffsetX = Math.floor(ctx.measureText(building.inhabitedBy.name).width / 2);
        if (building.buildingType === "House") {
            if (building.deterioration >= firstBroken) {
                const brokenPaintY = paintPos.y + 5;
                ctx.save();
                ctx.translate(paintPos.x, brokenPaintY);
                ctx.rotate(0.4);
                ctx.translate(-paintPos.x, -brokenPaintY);
                drawTextWithOutline(ctx, building.inhabitedBy.name, paintPos.x - nameOffsetX, brokenPaintY - buildingPaintSize / 2 + houseNameOffsetY);
                ctx.restore();
            } else {
                drawTextWithOutline(ctx, building.inhabitedBy.name, paintPos.x - nameOffsetX, paintPos.y - buildingPaintSize / 2 + houseNameOffsetY);
            }
        } else if (building.buildingType === "Market") {
            const market = building as BuildingMarket;
            const jobOffsetX = Math.floor(ctx.measureText(building.inhabitedBy.job.name).width / 2);
            drawTextWithOutline(ctx, building.inhabitedBy.job.name, paintPos.x - jobOffsetX - 2, paintPos.y - buildingPaintSize / 2 + marketJobOffsetY);
            drawTextWithOutline(ctx, building.inhabitedBy.name, paintPos.x - nameOffsetX - 2, paintPos.y - buildingPaintSize / 2 + marketNameOffsetY);
            paintInventoryOnMarket(ctx, market, state);
        }
    }
}

function paintInventoryOnMarket(ctx: CanvasRenderingContext2D, market: BuildingMarket, state: ChatSimState) {
    if (market.displayedItem) {
        const marketPaintPos = mapPositionToPaintPosition(market.position, state.paintData.map);
        const marketDisplayPosition = { x: marketPaintPos.x - 38, y: marketPaintPos.y - 2 };
        const item = market.inventory.items.find(i => i.name === market.displayedItem);
        if (!item || item.counter === 0) return;
        paintInventoryItem(ctx, item, marketDisplayPosition);
    }
    if (market.counter.items.length > 0) {
        const item = market.counter.items[0];
        const marketCounterPosition = marketGetCounterPosition(market);
        const paintPos = mapPositionToPaintPosition(marketCounterPosition, state.paintData.map);
        paintInventoryItem(ctx, item, paintPos);
    }
    if (market.counter.money > 0) {
        const marketCounterPosition = marketGetCounterPosition(market);
        const paintPos = mapPositionToPaintPosition(marketCounterPosition, state.paintData.map);
        paintInventoryMoney(ctx, market.counter.money, paintPos);
    }
}
