import { drawTextWithOutline } from "../drawHelper.js";
import { ChatSimState, Position } from "./chatSimModels.js"
import { citizenAddLogEntry, Citizen, CITIZEN_PAINT_SIZE } from "./map/citizen.js"
import { mapPositionToPaintPosition } from "./paint.js";

export type Chat = {
    messages: ChatMessage[],
    maxMessages: number,
    lastMessageTime?: number,
}

export type ChatMessageIntention = {
    type: string,
}

export const CHAT_MESSAGE_INTENTION_MARKET_TRADE = "MarketTrade";

export type ChatMessageMarketTradeIntention = ChatMessageIntention & {
    intention: "initialGreeting" | "whatDoYouWant" | "tradeRequestData" | "priceResponse" | "accept" | "tradeCancelled" | "tradeFullfiled",
    sellToMarket?: boolean,
    itemName?: string,
    itemAmount?: number,
    singlePrice?: number,
}

export type ChatMessage = {
    message: string,
    time: number,
    by: Citizen,
    intention?: { type: string },
}

const CHAT_DISPLAY_DURATION = 4000;

export function createEmptyChat(): Chat {
    return {
        maxMessages: 4,
        messages: [],
    }
}

export function addChatMessage(chat: Chat, citizen: Citizen, message: string, state: ChatSimState, intention: ChatMessageIntention | undefined = undefined) {
    chat.messages.push({ by: citizen, message: message, time: state.time, intention: intention });
    citizenAddLogEntry(citizen, `I said: ${message}.`, state);
    chat.lastMessageTime = state.time;
    if (chat.messages.length > chat.maxMessages) {
        chat.messages.shift();
    }
}

export function paintChatBubbles(ctx: CanvasRenderingContext2D, chatOwner: Citizen, chat: Chat | undefined, paintPos: Position, state: ChatSimState) {
    if (!chat || chat.lastMessageTime === undefined || chat.lastMessageTime + CHAT_DISPLAY_DURATION < state.time) return;
    const fontSize = 8;
    ctx.font = `${fontSize}px Arial`;
    const padding = 3;
    const margin = 2;
    for (let i = 0; i < chat.messages.length; i++) {
        const message = chat.messages[i];
        if (message.time + 4000 < state.time) continue;
        let offsetY = -(chat.messages.length - i - 1) * (fontSize + padding * 2 + margin);
        let offsetX = (message.by.position.x - chatOwner.position.x);
        if (i !== chat.messages.length - 1) {
            if (offsetX < -80) offsetX = -80;
            if (offsetX > 80) offsetX = 80;
        } else {
            let stickToByCitizen = false;
            if (-120 < offsetX && offsetX < -80) offsetX = -80;
            if (120 > offsetX && offsetX > 80) offsetX = 80;
            if (offsetX > 120 || offsetX < -120) stickToByCitizen = true;
            if (stickToByCitizen) {
                const tempPaintPos = mapPositionToPaintPosition(message.by.position, state.paintData.map);
                const tempY = tempPaintPos.y - CITIZEN_PAINT_SIZE / 2 - 4;
                offsetY = tempY - paintPos.y;
            }
        }
        paintChatBubble(ctx, message.message, { x: paintPos.x + offsetX, y: paintPos.y + offsetY }, fontSize, padding, i === chat.messages.length - 1);
    }
}

function paintChatBubble(ctx: CanvasRenderingContext2D, message: string, paintPos: Position, fontSize: number, padding: number, withPointer: boolean) {
    ctx.fillStyle = "lightgray";
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.lineWidth = 1;
    const pointerSize = 15;
    const cornerSize = 5;
    const bottom = paintPos.y + padding - pointerSize;
    const top = bottom - fontSize - padding * 2;
    const left = paintPos.x - padding - pointerSize / 2;
    const right = left + ctx.measureText(message).width + padding * 2;
    ctx.moveTo(left, bottom - cornerSize);
    ctx.lineTo(left, top + cornerSize);
    ctx.quadraticCurveTo(left, top, left + cornerSize, top);
    ctx.lineTo(right - cornerSize, top);
    ctx.quadraticCurveTo(right, top, right, top + cornerSize);
    ctx.lineTo(right, bottom - cornerSize);
    ctx.quadraticCurveTo(right, bottom, right - cornerSize, bottom);
    if (withPointer) {
        ctx.lineTo(left + pointerSize, bottom);
        ctx.quadraticCurveTo(left + Math.floor(pointerSize / 2), bottom, left + Math.floor(pointerSize / 2), bottom + pointerSize);
        ctx.quadraticCurveTo(left, bottom, left, bottom - cornerSize);
    } else {
        ctx.lineTo(left + cornerSize, bottom);
        ctx.quadraticCurveTo(left, bottom, left, bottom - cornerSize);
    }
    ctx.fill();
    ctx.stroke();

    drawTextWithOutline(ctx, message, left + padding, bottom - padding, "white", "black", 1);
}