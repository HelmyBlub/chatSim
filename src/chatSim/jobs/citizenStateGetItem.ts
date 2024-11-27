import { addChatMessage, createEmptyChat } from "../chatBubble.js";
import { ChatSimState } from "../chatSimModels.js";
import { Building, BuildingMarket, marketGetQueueMapPosition, marketGetQueuePosition } from "../building.js";
import { addCitizenThought, Citizen, citizenStateStackTaskSuccess } from "../citizen.js";
import { inventoryGetPossibleTakeOutAmount, inventoryMoveItemBetween } from "../inventory.js";
import { calculateDistance, INVENTORY_MUSHROOM, INVENTORY_WOOD } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateGatherMushroom } from "./citizenStateGatherMushroom.js";
import { setCitizenStateGatherWood } from "./citizenStateGatherWood.js";
import { isCitizenInInteractDistance } from "./job.js";
import { buyItemFromMarket } from "./jobMarket.js";

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
}

export type CitizenStateMarketQueue = {
    market: BuildingMarket,
}

export const CITIZEN_STATE_GET_ITEM = "GetItem";
export const CITIZEN_STATE_GET_ITEM_FROM_BUILDING = "GetItemFromBuilding";
export const CITIZEN_STATE_BUY_ITEM_FROM_MARKET = "BuyItemFromMarket";
export const CITIZEN_STATE_ENTER_MARKET_QUEUE = "EnterMarketQueue";
export const CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING = "TransportItemToBuilding";

export function onLoadCitizenStateDefaultTickGetItemFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM] = tickCititzenStateGetItem;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM_FROM_BUILDING] = tickCitizenStateGetItemFromBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_BUY_ITEM_FROM_MARKET] = tickCitizenStateBuyItemFromMarket;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_ENTER_MARKET_QUEUE] = tickCitizenStateEnterMarketQueue;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING] = tickCitizenStateTransportItemToBuilding;
}

export function setCitizenStateGetItem(citizen: Citizen, itemName: string, itemAmount: number, ignoreReserved: boolean = false, ignoreHome: boolean = false) {
    const data: CitizenStateGetItemData = { name: itemName, amount: itemAmount, ignoreReserved: ignoreReserved, ignoreHome: ignoreHome };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_ITEM, data: data });
}

export function setCitizenStateGetItemFromBuilding(citizen: Citizen, building: Building, itemName: string, itemAmount: number) {
    const data: CitizenStateItemAndBuildingData = { itemName: itemName, itemAmount: itemAmount, building: building };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_ITEM_FROM_BUILDING, data: data });
}

export function setCitizenStateBuyItemFromMarket(citizen: Citizen, market: BuildingMarket, itemName: string, itemAmount: number) {
    const data: CitizenStateItemAndBuildingData = { itemName: itemName, itemAmount: itemAmount, building: market };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_BUY_ITEM_FROM_MARKET, data: data });
}

export function setCitizenStateTransportItemToBuilding(citizen: Citizen, building: Building, itemName: string, itemAmount: number | undefined = undefined) {
    const data: CitizenStateItemAndBuildingData = { itemName: itemName, itemAmount: itemAmount, building: building };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING, data: data });
}

export function setCitizenStateEnterMarketQueue(citizen: Citizen, market: BuildingMarket) {
    const data: CitizenStateMarketQueue = { market: market };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_ENTER_MARKET_QUEUE, data: data });
}

function tickCitizenStateEnterMarketQueue(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const citizenStateMarket = citizen.stateInfo.stack[0].data as CitizenStateMarketQueue;
        const queuePosition = marketGetQueuePosition(citizen, citizenStateMarket.market);
        const mapPosition = marketGetQueueMapPosition(citizen, citizenStateMarket.market);
        if (queuePosition === 0 && isCitizenInInteractDistance(citizen, mapPosition)) {
            citizenStateStackTaskSuccess(citizen);
            if (citizenStateMarket.market.queue) {
                citizenStateMarket.market.queue.shift();
            }
        } else {
            citizen.moveTo = mapPosition;
        }
    }
}

function tickCitizenStateBuyItemFromMarket(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateItemAndBuildingData;
        if (data.building.deterioration >= 1) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (isCitizenInInteractDistance(citizen, data.building.position)) {
            if (data.building.inhabitedBy && isCitizenInInteractDistance(citizen, data.building.inhabitedBy.position)) {
                if (data.stepState === undefined) {
                    data.stepState = "queuing";
                    setCitizenStateEnterMarketQueue(citizen, data.building as BuildingMarket);
                    return;
                } else {
                    const finalAmount = buyItemFromMarket(data.building as BuildingMarket, citizen, data.itemName, state, data.itemAmount);
                    if (finalAmount !== undefined && finalAmount > 0) {
                        const chat = createEmptyChat();
                        addChatMessage(chat, data.building.inhabitedBy, `I want to buy ${data.itemAmount}x${INVENTORY_MUSHROOM}`, state);
                        addChatMessage(chat, citizen, `I would sell ${finalAmount}x${INVENTORY_MUSHROOM} for $${2 * finalAmount}`, state);
                        addChatMessage(chat, data.building.inhabitedBy, `Yes please!`, state);
                        data.building.inhabitedBy.lastChat = chat;
                    }
                }
            }
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizen.moveTo = {
                x: data.building.position.x,
                y: data.building.position.y,
            }
        }
    }
}

function tickCitizenStateTransportItemToBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateItemAndBuildingData;
        if (data.building.deterioration >= 1) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (isCitizenInInteractDistance(citizen, data.building.position)) {
            inventoryMoveItemBetween(data.itemName, citizen.inventory, data.building.inventory, data.itemAmount);
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizen.moveTo = {
                x: data.building.position.x,
                y: data.building.position.y,
            }
        }
    }
}

function tickCitizenStateGetItemFromBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateItemAndBuildingData;
        if (data.building.deterioration >= 1) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (isCitizenInInteractDistance(citizen, data.building.position)) {
            inventoryMoveItemBetween(data.itemName, data.building.inventory, citizen.inventory, data.itemAmount);
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizen.moveTo = {
                x: data.building.position.x,
                y: data.building.position.y,
            }
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
            addCitizenThought(citizen, `I do have ${item.name} at home. I go get it.`, state);
            const wantedAmount = Math.min(openAmount, availableAmountAtHome);
            setCitizenStateGetItemFromBuilding(citizen, citizen.home, item.name, wantedAmount);
            return;
        }
    }
    for (let building of state.map.buildings) {
        if (building.inhabitedBy === citizen && building !== citizen.home) {
            const availableAmount = inventoryGetPossibleTakeOutAmount(item.name, building.inventory, item.ignoreReserved);
            if (availableAmount > 0) {
                const wantedAmount = Math.min(openAmount, availableAmount);
                addCitizenThought(citizen, `I do have ${item.name} at my ${building.type}. I go get it.`, state);
                setCitizenStateGetItemFromBuilding(citizen, building, item.name, wantedAmount);
                return;
            }
        }
    }
    if (citizen.money >= 2) {
        const market = findClosestOpenMarketWhichSellsItem(citizen, item.name, state) as BuildingMarket;
        if (market) {
            addCitizenThought(citizen, `I will buy ${item.name} at ${market.inhabitedBy!.name}.`, state);
            setCitizenStateBuyItemFromMarket(citizen, market, item.name, item.amount);
            return;
        }
    }

    if (item.name === INVENTORY_MUSHROOM) {
        addCitizenThought(citizen, `I did not see a way to get ${item.name}. Let's gather it myself.`, state);
        setCitizenStateGatherMushroom(citizen, item.amount);
        return;
    }
    if (item.name === INVENTORY_WOOD) {
        addCitizenThought(citizen, `I did not see a way to get ${item.name}. Let's gather it myself.`, state);
        setCitizenStateGatherWood(citizen, item.amount);
        return;
    }
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