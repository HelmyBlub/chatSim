import { BuildingMarket, marketGetCounterPosition, marketGetQueueMapPosition, marketGetQueuePosition, marketHasQueue } from "../map/building.js";
import { createEmptyChat, ChatMessage, ChatMessageMarketTradeIntention, CHAT_MESSAGE_INTENTION_MARKET_TRADE, addChatMessage } from "../chatBubble.js";
import { ChatSimState } from "../chatSimModels.js";
import { TAG_DOING_NOTHING, TAG_QUEUING, TAG_SOCIAL_INTERACTION } from "../citizen.js";
import { citizenAddThought, Citizen, citizenCheckTodoList, CitizenState, citizenStateStackTaskSuccess, citizenStateStackTaskSuccessWithData, citizenMoveTo } from "../citizen.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { isCitizenAtPosition, isCitizenInInteractionDistance } from "../jobs/job.js";
import { JobMarketState, marketCanServeCustomer, marketServeCustomer, TRADE_DATA, TradeData } from "../jobs/jobMarket.js";
import { Inventory, InventoryItem, inventoryPutItemInto } from "../inventory.js";

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
export const CITIZEN_STATE_MARKET_TRADE_CUSTOMER_NEGOTIATION = "MarketTradeNegotiation";
export const CITIZEN_STATE_MARKET_ITEM_EXCHANGE = "MarketItemExchange";

export function onLoadCitizenStateDefaultTickMarketFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_TRADE_ITEM_WITH] = tickCitizenStateTradeItemWithMarket;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_ENTER_QUEUE] = tickCitizenStateEnterMarketQueue;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_TRADE_CUSTOMER_NEGOTIATION] = tickCitizenStateMarketTradeCustomerNegotiation;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_ITEM_EXCHANGE] = tickCitizenStateMarketItemExchange;
}

export function setCitizenStateTradeItemWithMarket(citizen: Citizen, market: BuildingMarket, sellToMarket: boolean, itemName: string, itemAmount: number) {
    const data: CitizenStateMarketTradeStart = { itemName: itemName, itemAmount: itemAmount, market: market, sellToMarket: sellToMarket };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_MARKET_TRADE_ITEM_WITH, data: data, tags: new Set() });
}

export function setCitizenStateEnterMarketQueue(citizen: Citizen, market: BuildingMarket) {
    const data: CitizenStateMarketQueue = { market: market };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_MARKET_ENTER_QUEUE, data: data, tags: new Set([TAG_DOING_NOTHING, TAG_QUEUING]) });
}

export function setCitizenStateMarketTradeCustomerNegotiation(citizen: Citizen, market: BuildingMarket, sellToMarket: boolean, itemName: string, itemAmount: number | undefined = undefined): boolean {
    const canServe = marketServeCustomer(market, citizen);
    if (!canServe) return false;
    const data: CitizenStateMarketTradeStart = { market: market, itemName: itemName, itemAmount: itemAmount, sellToMarket: sellToMarket };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_MARKET_TRADE_CUSTOMER_NEGOTIATION, data: data, tags: new Set([TAG_SOCIAL_INTERACTION]) });
    return true;
}

export function setCitizenStateMarketItemExchange(citizen: Citizen, market: BuildingMarket, seller: boolean, itemName: string, itemAmount: number, money: number, waiting: boolean, inventory: Inventory) {
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
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_MARKET_ITEM_EXCHANGE, data: data, tags: new Set([TAG_SOCIAL_INTERACTION]) });
}

function tickCitizenStateMarketItemExchange(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0] as CitizenState;
    const data = citizenState.data as CitizenStateMarketTradeData;
    if (citizenState.subState === undefined) {
        if (data.waiting) {
            citizenState.subState = "waitingForItemsOrMoneyOnCounter";
            citizenState.subStateStartTime = state.time;
        } else {
            citizenState.subState = "putItemForCounterInPaw";
            citizenState.subStateStartTime = state.time;
        }
    }
    if (citizenState.subState === "waitingForItemsOrMoneyOnCounter") {
        const counter = data.market.counter;
        if (data.seller) {
            const sellerData = data as CitizenStateMarketTradeSellerData;
            if (counter.money >= sellerData.expectedMoney) {
                citizenState.subState = "putItemForCounterInPaw";
                citizenState.subStateStartTime = state.time;
            }
        } else {
            const buyerData = data as CitizenStateMarketTradeBuyerData;
            const counterItem = counter.items.find(i => i.name === buyerData.expectedItemName && i.counter > 0);
            if (counterItem) {
                if (counterItem.counter < buyerData.expectedItemAmount) {
                    buyerData.money = buyerData.money / buyerData.expectedItemAmount * counterItem.counter;
                    buyerData.expectedItemAmount = counterItem.counter;
                }
                citizenState.subState = "putItemForCounterInPaw";
                citizenState.subStateStartTime = state.time;
            }
        }
        return;
    }
    if (citizenState.subState === "putItemForCounterInPaw") {
        citizenState.subState = "putOnCounter";
        citizenState.subStateStartTime = state.time;
        let item: InventoryItem | undefined = undefined;
        let money: number = 0;
        if (data.seller) {
            const sellerData = data as CitizenStateMarketTradeSellerData;
            const sellerInventoryItem = sellerData.inventory.items.find(i => i.name === sellerData.itemName);
            if (sellerInventoryItem && sellerInventoryItem.counter > 0) {
                const amount = Math.min(sellerInventoryItem.counter, sellerData.itemAmount);
                sellerInventoryItem.counter -= amount;
                sellerData.expectedMoney = sellerData.expectedMoney / sellerData.itemAmount * amount;
                item = { name: sellerData.itemName, counter: amount };
            } else {
                citizenStateStackTaskSuccess(citizen);
            }
        } else {
            const buyerData = data as CitizenStateMarketTradeBuyerData;
            if (citizen.money >= buyerData.money) {
                citizen.money -= buyerData.money;
                money = buyerData.money;
            }
        }
        citizen.tradePaw = {
            item: item,
            money: money,
            startTime: state.time,
            duration: 1000,
            moveFrom: { x: citizen.position.x, y: citizen.position.y },
            moveTo: marketGetCounterPosition(data.market),
        }
    }

    if (citizenState.subState === "putOnCounter") {
        if (citizen.tradePaw && citizen.tradePaw.startTime + citizen.tradePaw.duration <= state.time) {
            const market = data.market;
            if (citizen.tradePaw.item) {
                market.counter.items.push(citizen.tradePaw.item);
                citizen.tradePaw.item = undefined;
            }
            if (citizen.tradePaw.money > 0) {
                market.counter.money = citizen.tradePaw.money;
                citizen.tradePaw.money = 0;
            }
            citizen.tradePaw = undefined;
            citizenState.subState = "waitingToTake";
            citizenState.subStateStartTime = state.time;
        }
        return;
    }
    if (citizenState.subState === "waitingToTake") {
        const counter = data.market.counter;
        if (data.seller) {
            const sellerData = data as CitizenStateMarketTradeSellerData;
            if (counter.money >= sellerData.expectedMoney) {
                citizen.tradePaw = {
                    money: counter.money,
                    startTime: state.time,
                    duration: 1000,
                    moveFrom: marketGetCounterPosition(data.market),
                    moveTo: { x: citizen.position.x, y: citizen.position.y },
                }
                counter.money -= sellerData.expectedMoney;
                citizenState.subState = "takeFromCounter";
            }
        } else {
            const buyerData = data as CitizenStateMarketTradeBuyerData;
            const counterItemIndex = counter.items.findIndex(i => i.name === buyerData.expectedItemName && i.counter === buyerData.expectedItemAmount);
            if (counterItemIndex > -1) {
                const counterItem = counter.items.splice(counterItemIndex, 1)[0];
                citizen.tradePaw = {
                    money: 0,
                    item: counterItem,
                    startTime: state.time,
                    duration: 1000,
                    moveFrom: marketGetCounterPosition(data.market),
                    moveTo: { x: citizen.position.x, y: citizen.position.y },
                }
                citizenState.subState = "takeFromCounter";
            }
        }
        return;
    }

    if (citizenState.subState === "takeFromCounter") {
        if (citizen.tradePaw && citizen.tradePaw.startTime + citizen.tradePaw.duration <= state.time) {
            if (citizen.tradePaw.money > 0) {
                citizen.money += citizen.tradePaw.money;
                citizen.tradePaw.money = 0;
            }
            if (citizen.tradePaw.item) {
                inventoryPutItemInto(citizen.tradePaw.item.name, data.inventory, citizen.tradePaw.item.counter);
                citizen.tradePaw.item = undefined;
            }
            citizen.tradePaw = undefined;
            citizenStateStackTaskSuccess(citizen);
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
            if (citizenCheckTodoList(citizen, state, 5)) return;
            if (queuePosition === 0) {
                if (data.stepState === undefined) {
                    if (isCitizenAtPosition(citizen, mapPosition)) {
                        data.stepState = "waitingForMyTurn";
                    } else {
                        citizenMoveTo(citizen, mapPosition);
                    }
                } else {
                    if (marketCanServeCustomer(data.market, citizen)) {
                        if (data.stepState === "waitingForMyTurn") {
                            data.stepState = "movingUp";
                            const moveTo = {
                                x: data.market.position.x + 20,
                                y: data.market.position.y + 17,
                            }
                            citizenMoveTo(citizen, moveTo);
                        } else {
                            citizenStateStackTaskSuccess(citizen);
                            data.market.queue?.shift();
                            return;
                        }
                    }
                }
            } else {
                if (!isCitizenAtPosition(citizen, mapPosition)) {
                    citizenMoveTo(citizen, mapPosition);
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

function tickCitizenStateMarketTradeCustomerNegotiation(citizen: Citizen, state: ChatSimState) {
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
                        let itemAmount = data.itemAmount;
                        if (data.sellToMarket) {
                            const inventoryItem = citizen.inventory.items.find(i => i.name === data.itemName);
                            itemAmount = data.itemAmount !== undefined && inventoryItem !== undefined ? Math.min(data.itemAmount, inventoryItem.counter) : undefined;
                        }
                        const myIntention: ChatMessageMarketTradeIntention = {
                            type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                            intention: "tradeRequestData",
                            itemName: data.itemName,
                            itemAmount: itemAmount,
                            sellToMarket: data.sellToMarket,
                        }
                        addChatMessage(chat, citizen, `I want to ${myIntention.sellToMarket ? "sell" : "buy"} ${myIntention.itemAmount}x${myIntention.itemName}.`, state, myIntention);
                        citizenState.subState = "waitingForRespone";
                        citizenState.subStateStartTime = state.time;
                        return;
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
                                const tradeData: TradeData = {
                                    type: TRADE_DATA,
                                    itemAmount: amount,
                                    itemName: intention.itemName!,
                                    price: amount * intention.singlePrice,
                                    sellToMarket: true,
                                }
                                citizenStateStackTaskSuccessWithData(citizen, tradeData);
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
                                const tradeData: TradeData = {
                                    type: TRADE_DATA,
                                    itemAmount: amount,
                                    itemName: intention.itemName!,
                                    price: finalPrice,
                                    sellToMarket: false,
                                }
                                citizenStateStackTaskSuccessWithData(citizen, tradeData);
                                return;
                            }
                        }
                    }
                    if (intention.intention === "tradeFullfiled" || intention.intention === "tradeCancelled") {
                        citizenStateStackTaskSuccess(citizen);
                        return;
                    }
                } else {
                    if (citizenState.subState === "waitingForRespone" && citizenState.subStateStartTime !== undefined) {
                        if (citizenState.subStateStartTime + 2000 < state.time) {
                            citizenState.subState = undefined;
                            citizenState.subStateStartTime = undefined;
                        }
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
            citizenMoveTo(citizen, data.market.position);
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
        if (citizenState.subState === "itemExchange") {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (isCitizenInInteractionDistance(citizen, data.market.position)) {
            if (data.market.inhabitedBy && isCitizenAtPosition(data.market.inhabitedBy, data.market.position)) {
                if (data.market.inhabitedBy.stateInfo.stack.length > 0) {
                    const marketState: JobMarketState = data.market.inhabitedBy.stateInfo.stack[0].state as JobMarketState;
                    if (citizenState.subState === "startedTrade") {
                        if (citizenState.returnedData && citizenState.returnedData.type === TRADE_DATA) {
                            const tradeData = citizenState.returnedData as TradeData;
                            setCitizenStateMarketItemExchange(citizen, data.market, tradeData.sellToMarket, tradeData.itemName, tradeData.itemAmount, tradeData.price, false, citizen.inventory);
                            citizenState.subState = "itemExchange";
                            return;
                        } else {
                            citizenStateStackTaskSuccess(citizen);
                            return;
                        }
                    }
                    if (citizenState.subState === undefined && (marketHasQueue(data.market) || marketState !== "waitingForCustomers")) {
                        citizenState.subState = "joinedQueue";
                        citizenAddThought(citizen, `I have to join the queue.`, state);
                        setCitizenStateEnterMarketQueue(citizen, data.market);
                        return;
                    } else {
                        citizenState.subState = "startedTrade";
                        setCitizenStateMarketTradeCustomerNegotiation(citizen, data.market, data.sellToMarket, data.itemName, data.itemAmount);
                        return;
                    }
                }
            }
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            const moveTo = {
                x: data.market.position.x + 20,
                y: data.market.position.y + 17,
            }
            citizenMoveTo(citizen, moveTo);
        }
    }
}

