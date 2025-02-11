import { ChatSimState } from "../chatSimModels.js";
import { Building, BuildingMarket, MAP_OBJECT_BUILDING } from "../map/mapObjectBuilding.js";
import { Citizen, citizenStateStackTaskFailed, citizenStateStackTaskSuccess } from "../map/citizen.js";
import { inventoryGetAvailableCapacity } from "../inventory.js";
import { calculateDistance } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { setCitizenStateTradeItemWithMarket } from "./citizenStateMarket.js";
import { mapGetChunksInDistance } from "../map/map.js";

export type CitizenStateSellItemData = {
    name: string,
    amount: number,
}

export type CitizenStateItemAndMarketData = {
    itemName: string,
    itemAmount?: number,
    market: BuildingMarket,
}

export const CITIZEN_STATE_SELL_ITEM = "SellItem";

export function onLoadCitizenStateDefaultTickSellItemFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_SELL_ITEM] = tickCitizenStateSellItem;
}

export function setCitizenStateSellItem(citizen: Citizen, itemName: string, itemAmount: number | undefined = undefined) {
    let amount = itemAmount;
    if (amount === undefined) {
        const inventoryItem = citizen.inventory.items.find(i => i.name === itemName);
        if (!inventoryItem) return;
        amount = inventoryItem.counter;
    }
    const data: CitizenStateSellItemData = { name: itemName, amount: amount };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_SELL_ITEM, data: data, tags: new Set() });
}

function tickCitizenStateSellItem(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const item = citizenState.data as CitizenStateSellItemData;
    const citizenInventory = citizen.inventory.items.find(i => i.name === item.name);
    const sellAmount = item.amount;
    if (citizenInventory) {
        if (citizenInventory.counter < sellAmount) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
    } else {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    const market = findClosestOpenMarketWhichBuysItem(citizen, item.name, state);
    if (market) {
        setCitizenStateTradeItemWithMarket(citizen, market, true, item.name, item.amount);
        return;
    } else {
        citizenStateStackTaskFailed(citizen);
        return;
    }
}

function findClosestOpenMarketWhichBuysItem(citizen: Citizen, itemName: string, state: ChatSimState): BuildingMarket | undefined {
    let closest = undefined;
    let closestDistance: number = -1;
    const chunks = mapGetChunksInDistance(citizen.position, state.map, 800);
    for (let chunk of chunks) {
        const buildings = chunk.tileObjects.get(MAP_OBJECT_BUILDING) as Building[];
        if (!buildings) continue;
        for (let building of buildings) {
            if (building.deterioration >= 1) continue;
            if (building.buildingType !== "Market") continue;
            const market = building as BuildingMarket;
            if (building.inhabitedBy === undefined) continue;
            if (building.inhabitedBy.money <= 0) continue;
            if (inventoryGetAvailableCapacity(building.inventory, itemName) <= 0) continue;
            if (!isCitizenAtPosition(building.inhabitedBy, building.position)) continue;
            if (!closest) {
                closest = market;
                closestDistance = calculateDistance(building.position, citizen.position);
            } else {
                const tempDistance = calculateDistance(building.position, citizen.position);
                if (tempDistance < closestDistance) {
                    closest = market;
                    closestDistance = tempDistance;
                }
            }
        }
    }
    return closest;
}