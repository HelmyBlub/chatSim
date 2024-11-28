import { addChatMessage, CHAT_MESSAGE_INTENTION_MARKET_TRADE, ChatMessage, ChatMessageIntention, ChatMessageMarketTradeIntention, createEmptyChat } from "../chatBubble.js";
import { ChatSimState } from "../chatSimModels.js";
import { Building, BuildingMarket, marketGetQueueMapPosition, marketGetQueuePosition } from "../building.js";
import { addCitizenThought, Citizen, citizenStateStackTaskSuccess } from "../citizen.js";
import { inventoryGetPossibleTakeOutAmount, inventoryMoveItemBetween } from "../inventory.js";
import { calculateDistance, INVENTORY_MUSHROOM, INVENTORY_WOOD } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateGatherMushroom } from "./citizenStateGatherMushroom.js";
import { setCitizenStateGatherWood } from "./citizenStateGatherWood.js";
import { isCitizenAtPosition, isCitizenInInteractionDistance } from "./job.js";
import { buyItemFromMarket, JobMarketState, marketCanServeCustomer, marketServeCustomer } from "./jobMarket.js";

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

export type CitizenStateMarketQueue = {
    itemName: string,
    itemAmount?: number,
    market: BuildingMarket,
    stepState?: string,
    stepStartTime?: number,
    sell?: boolean,
}

export const CITIZEN_STATE_GET_ITEM = "GetItem";
export const CITIZEN_STATE_GET_ITEM_FROM_BUILDING = "GetItemFromBuilding";
export const CITIZEN_STATE_BUY_ITEM_FROM_MARKET = "BuyItemFromMarket";
export const CITIZEN_STATE_ENTER_MARKET_QUEUE = "EnterMarketQueue";
export const CITIZEN_STATE_MARKET_TRADE_INTERACTION = "MarketTradeInteraction";
export const CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING = "TransportItemToBuilding";

export function onLoadCitizenStateDefaultTickGetItemFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM] = tickCititzenStateGetItem;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM_FROM_BUILDING] = tickCitizenStateGetItemFromBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_BUY_ITEM_FROM_MARKET] = tickCitizenStateBuyItemFromMarket;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_ENTER_MARKET_QUEUE] = tickCitizenStateEnterMarketQueue;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING] = tickCitizenStateTransportItemToBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_TRADE_INTERACTION] = tickCitizenStateMarketTradeInteraction;
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

export function setCitizenStateEnterMarketQueue(citizen: Citizen, market: BuildingMarket, itemName: string, itemAmount: number | undefined = undefined) {
    const data: CitizenStateMarketQueue = { market: market, itemName: itemName, itemAmount: itemAmount };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_ENTER_MARKET_QUEUE, data: data });
}

export function setCitizenStateMarketTradeInteraction(citizen: Citizen, market: BuildingMarket, itemName: string, itemAmount: number | undefined = undefined): boolean {
    const canServe = marketServeCustomer(market, citizen);
    if (!canServe) return false;
    const data: CitizenStateMarketQueue = { market: market, itemName: itemName, itemAmount: itemAmount };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_MARKET_TRADE_INTERACTION, data: data });
    return true;
}

function tickCitizenStateEnterMarketQueue(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const citizenStateMarket = citizen.stateInfo.stack[0].data as CitizenStateMarketQueue;
        if (citizenStateMarket.market.inhabitedBy && isCitizenAtPosition(citizenStateMarket.market.inhabitedBy, citizenStateMarket.market.position)) {
            const queuePosition = marketGetQueuePosition(citizen, citizenStateMarket.market);
            const mapPosition = marketGetQueueMapPosition(citizen, citizenStateMarket.market);
            if (queuePosition === 0) {
                const data = citizen.stateInfo.stack[0].data as CitizenStateMarketQueue;
                if (data.stepState === undefined) {
                    if (isCitizenAtPosition(citizen, mapPosition)) {
                        data.stepState = "waitingForMyTurn";
                    } else {
                        citizen.moveTo = mapPosition;
                    }
                } else {
                    if (marketCanServeCustomer(citizenStateMarket.market, citizen)) {
                        if (data.stepState === "waitingForMyTurn") {
                            data.stepState = "movingUp";
                            citizen.moveTo = {
                                x: data.market.position.x + 20,
                                y: data.market.position.y + 17,
                            }
                        } else {
                            citizenStateStackTaskSuccess(citizen);
                            citizenStateMarket.market.queue?.shift();
                            return;
                        }
                    }
                }
            } else {
                citizen.moveTo = mapPosition;
            }
        } else {
            citizenStateStackTaskSuccess(citizen);
        }
    }
}

function tickCitizenStateMarketTradeInteraction(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateMarketQueue;
        if (data.market.deterioration >= 1) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (isCitizenInInteractionDistance(citizen, data.market.position)) {
            if (data.market.inhabitedBy && isCitizenAtPosition(data.market.inhabitedBy, data.market.position)) {
                let chat = data.market.inhabitedBy.lastChat;
                const marketCitizen = data.market.inhabitedBy;
                if (!chat) {
                    chat = createEmptyChat();
                    data.market.inhabitedBy.lastChat = chat;
                }
                let lastMarketMessage;
                let possibleResponse: ChatMessage | undefined = undefined;
                for (let i = chat.messages.length - 1; i >= 0; i--) {
                    const message = chat.messages[i];
                    if (lastMarketMessage === undefined && message.by === marketCitizen) {
                        lastMarketMessage = message;
                    }
                    if (message.by === citizen) {
                        if (lastMarketMessage !== undefined) {
                            possibleResponse = lastMarketMessage;
                        }
                        break;
                    }
                }

                if (possibleResponse && possibleResponse.intention) {
                    if (possibleResponse.time + 1000 > state.time) return;
                    const intention = possibleResponse.intention as ChatMessageMarketTradeIntention;
                    if (intention.intention === "whatDoYouWant") {
                        const myIntention: ChatMessageMarketTradeIntention = {
                            type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                            intention: "tradeRequestData",
                            itemName: data.itemName,
                            itemAmount: data.itemAmount,
                            sell: data.sell,
                        }
                        addChatMessage(chat, citizen, `I want to ${myIntention.sell ? "sell" : "buy"} ${myIntention.itemAmount}x${myIntention.itemName}.`, state, myIntention);
                        data.stepState === "waitingForRespone";
                        data.stepStartTime = state.time;
                    }
                    if (intention.intention === "priceResponse") {
                        if (intention.itemAmount !== undefined && intention.singlePrice !== undefined) {
                            const totalPrice = intention.itemAmount * intention.singlePrice;
                            let amount = intention.itemAmount;
                            if (citizen.money < totalPrice) {
                                amount = Math.floor(citizen.money / intention.singlePrice);
                            }
                            const myIntention: ChatMessageMarketTradeIntention = {
                                type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                                intention: "accept",
                                itemName: intention.itemName,
                                itemAmount: amount,
                                singlePrice: intention.singlePrice,
                                sell: intention.sell,
                            }
                            let message = ``;
                            if (citizen.money < totalPrice) {
                                message = `I will buy ${myIntention.itemAmount}x${myIntention.itemName} for $${myIntention.singlePrice! * amount}`;
                            } else {
                                message = `Yes please!`;
                            }
                            addChatMessage(chat, citizen, message, state, myIntention);
                            data.stepState === "waitingForRespone";
                            data.stepStartTime = state.time;
                        }
                    }
                    if (intention.intention === "tradeFullfiled") {
                        citizenStateStackTaskSuccess(citizen);
                        return;
                    }
                } else {
                    if (data.stepState === "waitingForRespone" && data.stepStartTime !== undefined) {
                        if (data.stepStartTime + 2000 < state.time) {
                            data.stepState = undefined;
                            data.stepStartTime = undefined;
                        }
                    } else {
                        const intention: ChatMessageMarketTradeIntention = {
                            type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                            intention: "initialGreeting",
                        }
                        addChatMessage(chat, citizen, `Hello.`, state, intention);
                        data.stepState = "waitingForRespone";
                        data.stepStartTime = state.time;
                    }
                }
            } else {
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        } else {
            citizen.moveTo = {
                x: data.market.position.x,
                y: data.market.position.y,
            }
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
        if (data.stepState === "startedTrade") {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (isCitizenInInteractionDistance(citizen, data.building.position)) {
            if (data.building.inhabitedBy && isCitizenAtPosition(data.building.inhabitedBy, data.building.position)) {
                if (data.building.inhabitedBy.stateInfo.stack.length > 0) {
                    const market = data.building as BuildingMarket;
                    const marketState: JobMarketState = data.building.inhabitedBy.stateInfo.stack[0].state as JobMarketState;
                    if (data.stepState !== "joinedQueue" && ((market.queue && market.queue.length > 0) || marketState !== "waitingForCustomers")) {
                        data.stepState = "joinedQueue";
                        addCitizenThought(citizen, `I have to join the queue.`, state);
                        setCitizenStateEnterMarketQueue(citizen, data.building as BuildingMarket, data.itemName, data.itemAmount);
                        return;
                    } else {
                        data.stepState = "startedTrade";
                        setCitizenStateMarketTradeInteraction(citizen, data.building as BuildingMarket, data.itemName, data.itemAmount);
                        return;
                    }
                }
            }
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizen.moveTo = {
                x: data.building.position.x + 20,
                y: data.building.position.y + 17,
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
        if (isCitizenAtPosition(citizen, data.building.position)) {
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
        if (isCitizenAtPosition(citizen, data.building.position)) {
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
    return closest;
}