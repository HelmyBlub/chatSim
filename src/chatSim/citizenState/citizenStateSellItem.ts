import { addChatMessage, createEmptyChat } from "../chatBubble.js";
import { ChatSimState } from "../chatSimModels.js";
import { BuildingMarket } from "../building.js";
import { Citizen, citizenStateStackTaskFailed, citizenStateStackTaskSuccess } from "../citizen.js";
import { inventoryGetAvaiableCapacity } from "../inventory.js";
import { calculateDistance } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { setCitizenStateTradeItemWithMarket } from "./citizenStateMarket.js";

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
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_SELL_ITEM] = tickCititzenStateSellItem;
}

export function setCitizenStateSellItem(citizen: Citizen, itemName: string, itemAmount: number | undefined = undefined) {
    let amount = itemAmount;
    if (amount === undefined) {
        const inventoryItem = citizen.inventory.items.find(i => i.name === itemName);
        if (!inventoryItem) return;
        amount = inventoryItem.counter;
    }
    const data: CitizenStateSellItemData = { name: itemName, amount: amount };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_SELL_ITEM, data: data });
}

function tickCititzenStateSellItem(citizen: Citizen, state: ChatSimState) {
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
    for (let building of state.map.buildings) {
        if (building.type !== "Market") continue;
        const market = building as BuildingMarket;
        if (building.inhabitedBy === undefined) continue;
        if (building.inhabitedBy.money <= 0) continue;
        if (inventoryGetAvaiableCapacity(building.inventory, itemName) <= 0) continue;
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
    return closest;
}