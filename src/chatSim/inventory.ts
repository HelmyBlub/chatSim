import { ChatSimState } from "./chatSimModels.js";
import { addCitizenLogEntry, Citizen } from "./citizen.js";
import { isCitizenInInteractDistance } from "./jobs/job.js";

export type InventoryItem = {
    name: string,
    counter: number,
}

export type Inventory = {
    items: InventoryItem[],
    reservedSpace?: InventoryItem[],
    size: number,
}

export function inventoryGetMissingReserved(inventory: Inventory, itemName: string): number {
    if (inventory.reservedSpace) {
        let counter = 0;
        const reservedItem = inventory.reservedSpace.find(i => i.name === itemName);
        if (reservedItem) {
            const inventoryItem = inventory.items.find(i => i.name === itemName);
            if (inventoryItem) {
                return Math.max(0, reservedItem.counter - inventoryItem.counter);
            }
        }
    }
    return 0;
}

export function inventoryGetAvaiableCapacity(inventory: Inventory, itemName: string) {
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

export function inventoryGetPossibleTakeOutAmount(itemName: string, inventory: Inventory, ignoreReserved: boolean = false): number {
    const item = inventory.items.find(i => i.name === itemName);
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

export function inventoryEmptyCitizenToHomeInventory(citizen: Citizen, state: ChatSimState) {
    if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
        for (let item of citizen.inventory.items) {
            if (item.counter > 0) {
                const amount = inventoryMoveItemBetween(item.name, citizen.inventory, citizen.home.inventory, item.counter);
                if (amount > 0) addCitizenLogEntry(citizen, `move ${amount}x${item.name} from inventory to home inventory`, state);
            }
        }
    }
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
    const toAmount = inventoryPutItemInto(itemName, toInventory, maxFromInventoryAmount);
    item.counter -= toAmount;
    return toAmount;
}

/**
 * @returns actual amount put into inventory. As inventory has a max capacity it might not fit all in
 */
export function inventoryPutItemInto(itemName: string, inventory: Inventory, amount: number): number {
    let item = inventory.items.find(i => i.name === itemName);
    let actualAmount = amount;
    if (!item) {
        item = {
            name: itemName,
            counter: 0,
        }
        inventory.items.push(item);
    }
    const availableCapacity = inventoryGetAvaiableCapacity(inventory, itemName);
    if (actualAmount > availableCapacity) actualAmount = availableCapacity;
    if (actualAmount < 0) {
        throw "negativ trade not allowed";
    }
    item.counter += actualAmount;
    return actualAmount;
}