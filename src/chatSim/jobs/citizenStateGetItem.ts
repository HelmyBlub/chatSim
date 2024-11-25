import { Building, ChatSimState } from "../chatSimModels.js";
import { Citizen } from "../citizen.js";
import { inventoryGetPossibleTakeOutAmount, inventoryMoveItemBetween } from "../inventory.js";
import { calculateDistance, INVENTORY_MUSHROOM } from "../main.js";
import { setCitizenStateGatherMushroom } from "./citizenStateGatherMushroom.js";
import { buyItem, isCitizenInInteractDistance } from "./job.js";

export type CitizenStateGetItemData = {
    name: string,
    amount: number,
    ignoreReserved?: boolean,
}

export type CitizenStateGetItemFromBuildingData = {
    itemName: string,
    itemAmount: number,
    building: Building,
}

export const CITIZEN_STATE_GET_ITEM = "GetItem";
export const CITIZEN_STATE_GET_ITEM_FROM_BUILDING = "GetItemFromBuilding";
export const CITIZEN_STATE_BUY_ITEM_FROM_MARKET = "BuyItemFromMarket";

export function setCitizenStateGetItem(citizen: Citizen, itemName: string, itemAmount: number, ignoreReserved: boolean = false) {
    const data: CitizenStateGetItemData = { name: itemName, amount: itemAmount, ignoreReserved: ignoreReserved };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_ITEM, data: data });
}

export function tickCitizenStateBuyItemFromMarket(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateGetItemFromBuildingData;
        if (data.building.deterioration >= 1) {
            citizen.stateInfo.stack.shift();
            return;
        }
        if (isCitizenInInteractDistance(citizen, data.building.position)) {
            if (data.building.inhabitedBy && isCitizenInInteractDistance(citizen, data.building.inhabitedBy.position)) {
                buyItem(data.building.inhabitedBy, citizen, data.itemName, 2, state, data.itemAmount);
            }
            citizen.stateInfo.stack.shift();
            return;
        } else {
            citizen.moveTo = {
                x: data.building.position.x,
                y: data.building.position.y,
            }
        }
    }
}

export function tickCitizenStateGetItemFromBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateGetItemFromBuildingData;
        if (data.building.deterioration >= 1) {
            citizen.stateInfo.stack.shift();
            return;
        }
        if (isCitizenInInteractDistance(citizen, data.building.position)) {
            inventoryMoveItemBetween(data.itemName, data.building.inventory, citizen.inventory, data.itemAmount);
            citizen.stateInfo.stack.shift();
            return;
        } else {
            citizen.moveTo = {
                x: data.building.position.x,
                y: data.building.position.y,
            }
        }
    }
}

export function tickCititzenStateGetItem(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const item = citizenState.data as CitizenStateGetItemData;
    const citizenInventory = citizen.inventory.items.find(i => i.name === item.name);
    let openAmount = item.amount;
    if (citizenInventory) {
        if (citizenInventory.counter >= item.amount) {
            citizen.stateInfo.stack.shift();
            return;
        }
        openAmount -= citizenInventory.counter;
    }
    if (citizen.home) {
        const availableAmountAtHome = inventoryGetPossibleTakeOutAmount(item.name, citizen.home.inventory, item.ignoreReserved);
        if (availableAmountAtHome > 0) {
            const wantedAmount = Math.min(openAmount, availableAmountAtHome);
            const data: CitizenStateGetItemFromBuildingData = { itemName: item.name, itemAmount: wantedAmount, building: citizen.home };
            citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_ITEM_FROM_BUILDING, data: data });
            return;
        }
    }
    for (let building of state.map.buildings) {
        if (building.inhabitedBy === citizen && building !== citizen.home) {
            const availableAmount = inventoryGetPossibleTakeOutAmount(item.name, building.inventory, item.ignoreReserved);
            if (availableAmount > 0) {
                const wantedAmount = Math.min(openAmount, availableAmount);
                const data: CitizenStateGetItemFromBuildingData = { itemName: item.name, itemAmount: wantedAmount, building: building };
                citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_ITEM_FROM_BUILDING, data: data });
                return;
            }
        }
    }
    if (citizen.money >= 2) {
        const market = findClosestOpenMarketWhichSellsItem(citizen, item.name, state);
        if (market) {
            const data: CitizenStateGetItemFromBuildingData = { itemName: item.name, itemAmount: openAmount, building: market };
            citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_BUY_ITEM_FROM_MARKET, data: data });
            return;
        }
    }

    if (item.name === INVENTORY_MUSHROOM) {
        setCitizenStateGatherMushroom(citizen, openAmount);
        return;
    }
    //TODO
    // gather myself if possible
    // how to gather item which could be anything?
    //      only specific items get implementation: mushroom/wood
    //      worry about other stuff in the future
}

function findClosestOpenMarketWhichSellsItem(citizen: Citizen, itemName: string, state: ChatSimState): Building | undefined {
    let closest = undefined;
    let closestDistance: number = -1;
    for (let building of state.map.buildings) {
        if (building.type !== "Market") continue;
        if (building.inhabitedBy === undefined) continue;
        const inventory = building.inventory.items.find(i => i.name === itemName);
        if (!inventory || inventory.counter === 0) continue;
        if (!isCitizenInInteractDistance(building.inhabitedBy, building.position)) continue;
        if (!closest) {
            closest = building;
            closestDistance = calculateDistance(building.position, citizen.position);
        } else {
            const tempDistance = calculateDistance(building.position, citizen.position);
            if (tempDistance < closestDistance) {
                closest = building;
                closestDistance = tempDistance;
            }
        }
    }
    return closest;
}