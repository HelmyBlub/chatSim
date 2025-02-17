import { ChatSimState } from "../chatSimModels.js";
import { TAG_DOING_NOTHING, TAG_SOCIAL_INTERACTION } from "../map/citizen.js";
import { buildingGetFirstBrokenStateDeterioration, BuildingMarket } from "../map/mapObjectBuilding.js";
import { citizenAddThought, Citizen, citizenCheckTodoList, CitizenState, citizenStateStackTaskSuccess, citizenStateStackTaskSuccessWithData, CitizenStateSuccessData, citizenIsThinking, citizenSetThought, citizenMoveTo } from "../map/citizen.js"
import { INVENTORY_MUSHROOM, INVENTORY_WOOD, inventoryGetMissingReserved, inventoryGetPossibleTakeOutAmount, inventoryMoveItemBetween } from "../inventory.js";
import { DIRECTION_DOWN, getDay, nextRandom } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { citizenChangeJob, CitizenJob, findMarketBuilding, isCitizenAtPosition } from "./job.js"
import { isCitizenInInteractionDistance } from "../map/citizen.js";
import { BUILDING_DATA, CITIZEN_JOB_BUILDING_CONSTRUCTION } from "./jobBuildingContruction.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";
import { addChatMessage, CHAT_MESSAGE_INTENTION_MARKET_TRADE, ChatMessage, ChatMessageMarketTradeIntention } from "../chatBubble.js";
import { setCitizenStateGetBuilding, setCitizenStateRepairBuilding } from "../citizenState/citizenStateGetBuilding.js";
import { setCitizenStateGetItemFromBuilding, setCitizenStateSearchItem } from "../citizenState/citizenStateGetItem.js";
import { setCitizenStateMarketItemExchange } from "../citizenState/citizenStateMarket.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";

export type CitizenJobMarket = CitizenJob & {
    currentCustomer?: Citizen,
    sellItemNames: string[],
    customerCounter: number[],
    currentDayCounter: number,
    maxCounterDays: number,
}

export type JobMarketState = "checkInventory" | "waitingForCustomers" | "getMarketBuilding" | "servingCustomer" | "negotiationWithCustomer" | "tradingWithCustomer";

export type TradeData = CitizenStateSuccessData & {
    itemName: string,
    itemAmount: number,
    price: number,
    sellToMarket: boolean,
}

type JobMarketStateInfo = CitizenState & {
    state: JobMarketState,
}

export const TRADE_DATA = "tradeData";

const STRING_TO_STATE_MAPPING: { [key: string]: (citizen: Citizen, job: CitizenJob, state: ChatSimState) => void } = {
    "checkInventory": stateCheckInventory,
    "waitingForCustomers": stateWaitingForCustomers,
    "getMarketBuilding": stateGetMarketBuilding,
    "servingCustomer": stateServingCustomer,
    "negotiationWithCustomer": stateNegotiationWithCustomer,
    "tradingWithCustomer": stateTradingWithCustomer,
};

export function marketServeCustomer(market: BuildingMarket, customer: Citizen): boolean {
    if (!market.inhabitedBy) return false;
    const canServe = marketCanServeCustomer(market, customer);
    if (!canServe) return false;
    const servingState: JobMarketState = "servingCustomer";
    market.inhabitedBy.stateInfo.stack.unshift({ state: servingState, tags: new Set([TAG_SOCIAL_INTERACTION]) });
    const jobMarket = market.inhabitedBy.job as CitizenJobMarket;
    jobMarket.currentCustomer = customer;
    jobMarket.customerCounter[0]++;
    return true;
}

export function marketCanServeCustomer(market: BuildingMarket, customer: Citizen): boolean {
    if (!market.inhabitedBy) return false;
    if (market.inhabitedBy.stateInfo.stack.length === 0) return false;
    const marketState: JobMarketState = market.inhabitedBy.stateInfo.stack[0].state as JobMarketState;
    if (marketState !== "waitingForCustomers") return false;
    return true;

}

export function createJobMarket(state: ChatSimState, jobname: string, sellItemNames: string[]): CitizenJobMarket {
    return {
        name: jobname,
        sellItemNames: sellItemNames,
        customerCounter: [0],
        currentDayCounter: getDay(state),
        maxCounterDays: 3,
    }
}

export function tickMarket(citizen: Citizen, job: CitizenJobMarket, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (!job.marketBuilding || job.marketBuilding.deterioration >= 1) {
            const state: JobMarketState = "getMarketBuilding";
            citizen.stateInfo.stack.unshift({ state: state, tags: new Set() });
        } else {
            const day = getDay(state);
            if (job.currentDayCounter !== day) {
                if (job.customerCounter.length >= job.maxCounterDays) {
                    job.customerCounter.pop();
                    if (citizen.dreamJob !== job.name) {
                        const totalCustomerCount = job.customerCounter.reduce((p, c) => p += c);
                        if (totalCustomerCount === 0) {
                            const reason = [`I had no customers for ${job.maxCounterDays} days.`, `I change job.`];
                            let newJob: string;
                            if (citizen.dreamJob !== undefined) {
                                newJob = citizen.dreamJob;
                            } else {
                                newJob = nextRandom(state.randomSeed) > 0.5 ? CITIZEN_JOB_LUMBERJACK : CITIZEN_JOB_BUILDING_CONSTRUCTION;
                            }
                            citizenChangeJob(citizen, newJob, state, reason);
                            return;
                        }
                    }
                }
                job.currentDayCounter = day;
                job.customerCounter.unshift(0);
            }
            citizenSetThought(citizen, ["Go to my market and check inventory."], state);
            citizen.stateInfo.stack.unshift({ state: "checkInventory", tags: new Set() });
            citizenMoveTo(citizen, job.marketBuilding.position);
        }
    } else {
        const stateInfo = citizen.stateInfo.stack[0] as JobMarketStateInfo;
        const stateFunction = STRING_TO_STATE_MAPPING[stateInfo.state];
        if (stateFunction) {
            stateFunction(citizen, job, state);
        } else {
            CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[stateInfo.state](citizen, state);
        }
    }
}

function stateGetMarketBuilding(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const stateInfo = citizen.stateInfo.stack[0] as JobMarketStateInfo;
    const market = findMarketBuilding(citizen, state);
    if (market) {
        market.inhabitedBy = citizen;
        job.marketBuilding = market;
        stateInfo.state = "checkInventory";
        citizenSetThought(citizen, ["Go to my market and check inventory."], state);
        citizenMoveTo(citizen, job.marketBuilding.position);
    } else {
        citizenSetThought(citizen, ["I do not have a market building. I need to get one."], state);
        setCitizenStateGetBuilding(citizen, "Market");
    }
}

function stateServingCustomer(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const jobMarket = job as CitizenJobMarket;
    if (!jobMarket.currentCustomer || !jobMarket.marketBuilding) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (!isCitizenInInteractionDistance(jobMarket.currentCustomer, citizen.position)) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    const stateInfo = citizen.stateInfo.stack[0] as JobMarketStateInfo;
    if (stateInfo.returnedData === undefined) {
        if (stateInfo.subState === "startedTrade") {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        const state: JobMarketState = "negotiationWithCustomer";
        citizen.stateInfo.stack.unshift({ state: state, tags: new Set([TAG_SOCIAL_INTERACTION]) });
        return;
    } else {
        if (stateInfo.returnedData.type === TRADE_DATA) {
            stateInfo.subState = "startedTrade";
            const tradeData: TradeData = stateInfo.returnedData as TradeData;
            const state: JobMarketState = "tradingWithCustomer";
            citizen.stateInfo.stack.unshift({ state: state, data: tradeData, tags: new Set([TAG_SOCIAL_INTERACTION]) });
            return;
        }
    }
}

function stateTradingWithCustomer(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const jobMarket = job as CitizenJobMarket;
    if (!jobMarket.currentCustomer || !jobMarket.marketBuilding) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (!isCitizenInInteractionDistance(jobMarket.currentCustomer, citizen.position)) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    const stateInfo = citizen.stateInfo.stack[0] as JobMarketStateInfo;
    const data = stateInfo.data as TradeData;

    if (stateInfo.subState === undefined) {
        if (data.sellToMarket) {
            setCitizenStateMarketItemExchange(citizen, jobMarket.marketBuilding, false, data.itemName, data.itemAmount, data.price, true, jobMarket.marketBuilding.inventory);
            stateInfo.subState = "trading";
            return;
        } else {
            setCitizenStateMarketItemExchange(citizen, jobMarket.marketBuilding, true, data.itemName, data.itemAmount, data.price, true, jobMarket.marketBuilding.inventory);
            stateInfo.subState = "trading";
            return;
        }
    }

    if (stateInfo.subState === "trading") {
        const intention: ChatMessageMarketTradeIntention = {
            type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
            intention: "tradeFullfiled",
        }
        addChatMessage(citizen.lastChat!, citizen, `Thanks for shopping!`, state, intention);
        citizenStateStackTaskSuccess(citizen);
    }
}

function stateNegotiationWithCustomer(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const jobMarket = job as CitizenJobMarket;
    if (!jobMarket.currentCustomer || !jobMarket.marketBuilding) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (!isCitizenInInteractionDistance(jobMarket.currentCustomer, citizen.position)) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (!citizen.lastChat) return;
    let customerMessage: ChatMessage | undefined;
    for (let i = citizen.lastChat.messages.length - 1; i >= 0; i--) {
        const message = citizen.lastChat.messages[i];
        if (message.by === citizen) {
            return;
        }
        if (message.by === jobMarket.currentCustomer) {
            customerMessage = message;
            break;
        }
    }

    if (customerMessage && customerMessage.intention && customerMessage.intention.type === CHAT_MESSAGE_INTENTION_MARKET_TRADE) {
        if (customerMessage.time + 1000 > state.time) return;
        const customerIntention = customerMessage.intention as ChatMessageMarketTradeIntention;
        if (customerIntention.intention === "initialGreeting") {
            const intention: ChatMessageMarketTradeIntention = {
                type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                intention: "whatDoYouWant",
            }
            addChatMessage(citizen.lastChat, citizen, `Hello. How can i help you?`, state, intention);
        }
        if (customerIntention.intention === "tradeRequestData") {
            if (!customerIntention.sellToMarket) {
                const inventoryItem = jobMarket.marketBuilding.inventory.items.find(i => i.name === customerIntention.itemName);
                if (inventoryItem && inventoryItem.counter > 0) {
                    let amount = customerIntention.itemAmount;
                    if (amount === undefined || amount > inventoryItem.counter) {
                        amount = inventoryItem.counter;
                    }
                    const itemPrice = 2;
                    const intention: ChatMessageMarketTradeIntention = {
                        type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                        intention: "priceResponse",
                        singlePrice: itemPrice,
                        itemName: customerIntention.itemName,
                        itemAmount: amount,
                    }
                    addChatMessage(citizen.lastChat, citizen, `I can sell you ${amount}x${intention.itemName} for $${amount * itemPrice}.`, state, intention);
                } else {
                    const intention: ChatMessageMarketTradeIntention = {
                        type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                        intention: "tradeCancelled",
                    }
                    addChatMessage(citizen.lastChat, citizen, `I do not have stock left for ${customerIntention.itemName}.`, state, intention);
                }
            } else {
                let amount = customerIntention.itemAmount;
                const itemPrice = 1;
                const moneyMaxAmount = Math.floor(citizen.money / itemPrice);
                if (moneyMaxAmount === 0) {
                    const intention: ChatMessageMarketTradeIntention = {
                        type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                        intention: "tradeCancelled",
                    }
                    addChatMessage(citizen.lastChat, citizen, `I do not have money left to buy ${customerIntention.itemName}.`, state, intention);
                    return;
                }
                if (!amount || amount > moneyMaxAmount) {
                    amount = moneyMaxAmount;
                }
                const intention: ChatMessageMarketTradeIntention = {
                    type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                    intention: "priceResponse",
                    singlePrice: itemPrice,
                    itemName: customerIntention.itemName,
                    itemAmount: amount,
                    sellToMarket: customerIntention.sellToMarket,
                }
                addChatMessage(citizen.lastChat, citizen, `I can buy ${amount}x${intention.itemName} for $${amount * itemPrice}.`, state, intention);
            }
        }
        if (customerIntention.intention === "accept") {
            const data: TradeData = {
                type: TRADE_DATA,
                itemName: customerIntention.itemName!,
                itemAmount: customerIntention.itemAmount!,
                price: customerIntention.singlePrice! * customerIntention.itemAmount!,
                sellToMarket: customerIntention.sellToMarket === true,
            }
            citizenStateStackTaskSuccessWithData(citizen, data);
        }
    }
}

function stateWaitingForCustomers(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    citizen.paintData.paintBehindBuildings = true;
    if (citizenCheckTodoList(citizen, state)) return;
}

function stateCheckInventory(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    if (citizen.moveTo === undefined && !citizenIsThinking(citizen, state)) {
        const jobMarket = job as CitizenJobMarket;
        const stateInfo = citizen.stateInfo.stack[0] as JobMarketStateInfo;

        if (!job.marketBuilding) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (job.marketBuilding.deletedFromMap) {
            job.marketBuilding = undefined;
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (citizenCheckTodoList(citizen, state)) return;
        if (isCitizenAtPosition(citizen, job.marketBuilding.position)) {
            const market = job.marketBuilding as BuildingMarket;
            setupReserved(market, jobMarket);
            if (jobMarket.sellItemNames.length > 0) {
                market.displayedItem = jobMarket.sellItemNames[0];
            }
            if (market.deterioration > buildingGetFirstBrokenStateDeterioration("Market")) {
                if (market.deterioration > 1) {
                    citizenAddThought(citizen, `My market broke down. I need to repair`, state);
                } else {
                    citizenAddThought(citizen, `I need to repair my market.`, state);
                }
                setCitizenStateRepairBuilding(citizen, market);
                return;
            }
            for (let itemName of jobMarket.sellItemNames) {
                let availableSpace = inventoryGetMissingReserved(job.marketBuilding.inventory, itemName);
                if (availableSpace > 0) {
                    const citizenInventory = citizen.inventory.items.find(i => i.name === itemName);
                    if (citizenInventory && citizenInventory.counter > 0) {
                        availableSpace -= inventoryMoveItemBetween(itemName, citizen.inventory, job.marketBuilding.inventory);
                    }
                    if (citizen.home && availableSpace > 5) {
                        const availableAtHome = inventoryGetPossibleTakeOutAmount(itemName, citizen.home.inventory, false, citizen.memory.home.rememberedItems);
                        if (availableAtHome > 5) {
                            citizenSetThought(citizen, [`I want to add inventory to my market from home.`], state);
                            setCitizenStateGetItemFromBuilding(citizen, citizen.home, itemName, availableAtHome);
                            return;
                        } else if (itemName === INVENTORY_WOOD) {
                            citizenSetThought(citizen, [`I am low on ${itemName} in my market. I gather some myself.`], state);
                            setCitizenStateSearchItem(citizen, INVENTORY_WOOD, undefined, true);
                            return;
                        } else if (itemName === INVENTORY_MUSHROOM) {
                            citizenSetThought(citizen, [`I am low on ${itemName} in my market. I gather some myself.`], state);
                            setCitizenStateSearchItem(citizen, INVENTORY_MUSHROOM, undefined, true);
                            return;
                        }
                    }
                }
            }
            stateInfo.state = "waitingForCustomers";
            citizen.direction = DIRECTION_DOWN;
            stateInfo.tags.clear();
            stateInfo.tags.add(TAG_DOING_NOTHING);
            citizen.displayedEquipments = [];
            citizen.paintData.paintBehindBuildings = true;
        } else {
            citizenMoveTo(citizen, job.marketBuilding.position);
        }
    }
}

function setupReserved(building: BuildingMarket, job: CitizenJobMarket) {
    building.inventory.reservedSpace = [];
    const reservePerItem = Math.min(Math.floor((building.inventory.size - 10) / job.sellItemNames.length), 20);
    for (let itemName of job.sellItemNames) {
        building.inventory.reservedSpace.push({ counter: reservePerItem, name: itemName });
    }
}