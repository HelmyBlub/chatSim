import { ChatSimState } from "../chatSimModels.js";
import { Building, BuildingMarket } from "../building.js";
import { citizenAddThought, Citizen, citizenStateStackTaskSuccess, citizenMoveTo } from "../citizen.js";
import { inventoryGetPossibleTakeOutAmount, inventoryMoveItemBetween } from "../inventory.js";
import { calculateDistance } from "../main.js";
import { INVENTORY_MUSHROOM, INVENTORY_WOOD } from "../inventory.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateGatherMushroom } from "./citizenStateGatherMushroom.js";
import { setCitizenStateGatherWood } from "./citizenStateGatherWood.js";
import { setCitizenStateTradeItemWithMarket } from "./citizenStateMarket.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { mapGetChunksInDistance } from "../map.js";

export type CitizenStateGetItemData = {
    name: string,
    amount: number,
    ignoreReserved?: boolean,
    ignoreHome?: boolean,
}

export type CitizenStateItemAndBuildingData = {
    itemName: string,
    itemAmount?: number,
    building: Building,
    stepState?: string,
    stepStartTime?: number,
}

export const CITIZEN_STATE_GET_ITEM = "GetItem";
export const CITIZEN_STATE_GET_ITEM_FROM_BUILDING = "GetItemFromBuilding";
export const CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING = "TransportItemToBuilding";

export function onLoadCitizenStateDefaultTickGetItemFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM] = tickCititzenStateGetItem;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM_FROM_BUILDING] = tickCitizenStateGetItemFromBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING] = tickCitizenStateTransportItemToBuilding;
}

export function setCitizenStateGetItem(citizen: Citizen, itemName: string, itemAmount: number, ignoreReserved: boolean = false, ignoreHome: boolean = false) {
    const data: CitizenStateGetItemData = { name: itemName, amount: itemAmount, ignoreReserved: ignoreReserved, ignoreHome: ignoreHome };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_ITEM, data: data });
}

export function setCitizenStateGetItemFromBuilding(citizen: Citizen, building: Building, itemName: string, itemAmount: number) {
    const data: CitizenStateItemAndBuildingData = { itemName: itemName, itemAmount: itemAmount, building: building };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_ITEM_FROM_BUILDING, data: data, tags: [] });
}

export function setCitizenStateTransportItemToBuilding(citizen: Citizen, building: Building, itemName: string, itemAmount: number | undefined = undefined) {
    const data: CitizenStateItemAndBuildingData = { itemName: itemName, itemAmount: itemAmount, building: building };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING, data: data, tags: [] });
}

function tickCitizenStateTransportItemToBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateItemAndBuildingData;
        if (isCitizenAtPosition(citizen, data.building.position)) {
            inventoryMoveItemBetween(data.itemName, citizen.inventory, data.building.inventory, data.itemAmount);
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizenMoveTo(citizen, data.building.position);
        }
    }
}

function tickCitizenStateGetItemFromBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateItemAndBuildingData;
        if (isCitizenAtPosition(citizen, data.building.position)) {
            inventoryMoveItemBetween(data.itemName, data.building.inventory, citizen.inventory, data.itemAmount);
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizenMoveTo(citizen, data.building.position);
        }
    }
}

function tickCititzenStateGetItem(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const item = citizenState.data as CitizenStateGetItemData;
    const citizenInventory = citizen.inventory.items.find(i => i.name === item.name);
    let openAmount = item.amount;
    if (citizenInventory) {
        if (citizenInventory.counter >= item.amount) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        openAmount -= citizenInventory.counter;
    }
    if (citizen.home && !item.ignoreHome) {
        const availableAmountAtHome = inventoryGetPossibleTakeOutAmount(item.name, citizen.home.inventory, item.ignoreReserved);
        if (availableAmountAtHome > 0) {
            citizenAddThought(citizen, `I do have ${item.name} at home. I go get it.`, state);
            const wantedAmount = Math.min(openAmount, availableAmountAtHome);
            setCitizenStateGetItemFromBuilding(citizen, citizen.home, item.name, wantedAmount);
            return;
        }
    }

    const chunks = mapGetChunksInDistance(citizen.position, state.map, 600);
    for (let chunk of chunks) {
        for (let building of chunk.buildings) {
            if (building.inhabitedBy === citizen && building !== citizen.home) {
                const availableAmount = inventoryGetPossibleTakeOutAmount(item.name, building.inventory, item.ignoreReserved);
                if (availableAmount > 0) {
                    const wantedAmount = Math.min(openAmount, availableAmount);
                    citizenAddThought(citizen, `I do have ${item.name} at my ${building.type}. I go get it.`, state);
                    setCitizenStateGetItemFromBuilding(citizen, building, item.name, wantedAmount);
                    return;
                }
            }
        }
    }
    if (citizen.money >= 2) {
        const market = findClosestOpenMarketWhichSellsItem(citizen, item.name, state) as BuildingMarket;
        if (market) {
            citizenAddThought(citizen, `I will buy ${item.name} at ${market.inhabitedBy!.name}.`, state);
            setCitizenStateTradeItemWithMarket(citizen, market, false, item.name, item.amount);
            return;
        }
    }

    if (item.name === INVENTORY_MUSHROOM) {
        citizenAddThought(citizen, `I did not see a way to get ${item.name}. Let's gather it myself.`, state);
        setCitizenStateGatherMushroom(citizen, item.amount);
        return;
    }
    if (item.name === INVENTORY_WOOD) {
        citizenAddThought(citizen, `I did not see a way to get ${item.name}. Let's gather it myself.`, state);
        setCitizenStateGatherWood(citizen, item.amount);
        return;
    }
}

function findClosestOpenMarketWhichSellsItem(citizen: Citizen, itemName: string, state: ChatSimState): Building | undefined {
    let closest = undefined;
    let closestDistance: number = -1;
    const chunks = mapGetChunksInDistance(citizen.position, state.map, 800);
    for (let chunk of chunks) {
        for (let building of chunk.buildings) {
            if (building.deterioration >= 1) continue;
            if (building.type !== "Market") continue;
            if (building.inhabitedBy === undefined) continue;
            const inventory = building.inventory.items.find(i => i.name === itemName);
            if (!inventory || inventory.counter === 0) continue;
            if (!isCitizenAtPosition(building.inhabitedBy, building.position)) continue;
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
    }
    return closest;
}