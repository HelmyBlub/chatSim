import { ChatSimState } from "../chatSimModels.js";
import { BuildingMarket } from "../building.js";
import { addCitizenThought, Citizen, CitizenStateInfo, citizenStateStackTaskSuccess, isCitizenThinking, setCitizenThought } from "../citizen.js"
import { inventoryGetMissingReserved, inventoryGetPossibleTakeOutAmount, inventoryMoveItemBetween } from "../inventory.js";
import { getDay, nextRandom } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { buyItemWithInventories, citizenChangeJob, CitizenJob, findMarketBuilding, isCitizenAtPosition, isCitizenInInteractionDistance, sellItemWithInventories } from "./job.js"
import { BUILDING_DATA, CITIZEN_JOB_BUILDING_CONSTRUCTION } from "./jobBuildingContruction.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";
import { addChatMessage, CHAT_MESSAGE_INTENTION_MARKET_TRADE, ChatMessage, ChatMessageMarketTradeIntention } from "../chatBubble.js";
import { setCitizenStateGetBuilding, setCitizenStateRepairBuilding } from "../citizenState/citizenStateGetBuilding.js";
import { setCitizenStateGetItemFromBuilding } from "../citizenState/citizenStateGetItem.js";

export type CitizenJobMarket = CitizenJob & {
    currentCustomer?: Citizen,
    sellItemNames: string[],
    customerCounter: number[],
    currentDayCounter: number,
    maxCounterDays: number,
}

export type JobMarketState = "checkInventory" | "waitingForCustomers" | "getMarketBuilding" | "servingCustomer";

type JobMarketStateInfo = CitizenStateInfo & {
    state: JobMarketState,
}

const STRING_TO_STATE_MAPPING: { [key: string]: (citizen: Citizen, job: CitizenJob, state: ChatSimState) => void } = {
    "checkInventory": stateCheckInventory,
    "waitingForCustomers": stateWaitingForCustomers,
    "getMarketBuilding": stateGetMarketBuilding,
    "servingCustomer": stateServingCustomer,
};

export function marketServeCustomer(market: BuildingMarket, customer: Citizen): boolean {
    if (!market.inhabitedBy) return false;
    const canServe = marketCanServeCustomer(market, customer);
    if (!canServe) return false;
    const servingState: JobMarketState = "servingCustomer";
    market.inhabitedBy.stateInfo.stack.unshift({ state: servingState });
    const jobMarket = market.inhabitedBy.job as CitizenJobMarket;
    jobMarket.currentCustomer = customer;
    return true;
}

export function marketCanServeCustomer(market: BuildingMarket, customer: Citizen): boolean {
    if (!market.inhabitedBy) return false;
    if (market.inhabitedBy.stateInfo.stack.length === 0) return false;
    const marketState: JobMarketState = market.inhabitedBy.stateInfo.stack[0].state as JobMarketState;
    if (marketState !== "waitingForCustomers") return false;
    return true;

}

export function sellItemToMarket(market: BuildingMarket, seller: Citizen, itemName: string, state: ChatSimState, requestedAmount: number | undefined = undefined): number | undefined {
    if (!market.inhabitedBy) return;
    const jobMarket = market.inhabitedBy.job as CitizenJobMarket;
    jobMarket.customerCounter[0]++;
    return sellItemWithInventories(seller, market.inhabitedBy, itemName, 1, seller.inventory, market.inventory, state, requestedAmount);
}

export function buyItemFromMarket(market: BuildingMarket, buyer: Citizen, itemName: string, state: ChatSimState, requestedAmount: number | undefined = undefined): number | undefined {
    if (!market.inhabitedBy) return;
    const jobMarket = market.inhabitedBy.job as CitizenJobMarket;
    jobMarket.customerCounter[0]++;
    return buyItemWithInventories(market.inhabitedBy, buyer, itemName, 2, market.inventory, buyer.inventory, state, requestedAmount);
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
            citizen.stateInfo.stack.unshift({ state: "getMarketBuilding" });
        } else {
            const day = getDay(state);
            if (job.currentDayCounter !== day) {
                if (job.customerCounter.length >= job.maxCounterDays) {
                    job.customerCounter.pop();
                    const totalCustomerCount = job.customerCounter.reduce((p, c) => p += c);
                    if (totalCustomerCount === 0) {
                        const reason = [`I had no customers for ${job.maxCounterDays} days.`, `I change job.`];
                        const newJob: string = nextRandom(state.randomSeed) > 0.5 ? CITIZEN_JOB_LUMBERJACK : CITIZEN_JOB_BUILDING_CONSTRUCTION;
                        citizenChangeJob(citizen, newJob, state, reason);
                        return;
                    }
                }
                job.currentDayCounter = day;
                job.customerCounter.unshift(0);
            }
            setCitizenThought(citizen, ["Go to my market and check inventory."], state);
            citizen.stateInfo.stack.unshift({ state: "checkInventory" });
            citizen.moveTo = {
                x: job.marketBuilding.position.x,
                y: job.marketBuilding.position.y,
            }
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
        setCitizenThought(citizen, ["Go to my market and check inventory."], state);
        citizen.moveTo = {
            x: job.marketBuilding.position.x,
            y: job.marketBuilding.position.y,
        }
    } else {
        setCitizenThought(citizen, ["I do not have a market building. I need to get one."], state);
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
            const intention: ChatMessageMarketTradeIntention = {
                type: CHAT_MESSAGE_INTENTION_MARKET_TRADE,
                intention: "tradeFullfiled",
            }
            if (customerIntention.sellToMarket) {
                sellItemToMarket(jobMarket.marketBuilding, jobMarket.currentCustomer, customerIntention.itemName!, state, customerIntention.itemAmount);
            } else {
                buyItemFromMarket(jobMarket.marketBuilding, jobMarket.currentCustomer, customerIntention.itemName!, state, customerIntention.itemAmount);
            }
            addChatMessage(citizen.lastChat, citizen, `Thanks for shopping!`, state, intention);
        }
    }
}

function stateWaitingForCustomers(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    citizen.paintBehindBuildings = true;
}

function stateCheckInventory(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
        const jobMarket = job as CitizenJobMarket;
        const stateInfo = citizen.stateInfo.stack[0] as JobMarketStateInfo;
        if (!job.marketBuilding) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (isCitizenAtPosition(citizen, job.marketBuilding.position)) {
            setupReserved(job.marketBuilding as BuildingMarket, jobMarket);
            const market = job.marketBuilding as BuildingMarket;
            if (market.displayedItem === undefined && jobMarket.sellItemNames.length > 0) {
                market.displayedItem = jobMarket.sellItemNames[0];
            }
            if (market.deterioration > 1 / BUILDING_DATA[market.type].woodAmount) {
                if (market.deterioration > 1) {
                    addCitizenThought(citizen, `My market broke down. I need to repair`, state);
                    setCitizenStateRepairBuilding(citizen, market);
                    return;
                } else {
                    addCitizenThought(citizen, `I need to repair my market.`, state);
                    setCitizenStateRepairBuilding(citizen, market);
                    return;
                }
            }
            for (let itemName of jobMarket.sellItemNames) {
                let availableSpace = inventoryGetMissingReserved(job.marketBuilding.inventory, itemName);
                if (availableSpace > 0) {
                    const citizenInventory = citizen.inventory.items.find(i => i.name === itemName);
                    if (citizenInventory && citizenInventory.counter > 0) {
                        availableSpace -= inventoryMoveItemBetween(itemName, citizen.inventory, job.marketBuilding.inventory);
                    }
                    if (citizen.home && availableSpace > 5) {
                        const availableAtHome = inventoryGetPossibleTakeOutAmount(itemName, citizen.home.inventory);
                        if (availableAtHome > 5) {
                            setCitizenThought(citizen, [`I want to add inventory to my market from home.`], state);
                            setCitizenStateGetItemFromBuilding(citizen, citizen.home, itemName, availableAtHome);
                            return;
                        }
                    }
                }
            }
            stateInfo.state = "waitingForCustomers";
            citizen.displayedTool = undefined;
            citizen.paintBehindBuildings = true;
        } else {
            citizen.moveTo = {
                x: job.marketBuilding.position.x,
                y: job.marketBuilding.position.y,
            }
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