import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CITIZEN_STATE_TYPE_WORKING_JOB } from "../citizen.js";
import { sellItem, sellItemWithInventories } from "./job.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { addChatMessage, createEmptyChat } from "../chatBubble.js";
import { buyItemFromMarket, CitizenJobMarket, createJobMarket, paintInventoryOnMarket, tickMarket } from "./jobMarket.js";

export type CitizenJobFoodMarket = CitizenJobMarket & {
}

export const CITIZEN_JOB_FOOD_MARKET = "Food Market";

export function loadCitizenJobFoodMarket(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_MARKET] = {
        create: create,
        paintInventoryOnMarket: paintInventoryOnMarket,
        tick: tick,
    };
}

export function sellFoodToFoodMarket(foodMarket: Citizen, seller: Citizen, requestedAmount: number, state: ChatSimState) {
    if (foodMarket.job.name !== CITIZEN_JOB_FOOD_MARKET) return false;
    const job = foodMarket.job as CitizenJobFoodMarket;
    const sellPrice = 1;
    if (job.marketBuilding) {
        const amount = sellItemWithInventories(seller, foodMarket, INVENTORY_MUSHROOM, sellPrice, seller.inventory, job.marketBuilding.inventory, state, requestedAmount);
        if (amount !== undefined && amount > 0) {
            const chat = createEmptyChat();
            addChatMessage(chat, seller, `I want to sell ${requestedAmount}x${INVENTORY_MUSHROOM}`, state);
            addChatMessage(chat, foodMarket, `I would buy ${amount}x${INVENTORY_MUSHROOM} for $${sellPrice * amount}`, state);
            addChatMessage(chat, seller, `Yes please!`, state);
            foodMarket.lastChat = chat;
        }
    } else {
        sellItem(seller, foodMarket, INVENTORY_MUSHROOM, sellPrice, state, requestedAmount);
    }
}

function create(state: ChatSimState): CitizenJobFoodMarket {
    return createJobMarket(state, CITIZEN_JOB_FOOD_MARKET, [INVENTORY_MUSHROOM]);
}

function tick(citizen: Citizen, job: CitizenJobFoodMarket, state: ChatSimState) {
    if (citizen.stateInfo.type !== CITIZEN_STATE_TYPE_WORKING_JOB) {
        citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB, stack: [] };
    }
    tickMarket(citizen, job, state);
}
