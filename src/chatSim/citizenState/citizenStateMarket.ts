import { BuildingMarket, marketGetQueueMapPosition, marketGetQueuePosition } from "../building.js";
import { createEmptyChat, ChatMessage, ChatMessageMarketTradeIntention, CHAT_MESSAGE_INTENTION_MARKET_TRADE, addChatMessage } from "../chatBubble.js";
import { ChatSimState } from "../chatSimModels.js";
import { addCitizenThought, Citizen, citizenStateStackTaskSuccess } from "../citizen.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { CitizenStateItemAndBuildingData, CitizenStateMarketQueue } from "./citizenStateGetItem.js";
import { isCitizenAtPosition, isCitizenInInteractionDistance } from "../jobs/job.js";
import { JobMarketState, marketCanServeCustomer, marketServeCustomer } from "../jobs/jobMarket.js";

export const CITIZEN_STATE_BUY_ITEM_FROM_MARKET = "BuyItemFromMarket";
export const CITIZEN_STATE_ENTER_MARKET_QUEUE = "EnterMarketQueue";
export const CITIZEN_STATE_MARKET_TRADE_INTERACTION = "MarketTradeInteraction";


export function onLoadCitizenStateDefaultTickMarketFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_BUY_ITEM_FROM_MARKET] = tickCitizenStateBuyItemFromMarket;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_ENTER_MARKET_QUEUE] = tickCitizenStateEnterMarketQueue;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_MARKET_TRADE_INTERACTION] = tickCitizenStateMarketTradeInteraction;
}

export function setCitizenStateBuyItemFromMarket(citizen: Citizen, market: BuildingMarket, itemName: string, itemAmount: number) {
    const data: CitizenStateItemAndBuildingData = { itemName: itemName, itemAmount: itemAmount, building: market };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_BUY_ITEM_FROM_MARKET, data: data });
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
                if (!isCitizenAtPosition(citizen, mapPosition)) {
                    citizen.moveTo = mapPosition;
                } else {
                    const customerAhead = citizenStateMarket.market.queue![queuePosition - 1];
                    const shouldBePosition = marketGetQueueMapPosition(customerAhead, citizenStateMarket.market);
                    if (!isCitizenInInteractionDistance(customerAhead, shouldBePosition)) {
                        citizenStateMarket.market.queue!.splice(queuePosition - 1, 1);
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
