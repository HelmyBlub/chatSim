import { addChatMessage, ChatMessage, ChatMessageIntention, createEmptyChat } from "../chatBubble.js";
import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CitizenMemoryMetCitizen, citizenMoveTo, citizenStateStackTaskSuccess, citizenStopMoving, TAG_SOCIAL_INTERACTION } from "../citizen.js";
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

export function citizenRememberMeetingCitizen(citizen: Citizen, metCitizen: Citizen, state: ChatSimState) {
    const memory = citizen.memory.metCitizensData;
    let metData = memory.metCitizens.find(data => data.citizen === metCitizen);
    if (!metData) {
        metData = {
            citizen: metCitizen,
            knowName: false,
            lastTimeMet: state.time,
            meetCounter: 1,
            relationshipType: "talkedToOnce",
        };
        if (memory.maxCitizenRemember < memory.metCitizens.length + 1) {
            let forgetIndex = -1;
            let forgetScore = 0;
            for (let i = 0; i < memory.metCitizens.length; i++) {
                const metData = memory.metCitizens[i];
                const score = (metData.knowName ? 5 : 1) * metData.meetCounter - (state.time - metData.lastTimeMet) / state.timPerDay;
                if (forgetIndex === -1) {
                    forgetIndex = i;
                    forgetScore = score;
                } else {
                    if (score < forgetScore) {
                        forgetIndex = i;
                        forgetScore = score;
                    }
                }
            }
            memory.metCitizens.splice(forgetIndex, 1);
        }
        memory.metCitizens.push(metData);
    } else {
        metData.meetCounter++;
        metData.lastTimeMet = state.time;
    }
}

export function citizenRememberName(citizen: Citizen, metCitizen: Citizen, state: ChatSimState) {
    const memory = citizen.memory.metCitizensData;
    let metData = memory.metCitizens.find(data => data.citizen === metCitizen);
    if (metData) {
        memory.nameRememberCounter++;
        if (memory.nameRememberCounter > memory.maxNamesRemember) {
            let forget: CitizenMemoryMetCitizen | undefined = undefined;
            let forgetScore = 0;
            for (let i = 0; i < memory.metCitizens.length; i++) {
                const metData = memory.metCitizens[i];
                if (!metData.knowName) continue;
                const score = 5 * metData.meetCounter - (state.time - metData.lastTimeMet) / state.timPerDay;
                if (!forget) {
                    forget = metData;
                    forgetScore = score;
                } else {
                    if (score < forgetScore) {
                        forget = metData;
                        forgetScore = score;
                    }
                }
            }
            forget!.knowName = false;
        }
        metData.knowName = true;
    }
}

export function citizenMemoryKnowByName(citizen: Citizen, metCitizen: Citizen): boolean {
    const memory = citizen.memory.metCitizensData;
    let metData = memory.metCitizens.find(data => data.citizen === metCitizen);
    return (metData !== undefined && metData.knowName);
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
            citizenRememberMeetingCitizen(citizen, data.firstInviteCitizen!, state);
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
                    citizenRememberMeetingCitizen(citizen, message.by, state);
                    addChatMessage(chat, citizen, "Hello?", state, intention);
                } else {
                    if (citizenMemoryKnowByName(citizen, message.by)) {
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
                        addChatMessage(chat, citizen, `My name is ${citizen.name}. Who are you?`, state, intention);
                        citizenRememberName(message.by, citizen, state);
                    }
                }
            }
            if (repsonseIntention.intention === "introduce") {
                if (data.chatStarterCitizen !== citizen) {
                    const intention: ChatMessageSmallTalkIntention = {
                        type: CITIZEN_STATE_SMALL_TALK,
                        intention: "introduce",
                    }
                    citizenRememberName(message.by, citizen, state);
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
