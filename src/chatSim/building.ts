import { IMAGE_PATH_CITIZEN_HOUSE, IMAGE_PATH_BUILDING_MARKET, IMAGE_PATH_WOOD_PLANK, drawTextWithOutline, IMAGE_PATH_MUSHROOM } from "../drawHelper.js";
import { ChatSimState, Position } from "./chatSimModels.js";
import { Citizen } from "./citizen.js";
import { IMAGES } from "./images.js";
import { Inventory } from "./inventory.js";
import { isCitizenAtPosition, isCitizenInInteractionDistance } from "./jobs/job.js";
import { INVENTORY_MUSHROOM, INVENTORY_WOOD } from "./main.js";
import { removeBuildingFromMap } from "./map.js";
import { mapPositionToPaintPosition } from "./paint.js";

export type BuildingType = "Market" | "House"
export type Building = {
    type: BuildingType
    owner: Citizen
    inhabitedBy?: Citizen
    position: Position
    buildProgress?: number
    deterioration: number
    inventory: Inventory
}

export type BuildingMarket = Building & {
    queue?: Citizen[]
    displayedItem?: string
}
const DISPLAY_ITEM_PAINT_DATA: { [key: string]: { size: number, path: string, max: number, offset: Position, offsetPerItem: Position } } = {
};

export function onLoadDisplayItemPaintData() {
    DISPLAY_ITEM_PAINT_DATA[INVENTORY_MUSHROOM] = {
        size: 14,
        max: 13,
        path: IMAGE_PATH_MUSHROOM,
        offset: {
            x: - 38,
            y: -2,
        },
        offsetPerItem: {
            x: 5,
            y: 0
        }
    };
    DISPLAY_ITEM_PAINT_DATA[INVENTORY_WOOD] = {
        size: 30,
        max: 10,
        path: IMAGE_PATH_WOOD_PLANK,
        offset: {
            x: - 38,
            y: -2,
        },
        offsetPerItem: {
            x: 0,
            y: -2,
        }
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

export function tickBuildings(state: ChatSimState) {
    for (let i = 0; i < state.map.buildings.length; i++) {
        const house = state.map.buildings[i];
        house.deterioration += 0.00005;
        if (house.deterioration > 1) {
            removeBuildingFromMap(house, state.map);
            if (house.inhabitedBy && house.inhabitedBy.home === house) house.inhabitedBy.home = undefined;
        }
    }
}

export function createBuilding(owner: Citizen, position: Position, type: BuildingType): Building {
    return {
        type: type,
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
}

export function paintBuildings(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    const citizenHouseImage = IMAGES[IMAGE_PATH_CITIZEN_HOUSE];
    const marketImage = IMAGES[IMAGE_PATH_BUILDING_MARKET];
    const buildingPaintSize = 80;
    const buildingImageSize = 200;
    const houseNameOffsetY = 90 * buildingPaintSize / buildingImageSize;
    const marketNameOffsetY = 181 * buildingPaintSize / buildingImageSize;
    const marketJobOffsetY = 161 * buildingPaintSize / buildingImageSize;
    ctx.font = "8px Arial";
    for (let building of state.map.buildings) {
        const paintPos = mapPositionToPaintPosition(building.position, state.paintData.map);
        let factor = (building.buildProgress !== undefined ? building.buildProgress : 1);
        const image = building.type === "House" ? citizenHouseImage : marketImage;
        ctx.drawImage(image, 0, buildingImageSize - buildingImageSize * factor, buildingImageSize, buildingImageSize * factor,
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
        if (building.inhabitedBy) {
            const nameOffsetX = Math.floor(ctx.measureText(building.inhabitedBy.name).width / 2);
            if (building.type === "House") {
                drawTextWithOutline(ctx, building.inhabitedBy.name, paintPos.x - nameOffsetX, paintPos.y - buildingPaintSize / 2 + houseNameOffsetY);
            } else if (building.type === "Market") {
                const jobOffsetX = Math.floor(ctx.measureText(building.inhabitedBy.job.name).width / 2);
                drawTextWithOutline(ctx, building.inhabitedBy.job.name, paintPos.x - jobOffsetX - 2, paintPos.y - buildingPaintSize / 2 + marketJobOffsetY);
                drawTextWithOutline(ctx, building.inhabitedBy.name, paintPos.x - nameOffsetX - 2, paintPos.y - buildingPaintSize / 2 + marketNameOffsetY);
                paintInventoryOnMarket(ctx, building, state);
            }
        }
    }
}

function paintInventoryOnMarket(ctx: CanvasRenderingContext2D, market: BuildingMarket, state: ChatSimState) {
    if (!market.displayedItem) return;
    const data = DISPLAY_ITEM_PAINT_DATA[market.displayedItem];

    const paintPos = mapPositionToPaintPosition(market.position, state.paintData.map);
    const item = market.inventory.items.find(i => i.name === market.displayedItem);
    if (!item || item.counter === 0) return;
    const image = IMAGES[data.path];
    for (let i = 0; i < Math.min(data.max, item.counter); i++) {
        ctx.drawImage(image, 0, 0, image.width, image.height,
            paintPos.x + i * data.offsetPerItem.x + data.offset.x,
            paintPos.y + i * data.offsetPerItem.y + data.offset.y,
            data.size, data.size
        );
    }
}
