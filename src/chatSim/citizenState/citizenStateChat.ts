import { addChatMessage, ChatMessageIntention, createEmptyChat } from "../chatBubble.js";
import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CitizenMemoryMetCitizen, citizenMoveTo, citizenStateStackTaskSuccess, citizenStopMoving, TAG_SOCIAL_INTERACTION } from "../citizen.js";
import { citizenIsSleeping } from "../citizenNeeds/citizenNeedSleep.js";
import { nextRandom } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { getMessageForIntentionAndPhase, INTENTION_BYE_BYE, INTENTION_GREETING, INTENTION_IGNORE, INTENTION_REPLY } from "./citizenChatMessageOptions.js";

export type CitizenStateChatData = {
    chatStarterCitizen: Citizen,
    lastIntention?: string,
    firstInviteCitizen?: Citizen,
    initialIntention?: string,
}

export type ChatMessageChatIntention = ChatMessageIntention & {
    intention: string,
}

export const CITIZEN_STATE_CHAT = "Citizen Chat";

export function onLoadCitizenStateDefaultTickChatFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_CHAT] = tickCititzenStateChat;
}

export function setCitizenStateStartCitizenChat(citizen: Citizen, chatStarterCitizen: Citizen, firstInviteCitizen: Citizen, initialIntention: string) {
    citizen.stateInfo.stack.unshift({
        state: CITIZEN_STATE_CHAT,
        data: { chatStarterCitizen: chatStarterCitizen, firstInviteCitizen: firstInviteCitizen, initialIntention: initialIntention },
        tags: new Set([TAG_SOCIAL_INTERACTION])
    });
}

export function setCitizenStateJoinCitizenChat(citizen: Citizen, chatStarterCitizen: Citizen) {
    citizen.stateInfo.stack.unshift({
        state: CITIZEN_STATE_CHAT,
        data: { chatStarterCitizen: chatStarterCitizen },
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
    setCitizenStateJoinCitizenChat(invitedCitizen, invitingCitizen);
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

function tickCititzenStateChat(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const data = citizenState.data as CitizenStateChatData;
    if (!citizenState.subState) {
        if (data.chatStarterCitizen === citizen) {
            if (!citizen.lastChat) {
                citizen.lastChat = createEmptyChat();
            }
            const messageAndIntention = getMessageForIntentionAndPhase(citizen, data.firstInviteCitizen!, data.initialIntention!, "initMessage", state)!;
            const intention: ChatMessageChatIntention = {
                type: CITIZEN_STATE_CHAT,
                intention: messageAndIntention.intention!,
            }
            data.lastIntention = intention.intention;
            addChatMessage(citizen.lastChat, citizen, messageAndIntention.message!, state, intention);
            citizenRememberMeetingCitizen(citizen, data.firstInviteCitizen!, state);
            citizenMoveTo(citizen, { x: data.firstInviteCitizen!.position.x + 20, y: data.firstInviteCitizen!.position.y });
            citizenInviteToChat(citizen, data.firstInviteCitizen!, state);
            citizenState.subState = "waitingForResponse";
            return;
        } else {
            citizenRememberMeetingCitizen(citizen, data.chatStarterCitizen, state);
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
        const repsonseIntention = message.intention as ChatMessageChatIntention;
        if (repsonseIntention) {
            if (repsonseIntention.intention === INTENTION_REPLY) {
                // find next intention
                const followUpIntention = getMessageForIntentionAndPhase(citizen, message.by, data.lastIntention!, "followUpIntention", state);
                if (!followUpIntention || !followUpIntention.intention) {
                    citizenStateStackTaskSuccess(citizen);
                    return;
                }
                const messageAndIntention = getMessageForIntentionAndPhase(citizen, message.by, followUpIntention.intention, "initMessage", state);
                if (!messageAndIntention) throw "should not happen";
                const intention = {
                    type: CITIZEN_STATE_CHAT,
                    intention: messageAndIntention.intention,
                }
                data.lastIntention = intention.intention;
                addChatMessage(chat, citizen, messageAndIntention.message!, state, intention);
                if (messageAndIntention.execute) messageAndIntention.execute(citizen, message.by, state);
            } else {
                // reply to intention
                const messageAndIntention = getMessageForIntentionAndPhase(citizen, message.by, repsonseIntention.intention, "replyMessage", state);
                if (!messageAndIntention) {
                    citizenStateStackTaskSuccess(citizen);
                    return;
                }
                let intention: ChatMessageChatIntention | undefined = undefined;
                if (messageAndIntention.intention) {
                    intention = {
                        type: CITIZEN_STATE_CHAT,
                        intention: messageAndIntention.intention,
                    }
                }
                data.lastIntention = repsonseIntention.intention;
                if (messageAndIntention.message !== undefined) addChatMessage(chat, citizen, messageAndIntention.message, state, intention);
                if (messageAndIntention.execute) messageAndIntention.execute(citizen, message.by, state);
                if (repsonseIntention.intention === INTENTION_BYE_BYE || intention?.intention === INTENTION_IGNORE) {
                    citizenStateStackTaskSuccess(citizen);
                    return;
                }
            }
        }
    }
}
