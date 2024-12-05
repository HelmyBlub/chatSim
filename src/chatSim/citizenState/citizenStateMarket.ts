import { BuildingMarket, marketGetQueueMapPosition, marketGetQueuePosition, marketHasQueue } from "../building.js";
import { createEmptyChat, ChatMessage, ChatMessageMarketTradeIntention, CHAT_MESSAGE_INTENTION_MARKET_TRADE, addChatMessage } from "../chatBubble.js";
import { ChatSimState } from "../chatSimModels.js";
import { addCitizenThought, Citizen, CitizenState, citizenStateStackTaskSuccess } from "../citizen.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { isCitizenAtPosition, isCitizenInInteractionDistance } from "../jobs/job.js";
import { JobMarketState, marketCanServeCustomer, marketServeCustomer } from "../jobs/jobMarket.js";
import { Inventory, inventoryPutItemInto } from "../inventory.js";

export type CitizenStateMarketQueue = {
    market: BuildingMarket;
    stepState?: string;
    stepStartTime?: number;
}

export type CitizenStateMarketTradeData = {
    seller: boolean,
    waiting: boolean,
    market: BuildingMarket,
    inventory: Inventory,
}

export type CitizenStateMarketTradeSellerData = CitizenStateMarketTradeData & {
    itemName: string,
    itemAmount: number,
    expectedMoney: number,
}

export type CitizenStateMarketTradeBuyerData = CitizenStateMarketTradeData & {
    money: number,
    expectedItemName: string,
    expectedItemAmount: number,
}

type CitizenStateMarketTradeStart = {
    itemName: string;
    market: BuildingMarket;
    sellToMarket: boolean;
    itemAmount?: number;
};

export const CITIZEN_STATE_MARKET_TRADE_ITEM_WITH = "MarketTradeItemWith";
export const CITIZEN_STATE_MARKET_ENTER_QUEUE = "MarketEnterQueue";
export const CITIZEN_STATE_MARKET_TRADE_INTERACTION = "MarketTradeInteraction";
export const CITIZEN_STATE_MARKET_PUT_ITEM_ON_COUNTER = "MarketPutItemOnCounter";

export function onLoadCitizenStateDefaultTickMarketFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_TRADE_ITEM_WITH] = tickCitizenStateTradeItemWithMarket;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_ENTER_QUEUE] = tickCitizenStateEnterMarketQueue;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_TRADE_INTERACTION] = tickCitizenStateMarketTradeInteraction;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_PUT_ITEM_ON_COUNTER] = tickCitizenStateMarketPutItemOnCounter;
}

export function setCitizenStateTradeItemWithMarket(citizen: Citizen, market: BuildingMarket, sellToMarket: boolean, itemName: string, itemAmount: number) {
    const data: CitizenStateMarketTradeStart = { itemName: itemName, itemAmount: itemAmount, market: market, sellToMarket: sellToMarket };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_MARKET_TRADE_ITEM_WITH, data: data });
}

export function setCitizenStateEnterMarketQueue(citizen: Citizen, market: BuildingMarket) {
    const data: CitizenStateMarketQueue = { market: market };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_MARKET_ENTER_QUEUE, data: data });
}

export function setCitizenStateMarketTradeInteraction(citizen: Citizen, market: BuildingMarket, sellToMarket: boolean, itemName: string, itemAmount: number | undefined = undefined): boolean {
    const canServe = marketServeCustomer(market, citizen);
    if (!canServe) return false;
    const data: CitizenStateMarketTradeStart = { market: market, itemName: itemName, itemAmount: itemAmount, sellToMarket: sellToMarket };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_MARKET_TRADE_INTERACTION, data: data });
    return true;
}

export function setCitizenStatePutItemOnMarketCounter(citizen: Citizen, market: BuildingMarket, seller: boolean, itemName: string, itemAmount: number, money: number, waiting: boolean, inventory: Inventory) {
    let data: CitizenStateMarketTradeData;
    if (seller) {
        const tempData: CitizenStateMarketTradeSellerData = {
            waiting: waiting,
            inventory: inventory,
            expectedMoney: money,
            itemName: itemName,
            itemAmount: itemAmount,
            market: market,
            seller: seller
        }
        data = tempData;
    } else {
        const tempData: CitizenStateMarketTradeBuyerData = {
            waiting: waiting,
            inventory: inventory,
            money: money,
            expectedItemName: itemName,
            expectedItemAmount: itemAmount,
            market: market,
            seller: seller
        }
        data = tempData;
    }
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_MARKET_PUT_ITEM_ON_COUNTER, data: data });
}

function tickCitizenStateMarketPutItemOnCounter(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0] as CitizenState;
    const data = citizenState.data as CitizenStateMarketTradeData;
    if (citizenState.subState === undefined) {
        if (data.waiting) {
            citizenState.subState = "waitingForItemsOrMoneyOnCounter";
            citizenState.subStateStartTime = state.time;
        } else {
            citizenState.subState = "putOnCounter";
            citizenState.subStateStartTime = state.time;
        }
    }
    if (citizenState.subState === "waitingForItemsOrMoneyOnCounter") {
        const counter = data.market.counter;
        if (data.seller) {
            const sellerData = data as CitizenStateMarketTradeSellerData;
            if (counter.money >= sellerData.expectedMoney) {
                citizen.money += sellerData.expectedMoney;
                counter.money -= sellerData.expectedMoney;

                const sellerInventoryItem = sellerData.inventory.items.find(i => i.name === sellerData.itemName);
                if (sellerInventoryItem && sellerInventoryItem.counter >= sellerData.itemAmount) {
                    sellerInventoryItem.counter -= sellerData.itemAmount;
                    counter.items.push({ name: sellerData.itemName, counter: sellerData.itemAmount });
                }

                citizenStateStackTaskSuccess(citizen);
            }
        } else {
            const buyerData = data as CitizenStateMarketTradeBuyerData;
            const counterItemIndex = counter.items.findIndex(i => i.name === buyerData.expectedItemName && i.counter === buyerData.expectedItemAmount);
            if (counterItemIndex > -1) {
                const counterItem = counter.items.splice(counterItemIndex, 1)[0];
                inventoryPutItemInto(counterItem.name, buyerData.inventory, counterItem.counter);

                if (citizen.money >= buyerData.money) {
                    citizen.money -= buyerData.money;
                    counter.money += buyerData.money;
                }

                citizenStateStackTaskSuccess(citizen);
            }
        }
        return;
    }

    if (citizenState.subState === "putOnCounter" && citizenState.subStateStartTime! + 1000 < state.time) {
        const market = data.market;
        if (data.seller) {
            const sellerData = data as CitizenStateMarketTradeSellerData;
            const sellerInventoryItem = sellerData.inventory.items.find(i => i.name === sellerData.itemName);
            if (sellerInventoryItem && sellerInventoryItem.counter >= sellerData.itemAmount) {
                sellerInventoryItem.counter -= sellerData.itemAmount;
                market.counter.items.push({ name: sellerData.itemName, counter: sellerData.itemAmount });
            }
        } else {
            const buyerData = data as CitizenStateMarketTradeBuyerData;
            if (citizen.money >= buyerData.money) {
                citizen.money -= buyerData.money;
                market.counter.money += buyerData.money;
            }
        }
        citizenState.subState = "waiting";
        citizenState.subStateStartTime = state.time;
        return;
    }
    if (citizenState.subState === "waiting") {
        const counter = data.market.counter;
        if (data.seller) {
            const sellerData = data as CitizenStateMarketTradeSellerData;
            if (counter.money >= sellerData.expectedMoney) {
                citizen.money += sellerData.expectedMoney;
                counter.money -= sellerData.expectedMoney;
                citizenStateStackTaskSuccess(citizen);
            }
        } else {
            const buyerData = data as CitizenStateMarketTradeBuyerData;
            const counterItemIndex = counter.items.findIndex(i => i.name === buyerData.expectedItemName && i.counter === buyerData.expectedItemAmount);
            if (counterItemIndex > -1) {
                const counterItem = counter.items.splice(counterItemIndex, 1)[0];
                inventoryPutItemInto(counterItem.name, buyerData.inventory, counterItem.counter);
                citizenStateStackTaskSuccess(citizen);
            }
        }
        return;
    }
}

function tickCitizenStateEnterMarketQueue(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateMarketQueue;
        if (data.market.inhabitedBy && isCitizenAtPosition(data.market.inhabitedBy, data.market.position)) {
            const queuePosition = marketGetQueuePosition(citizen, data.market);
            const mapPosition = marketGetQueueMapPosition(citizen, data.market);
            if (queuePosition === 0) {
                if (data.stepState === undefined) {
                    if (isCitizenAtPosition(citizen, mapPosition)) {
                        data.stepState = "waitingForMyTurn";
                    } else {
                        citizen.moveTo = mapPosition;
                    }
                } else {
                    if (marketCanServeCustomer(data.market, citizen)) {
                        if (data.stepState === "waitingForMyTurn") {
                            data.stepState = "movingUp";
                            citizen.moveTo = {
                                x: data.market.position.x + 20,
                                y: data.market.position.y + 17,
                            }
                        } else {
                            citizenStateStackTaskSuccess(citizen);
                            data.market.queue?.shift();
                            return;
                        }
                    }
                }
            } else {
                if (!isCitizenAtPosition(citizen, mapPosition)) {
                    citizen.moveTo = mapPosition;
                } else {
                    const customerAhead = data.market.queue![queuePosition - 1];
                    const shouldBePosition = marketGetQueueMapPosition(customerAhead, data.market);
                    if (!isCitizenInInteractionDistance(customerAhead, shouldBePosition)) {
                        data.market.queue!.splice(queuePosition - 1, 1);
                    }
                }
            }
        } else {
            citizenStateStackTaskSuccess(citizen);
        }
    }
}

function tickCitizenStateMarketTradeInteraction(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const citizenState = citizen.stateInfo.stack[0] as CitizenState;
        const data = citizenState.data as CitizenStateMarketTradeStart;
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
                    if (message.time + 3000 < state.time) break;
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
                            sellToMarket: data.sellToMarket,
                        }
                        addChatMessage(chat, citizen, `I want to ${myIntention.sellToMarket ? "sell" : "buy"} ${myIntention.itemAmount}x${myIntention.itemName}.`, state, myIntention);
                        citizenState.subState === "waitingForRespone";
                        citizenState.subStateStartTime = state.time;
                    }
                    if (intention.intention === "priceResponse") {
                        if (intention.itemAmount !== undefined && intention.singlePrice !== undefined) {
                            const totalPrice = intention.itemAmount * intention.singlePrice;
                            let amount = intention.itemAmount;
                            if (intention.sellToMarket) {
                                const myIntention: ChatMessageMarketTradeIntention = {
                                    type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                                    intention: "accept",
                                    itemName: intention.itemName,
                                    itemAmount: amount,
                                    singlePrice: intention.singlePrice,
                                    sellToMarket: intention.sellToMarket,
                                }
                                addChatMessage(chat, citizen, `Yes please!`, state, myIntention);
                                citizenState.subState === "putOnCounter";
                                citizenState.subStateStartTime = state.time;
                                setCitizenStatePutItemOnMarketCounter(citizen, data.market, true, intention.itemName!, amount, amount * intention.singlePrice, false, citizen.inventory);
                                return;
                            } else {
                                if (citizen.money < totalPrice) {
                                    amount = Math.floor(citizen.money / intention.singlePrice);
                                }
                                const myIntention: ChatMessageMarketTradeIntention = {
                                    type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                                    intention: "accept",
                                    itemName: intention.itemName,
                                    itemAmount: amount,
                                    singlePrice: intention.singlePrice,
                                    sellToMarket: intention.sellToMarket,
                                }
                                let message = ``;
                                const finalPrice = myIntention.singlePrice! * amount;
                                if (citizen.money < totalPrice) {
                                    message = `I will buy ${myIntention.itemAmount}x${myIntention.itemName} for $${myIntention.singlePrice! * amount}`;
                                } else {
                                    message = `Yes please!`;
                                }
                                addChatMessage(chat, citizen, message, state, myIntention);
                                citizenState.subState === "putOnCounter";
                                citizenState.subStateStartTime = state.time;
                                setCitizenStatePutItemOnMarketCounter(citizen, data.market, false, intention.itemName!, amount, finalPrice, false, citizen.inventory);
                                return;
                            }
                        }
                    }
                    if (intention.intention === "tradeFullfiled") {
                        citizenStateStackTaskSuccess(citizen);
                        return;
                    }
                } else {
                    if (citizenState.subState === "waitingForRespone" && citizenState.subStateStartTime !== undefined) {
                        if (citizenState.subStateStartTime + 2000 < state.time) {
                            citizenState.subState = undefined;
                            citizenState.subStateStartTime = undefined;
                        }
                    } else if (citizenState.subState === "putOnCounter" && citizenState.subStateStartTime !== undefined) {
                    } else {
                        const intention: ChatMessageMarketTradeIntention = {
                            type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                            intention: "initialGreeting",
                        }
                        addChatMessage(chat, citizen, `Hello.`, state, intention);
                        citizenState.subState = "waitingForRespone";
                        citizenState.subStateStartTime = state.time;
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

function tickCitizenStateTradeItemWithMarket(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const citizenState = citizen.stateInfo.stack[0] as CitizenState;
        const data = citizen.stateInfo.stack[0].data as CitizenStateMarketTradeStart;
        if (data.market.deterioration >= 1) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (citizenState.subState === "startedTrade") {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (isCitizenInInteractionDistance(citizen, data.market.position)) {
            if (data.market.inhabitedBy && isCitizenAtPosition(data.market.inhabitedBy, data.market.position)) {
                if (data.market.inhabitedBy.stateInfo.stack.length > 0) {
                    const marketState: JobMarketState = data.market.inhabitedBy.stateInfo.stack[0].state as JobMarketState;
                    if (citizenState.subState !== "joinedQueue" && (marketHasQueue(data.market) || marketState !== "waitingForCustomers")) {
                        citizenState.subState = "joinedQueue";
                        addCitizenThought(citizen, `I have to join the queue.`, state);
                        setCitizenStateEnterMarketQueue(citizen, data.market);
                        return;
                    } else {
                        citizenState.subState = "startedTrade";
                        setCitizenStateMarketTradeInteraction(citizen, data.market, data.sellToMarket, data.itemName, data.itemAmount);
                        return;
                    }
                }
            }
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizen.moveTo = {
                x: data.market.position.x + 20,
                y: data.market.position.y + 17,
            }
        }
    }
}

