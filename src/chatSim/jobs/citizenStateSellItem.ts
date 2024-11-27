import { addChatMessage, createEmptyChat } from "../chatBubble.js";
import { BuildingMarket, ChatSimState } from "../chatSimModels.js";
import { Citizen, citizenStateStackTaskFailed, citizenStateStackTaskSuccess } from "../citizen.js";
import { inventoryGetAvaiableCapacity } from "../inventory.js";
import { calculateDistance } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { isCitizenInInteractDistance } from "./job.js";
import { sellItemToMarket } from "./jobMarket.js";

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
export const CITIZEN_STATE_SELL_ITEM_TO_MARKET = "SellItemToMarket";

export function onLoadCitizenStateDefaultTickSellItemFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_SELL_ITEM] = tickCititzenStateSellItem;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_SELL_ITEM_TO_MARKET] = tickCitizenStateSellItemToMarket;
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

function setCitizenStateSellItemToMarket(citizen: Citizen, itemName: string, itemAmount: number, market: BuildingMarket) {
    const data: CitizenStateItemAndMarketData = { itemName: itemName, itemAmount: itemAmount, market: market };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_SELL_ITEM_TO_MARKET, data: data });
}

function tickCitizenStateSellItemToMarket(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateItemAndMarketData;
        if (data.market.deterioration >= 1) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (isCitizenInInteractDistance(citizen, data.market.position)) {
            if (data.market.inhabitedBy && isCitizenInInteractDistance(citizen, data.market.inhabitedBy.position)) {
                const finalAmount = sellItemToMarket(data.market, citizen, data.itemName, state, data.itemAmount);
                if (finalAmount !== undefined && finalAmount > 0) {
                    const chat = createEmptyChat();
                    addChatMessage(chat, data.market.inhabitedBy, `I want to sell ${data.itemAmount}x${data.itemName}`, state);
                    addChatMessage(chat, citizen, `I would buy ${finalAmount}x${data.itemName} for $${finalAmount}`, state);
                    addChatMessage(chat, data.market.inhabitedBy, `Yes please!`, state);
                    data.market.inhabitedBy.lastChat = chat;
                }
            }
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizen.moveTo = {
                x: data.market.position.x,
                y: data.market.position.y,
            }
        }
    }
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
        setCitizenStateSellItemToMarket(citizen, item.name, sellAmount, market);
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
        if (!isCitizenInInteractDistance(building.inhabitedBy, building.position)) continue;
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