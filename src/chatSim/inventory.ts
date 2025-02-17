import { IMAGE_PATH_MONEY, IMAGE_PATH_MUSHROOM, IMAGE_PATH_WOOD_PLANK } from "../drawHelper.js";
import { Position } from "./chatSimModels.js";
import { IMAGES } from "./images.js";

export type InventoryItem = {
    name: string,
    counter: number,
    data?: any[],
}

export type InventoryItemMushroom = InventoryItem & {
    data: number[],
}

export type Inventory = {
    items: InventoryItem[],
    reservedSpace?: InventoryItem[],
    size: number,
}

export const INVENTORY_MUSHROOM = "Mushroom";
export const INVENTORY_WOOD = "Wood";

export function paintInventoryMoney(ctx: CanvasRenderingContext2D, money: number, paintPosition: Position) {
    const moneySize = 10;
    for (let i = 0; i < money; i++) {
        ctx.drawImage(IMAGES[IMAGE_PATH_MONEY], 0, 0, 100, 100,
            paintPosition.x + moneySize / 2,
            paintPosition.y - i * 0.5 + moneySize / 2,
            moneySize, moneySize
        );
    }
}

export function paintInventoryItem(ctx: CanvasRenderingContext2D, item: InventoryItem, paintPosition: Position) {
    switch (item.name) {
        case INVENTORY_MUSHROOM:
            paintMushroom(ctx, item, paintPosition);
            break;
        case INVENTORY_WOOD:
            paintWoodPlanks(ctx, item, paintPosition);
            break;
    }
}

export function inventoryGetMissingReserved(inventory: Inventory, itemName: string): number {
    if (inventory.reservedSpace) {
        const reservedItem = inventory.reservedSpace.find(i => i.name === itemName);
        if (reservedItem) {
            const inventoryItem = inventory.items.find(i => i.name === itemName);
            if (inventoryItem) {
                return Math.max(0, reservedItem.counter - inventoryItem.counter);
            } else {
                return reservedItem.counter;
            }
        }
    }
    return 0;
}

export function inventoryGetAvailableCapacity(inventory: Inventory, itemName: string) {
    if (inventory.reservedSpace) {
        let counter = 0;
        for (let item of inventory.items) {
            const reserved = inventory.reservedSpace.find(i => i.name === item.name);
            if (itemName !== item.name && reserved) {
                if (reserved.counter > item.counter) {
                    counter += reserved.counter;
                } else {
                    counter += item.counter;
                }
            } else {
                counter += item.counter;
            }
        }
        return Math.max(inventory.size - counter, 0);
    } else {
        return Math.max(inventory.size - inventoryGetUsedCapacity(inventory), 0);
    }
}

export function inventoryGetPossibleTakeOutAmount(itemName: string, inventory: Inventory, ignoreReserved: boolean = false, homeMemoryItems?: InventoryItem[]): number {
    let item;
    if (homeMemoryItems) {
        item = homeMemoryItems.find(i => i.name === itemName);
    } else {
        item = inventory.items.find(i => i.name === itemName);
    }
    if (!item || item.counter === 0) return 0;
    if (inventory.reservedSpace && !ignoreReserved) {
        const reserved = inventory.reservedSpace.find(i => i.name === itemName);
        if (reserved) {
            return Math.max(0, item.counter - reserved.counter);
        }
    }
    return item.counter;
}

export function inventoryGetUsedCapacity(inventory: Inventory): number {
    let counter = 0;
    for (let item of inventory.items) {
        counter += item.counter;
    }
    return counter;
}

export function inventoryMoveItemBetween(itemName: string, fromInventory: Inventory, toInventory: Inventory, amount: number | undefined = undefined): number {
    const item = fromInventory.items.find(i => i.name === itemName);
    if (!item || item.counter === 0) {
        return 0;
    }
    let maxFromInventoryAmount = amount !== undefined ? amount : item.counter;
    if (item.counter < maxFromInventoryAmount) {
        maxFromInventoryAmount = item.counter;
    }
    const toAmount = inventoryPutItemInto(itemName, toInventory, maxFromInventoryAmount, item.data);
    item.counter -= toAmount;
    if (item.data) item.data.splice(0, toAmount);
    return toAmount;
}

/**
 * @returns actual amount put into inventory. As inventory has a max capacity it might not fit all in
 */
export function inventoryPutItemInto(itemName: string, inventory: Inventory, amount: number, data?: any[]): number {
    let item = inventory.items.find(i => i.name === itemName);
    let actualAmount = amount;
    if (!item) {
        item = {
            name: itemName,
            counter: 0,
        }
        if (data) item.data = [];
        inventory.items.push(item);
    }
    const availableCapacity = inventoryGetAvailableCapacity(inventory, itemName);
    if (actualAmount > availableCapacity) actualAmount = availableCapacity;
    if (actualAmount < 0) {
        throw "negativ trade not allowed";
    }
    item.counter += actualAmount;
    if (data && item.data) {
        let tempData = data;
        if (tempData.length > actualAmount) {
            tempData = tempData.toSpliced(actualAmount, tempData.length - actualAmount);
        }
        item.data.push(...tempData);
    }

    return actualAmount;
}

function paintMushroom(ctx: CanvasRenderingContext2D, item: InventoryItem, paintPosition: Position) {
    for (let i = 0; i < Math.min(item.counter, 10); i++) {
        const mushroomSize = 14;
        ctx.drawImage(IMAGES[IMAGE_PATH_MUSHROOM], 0, 0, 200, 200,
            paintPosition.x + i * 2,
            paintPosition.y,
            mushroomSize, mushroomSize
        );
    }
}

function paintWoodPlanks(ctx: CanvasRenderingContext2D, item: InventoryItem, paintPosition: Position) {
    for (let i = 0; i < Math.min(item.counter, 10); i++) {
        const woodPlankSize = 30;
        ctx.drawImage(IMAGES[IMAGE_PATH_WOOD_PLANK], 0, 0, 200, 200,
            paintPosition.x,
            paintPosition.y - i * 2,
            woodPlankSize, woodPlankSize
        );
    }
}
