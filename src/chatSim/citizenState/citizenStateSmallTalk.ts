import { addChatMessage, ChatMessage, ChatMessageIntention, createEmptyChat } from "../chatBubble.js";
import { ChatSimState } from "../chatSimModels.js";
import { Citizen, citizenMoveTo, citizenStateStackTaskSuccess, citizenStopMoving, TAG_SOCIAL_INTERACTION } from "../citizen.js";
import { citizenHappinessToString } from "../citizenNeeds/citizenNeedHappiness.js";
import { citizenIsGoingToSleep, citizenIsSleeping } from "../citizenNeeds/citizenNeedSleep.js";
import { nextRandom } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";

export type CitizenStateSmallTalkData = {
    chatStarterCitizen: Citizen,
    firstInviteCitizen?: Citizen,
}

export type ChatMessageSmallTalkIntention = ChatMessageIntention & {
    intention: "initialGreeting" | "introduce" | "howAreYou" | "bye bye",
}

export const CITIZEN_STATE_SMALL_TALK = "Small Talk";

export function onLoadCitizenStateDefaultTickSmallTalkFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_SMALL_TALK] = tickCititzenStateSmallTalk;
}

export function setCitizenStateSmallTalk(citizen: Citizen, chatStarterCitizen: Citizen, firstInviteCitizen: Citizen | undefined = undefined) {
    citizen.stateInfo.stack.unshift({
        state: CITIZEN_STATE_SMALL_TALK,
        data: { chatStarterCitizen: chatStarterCitizen, firstInviteCitizen: firstInviteCitizen },
        tags: new Set([TAG_SOCIAL_INTERACTION])
    });
}

export function citizenInviteToChat(invitingCitizen: Citizen, invitedCitizen: Citizen, state: ChatSimState) {
    if (citizenIsSleeping(invitedCitizen)) {
        if (nextRandom(state.randomSeed) < 0.25) {
            addChatMessage(invitingCitizen.lastChat!, invitedCitizen, "Let me sleep! Idiot!", state);
        }
        return;
    }
    setCitizenStateSmallTalk(invitedCitizen, invitingCitizen);
    citizenStopMoving(invitedCitizen);
}

function tickCititzenStateSmallTalk(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const data = citizenState.data as CitizenStateSmallTalkData;
    if (!citizenState.subState) {
        if (data.chatStarterCitizen === citizen) {
            if (!citizen.lastChat) {
                citizen.lastChat = createEmptyChat();
            }
            const intention: ChatMessageSmallTalkIntention = {
                type: CITIZEN_STATE_SMALL_TALK,
                intention: "initialGreeting",
            }
            addChatMessage(citizen.lastChat, citizen, "Hello!", state, intention);
            citizenMoveTo(citizen, { x: data.firstInviteCitizen!.position.x + 20, y: data.firstInviteCitizen!.position.y });
            citizenInviteToChat(citizen, data.firstInviteCitizen!, state);
            citizenState.subState = "waitingForResponse";
            return;
        } else {
            citizenState.subState = "waitingForResponse";
        }
    }
    if (data.chatStarterCitizen.moveTo) return;
    if (!data.chatStarterCitizen.lastChat) return;
    const chat = data.chatStarterCitizen.lastChat;
    if (citizenState.subState === "waitingForResponse") {
        const message = chat.messages[chat.messages.length - 1];
        const reactionTime = message.time + 1000;
        if (reactionTime > state.time) return;
        if (message.time + 5000 < state.time) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (message.by === citizen) return;
        const repsonseIntention = message.intention as ChatMessageSmallTalkIntention;
        if (repsonseIntention) {
            if (repsonseIntention.intention === "initialGreeting") {
                if (data.chatStarterCitizen !== citizen) {
                    const intention: ChatMessageSmallTalkIntention = {
                        type: CITIZEN_STATE_SMALL_TALK,
                        intention: "initialGreeting",
                    }
                    addChatMessage(chat, citizen, "Hello?", state, intention);
                } else {
                    if (citizen.memory.citizensKnownByName.has(message.by)) {
                        const intention: ChatMessageSmallTalkIntention = {
                            type: CITIZEN_STATE_SMALL_TALK,
                            intention: "howAreYou",
                        }
                        addChatMessage(chat, citizen, `How are you today ${message.by.name}?`, state, intention);
                    } else {
                        const intention: ChatMessageSmallTalkIntention = {
                            type: CITIZEN_STATE_SMALL_TALK,
                            intention: "introduce",
                        }
                        message.by.memory.citizensKnownByName.add(citizen);
                        addChatMessage(chat, citizen, `My name is ${citizen.name}. Who are you?`, state, intention);
                    }
                }
            }
            if (repsonseIntention.intention === "introduce") {
                if (data.chatStarterCitizen !== citizen) {
                    const intention: ChatMessageSmallTalkIntention = {
                        type: CITIZEN_STATE_SMALL_TALK,
                        intention: "introduce",
                    }
                    message.by.memory.citizensKnownByName.add(citizen);
                    addChatMessage(chat, citizen, `My name is ${citizen.name}.`, state, intention);
                } else {
                    const intention: ChatMessageSmallTalkIntention = {
                        type: CITIZEN_STATE_SMALL_TALK,
                        intention: "howAreYou",
                    }
                    addChatMessage(chat, citizen, `How are you?`, state, intention);
                }
            }
            if (repsonseIntention.intention === "howAreYou") {
                if (data.chatStarterCitizen !== citizen) {
                    const intention: ChatMessageSmallTalkIntention = {
                        type: CITIZEN_STATE_SMALL_TALK,
                        intention: "howAreYou",
                    }
                    let howAmI = "fine";
                    if (nextRandom(state.randomSeed) < 0.5) {
                        howAmI = citizenHappinessToString(citizen);
                    }
                    addChatMessage(chat, citizen, `I am ${howAmI}. How are you?`, state, intention);
                } else {
                    const intention: ChatMessageSmallTalkIntention = {
                        type: CITIZEN_STATE_SMALL_TALK,
                        intention: "bye bye",
                    }
                    let howAmI = "fine";
                    if (nextRandom(state.randomSeed) < 0.5) {
                        howAmI = citizenHappinessToString(citizen);
                    }
                    addChatMessage(chat, citizen, `I am ${howAmI}. Bye Bye!`, state, intention);
                }
            }
            if (repsonseIntention.intention === "bye bye") {
                if (data.chatStarterCitizen !== citizen) {
                    const intention: ChatMessageSmallTalkIntention = {
                        type: CITIZEN_STATE_SMALL_TALK,
                        intention: "bye bye",
                    }
                    addChatMessage(chat, citizen, `Bye bye!`, state, intention);
                    citizenStateStackTaskSuccess(citizen);
                } else {
                    citizenStateStackTaskSuccess(citizen);
                }
            }
        }
    }
}
