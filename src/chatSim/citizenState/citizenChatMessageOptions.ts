import { ChatSimState } from "../chatSimModels.js";
import { Citizen } from "../map/citizen.js";
import { citizenHappinessToString } from "../citizenNeeds/citizenNeedHappiness.js";
import { citizenIsSleeping } from "../citizenNeeds/citizenNeedSleep.js";
import { INVENTORY_MUSHROOM, inventoryMoveItemBetween, inventoryPutItemInto } from "../inventory.js";
import { nextRandom } from "../main.js";
import { ChatMessageChatIntention, citizenMemoryKnowByName, citizenRememberName, CitizenStateChatData } from "./citizenStateChat.js";
import { setCitizenStateTrade } from "./citizenStateTradeItem.js";

type IntentionFunction = (citizen: Citizen, messageToCitizen: Citizen, phase: ChatIntentionPhase, state: ChatSimState) => ChatMessageOption | undefined;
type ChatMessageOption = {
    message?: string[],
    condition?: (citizen: Citizen, messageToCitizen: Citizen) => boolean,
    intention?: string,
    execute?: (citizen: Citizen, messageToCitizen: Citizen, state: ChatSimState) => void,
}
type ChatIntentionPhase = "initMessage" | "replyMessage" | "followUpIntention";

export const INTENTION_GREETING = "greeting";
export const INTENTION_INTRODUCTION = "introduction";
export const INTENTION_HOW_ARE_YOU = "how are you";
export const INTENTION_REPLY = "reply";
export const INTENTION_IGNORE = "ignore";
export const INTENTION_STOP_BOTHERING = "stop bothering";
export const INTENTION_BYE_BYE = "bye bye";
export const INTENTION_THANK_YOU = "thank you";
export const INTENTION_STARVING_ASK_FOR_FOOD = "starving ask for food";
const FUNCTIONS_INTENTIONS: { [key: string]: IntentionFunction } = {};
FUNCTIONS_INTENTIONS[INTENTION_GREETING] = createChatGreeting;
FUNCTIONS_INTENTIONS[INTENTION_INTRODUCTION] = createChatIntroduction;
FUNCTIONS_INTENTIONS[INTENTION_HOW_ARE_YOU] = createChatHowAreYou;
FUNCTIONS_INTENTIONS[INTENTION_BYE_BYE] = createChatByeBye;
FUNCTIONS_INTENTIONS[INTENTION_STARVING_ASK_FOR_FOOD] = createChatStarvingAskForFood;
FUNCTIONS_INTENTIONS[INTENTION_THANK_YOU] = createChatThankYou;


export function getMessageForIntentionAndPhase(citizen: Citizen, messageToCitizen: Citizen, intention: string, phase: ChatIntentionPhase, state: ChatSimState) {
    const intentionFunction = FUNCTIONS_INTENTIONS[intention]
    if (!intentionFunction) return;
    const messageOption = intentionFunction(citizen, messageToCitizen, phase, state);
    if (!messageOption) return;
    let message = undefined;
    if (messageOption.message) {
        message = messageOption.message[0];
        if (messageOption.message.length > 1) {
            const randomIndex = Math.floor(nextRandom(state.randomSeed) * messageOption.message.length);
            message = messageOption.message[randomIndex];
        }
    }
    let returnIntention = undefined;
    if (messageOption.intention) {
        returnIntention = messageOption.intention;
    } else if (phase === "initMessage") {
        returnIntention = intention;
    }
    return { message: message, intention: returnIntention, execute: messageOption.execute };
}

function selectOption(citizen: Citizen, messageToCitizen: Citizen, list: ChatMessageOption[]): ChatMessageOption | undefined {
    for (let option of list) {
        if (!option.condition || option.condition(citizen, messageToCitizen)) {
            return option;
        }
    }
}

function createChatStarvingAskForFood(citizen: Citizen, messageToCitizen: Citizen, phase: ChatIntentionPhase, state: ChatSimState): ChatMessageOption | undefined {
    switch (phase) {
        case "initMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: ["Hi, i am starving, do you have some food to spare?"] },
            ]);
        case "replyMessage":
            return selectOption(
                citizen, messageToCitizen, [
                {
                    message: [`Sure!`],
                    condition: (citizen: Citizen) => {
                        if (citizen.happinessData.happiness < 0) return false;
                        const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                        if (!inventoryMushroom) return false;
                        if (inventoryMushroom.counter < 3) return false;
                        return true;
                    },
                    intention: INTENTION_REPLY,
                    execute: (citizen: Citizen, messageToCitizen: Citizen, state: ChatSimState) => {
                        setCitizenStateTrade(citizen, messageToCitizen, INVENTORY_MUSHROOM, 1);
                    }
                },
                { intention: INTENTION_IGNORE },
            ]);
        case "followUpIntention":
            return selectOption(
                citizen, messageToCitizen, [
                { intention: INTENTION_THANK_YOU },
            ]);
    }
}

function createChatGreeting(citizen: Citizen, messageToCitizen: Citizen, phase: ChatIntentionPhase, state: ChatSimState): ChatMessageOption | undefined {
    switch (phase) {
        case "initMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: [`Hello ${messageToCitizen.name}!`], condition: citizenMemoryKnowByName },
                { message: ["Hello!", "Hi!", "Greetings!"] },
            ]);
        case "replyMessage":
            return selectOption(
                citizen, messageToCitizen, [
                {
                    message: [`Let me sleep! Idiot!`],
                    condition: (citizen: Citizen) => citizenIsSleeping(citizen) && citizen.happinessData.happiness < 0,
                    intention: INTENTION_STOP_BOTHERING
                },
                { condition: citizenIsSleeping, intention: INTENTION_IGNORE },
                { message: ["Hello?", "Yes?", "Whay do you want?"], intention: INTENTION_REPLY },
            ]);
        case "followUpIntention":
            return selectOption(
                citizen, messageToCitizen, [
                { intention: INTENTION_HOW_ARE_YOU, condition: citizenMemoryKnowByName },
                { intention: INTENTION_INTRODUCTION },
            ]);
    }
}

function createChatIntroduction(citizen: Citizen, messageToCitizen: Citizen, phase: ChatIntentionPhase, state: ChatSimState): ChatMessageOption | undefined {
    switch (phase) {
        case "initMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: [`My name is ${citizen.name}. Who are you?`], execute: (c, mtc, s) => citizenRememberName(mtc, c, s) },
            ]);
        case "replyMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: [`My name is ${citizen.name}.`], intention: INTENTION_REPLY, execute: (c, mtc, s) => citizenRememberName(mtc, c, s) },
            ]);
        case "followUpIntention":
            return selectOption(
                citizen, messageToCitizen, [
                { intention: INTENTION_HOW_ARE_YOU },
            ]);
    }
}

function createChatHowAreYou(citizen: Citizen, messageToCitizen: Citizen, phase: ChatIntentionPhase, state: ChatSimState): ChatMessageOption | undefined {
    switch (phase) {
        case "initMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: [`How are you today ${messageToCitizen.name}?`] },
            ]);
        case "replyMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: [`I am ${howAmI(citizen, state)}.`], condition: alreadyAskedHowAreYou, intention: INTENTION_REPLY },
                { message: [`I am ${howAmI(citizen, state)}. How are you?`], intention: INTENTION_HOW_ARE_YOU },
            ]);
        case "followUpIntention":
            return selectOption(
                citizen, messageToCitizen, [
                { intention: INTENTION_BYE_BYE },
            ]);
    }
}

function createChatByeBye(citizen: Citizen, messageToCitizen: Citizen, phase: ChatIntentionPhase, state: ChatSimState): ChatMessageOption | undefined {
    switch (phase) {
        case "initMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: [`I need to go. Bye bye.`] },
            ]);
        case "replyMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: [`Bye bye`], intention: INTENTION_REPLY },
            ]);
        case "followUpIntention":
            return undefined;
    }
}

function createChatThankYou(citizen: Citizen, messageToCitizen: Citizen, phase: ChatIntentionPhase, state: ChatSimState): ChatMessageOption | undefined {
    switch (phase) {
        case "initMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: [`Thanks alot!`, `Thank you!`, "You saved my life!"] },
            ]);
        case "replyMessage":
            return selectOption(
                citizen, messageToCitizen, [
                { message: [`No Problem.`, "Happy i could help."], intention: INTENTION_REPLY },
            ]);
        case "followUpIntention":
            return undefined;
    }
}


function alreadyAskedHowAreYou(citizen: Citizen, messageToCitizen: Citizen): boolean {
    const citizenState = citizen.stateInfo.stack[0];
    const data = citizenState.data as CitizenStateChatData;
    const chat = data.chatStarterCitizen.lastChat;
    if (!chat) return true;
    for (let message of chat.messages) {
        const intention = message.intention as ChatMessageChatIntention;
        if (message.intention && message.by === citizen && intention.intention === INTENTION_HOW_ARE_YOU) {
            return true;
        }
    }
    return false;
}

function howAmI(citizen: Citizen, state: ChatSimState): string {
    let howAmI = "fine";
    if (nextRandom(state.randomSeed) < 0.5) {
        howAmI = citizenHappinessToString(citizen);
    }
    return howAmI;
}