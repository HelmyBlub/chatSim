import { ChatSimState } from "../chatSimModels.js";
import { Citizen, citizenStateStackTaskSuccess, TAG_SOCIAL_INTERACTION } from "../citizen.js";
import { InventoryItem, inventoryPutItemInto } from "../inventory.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";

export type CitizenStateTradeData = {
    giver: Citizen,
    receiver: Citizen,
    itemName: string,
    itemAmount: number,
    timer?: number,
}
export const CITIZEN_STATE_TRADE = "trade";

export function onLoadCitizenStateDefaultTickTradeFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_TRADE] = tickCititzenStateTrade;
}

export function setCitizenStateTrade(giver: Citizen, receiver: Citizen, itemName: string, itemAmount: number) {
    const giverData: CitizenStateTradeData = { giver, receiver, itemAmount, itemName };
    giver.stateInfo.stack.unshift({ state: CITIZEN_STATE_TRADE, data: giverData, tags: new Set([TAG_SOCIAL_INTERACTION]) });
    const receiverData: CitizenStateTradeData = { giver, receiver, itemAmount, itemName };
    receiver.stateInfo.stack.unshift({ state: CITIZEN_STATE_TRADE, data: receiverData, tags: new Set([TAG_SOCIAL_INTERACTION]) });
}

function tickCititzenStateTrade(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const data = citizenState.data as CitizenStateTradeData;

    if (data.giver === citizen) {
        if (citizenState.subState === undefined) {
            const inventoryItem = citizen.inventory.items.find(i => i.name === data.itemName);
            if (!inventoryItem || inventoryItem.counter < data.itemAmount || data.itemAmount < 0) {
                citizenStateStackTaskSuccess(citizen);
                return;
            }
            const tradeItem: InventoryItem = {
                counter: data.itemAmount,
                name: data.itemName,
            }
            inventoryItem.counter -= data.itemAmount;
            citizen.tradePaw = {
                item: tradeItem,
                money: 0,
                startTime: state.time,
                duration: 500,
                moveFrom: { x: citizen.position.x, y: citizen.position.y },
                moveTo: { x: citizen.position.x, y: citizen.position.y },
            }
            citizenState.subState = "putIntoPaw";
        } else {
            if (citizen.tradePaw === undefined) {
                citizenStateStackTaskSuccess(citizen);
                return;
            } else if (citizen.tradePaw.startTime + citizen.tradePaw.duration + 2000 < state.time) {
                inventoryPutItemInto(citizen.tradePaw.item!.name, citizen.inventory, citizen.tradePaw.item!.counter);
                citizen.tradePaw = undefined;
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        }
    } else if (data.receiver === citizen) {
        if (citizenState.subState === undefined) {
            if (data.timer === undefined) data.timer = state.time;
            if (data.giver.tradePaw && data.giver.tradePaw.startTime + data.giver.tradePaw.duration < state.time) {
                citizen.tradePaw = {
                    item: data.giver.tradePaw.item,
                    money: 0,
                    startTime: state.time,
                    duration: 1000,
                    moveFrom: { x: data.giver.tradePaw.moveTo.x, y: data.giver.tradePaw.moveTo.y },
                    moveTo: { x: citizen.position.x, y: citizen.position.y },
                }
                data.giver.tradePaw = undefined;
                citizenState.subState = "took item";
            } else if (data.timer + 5000 < state.time) {
                citizenStateStackTaskSuccess(citizen);
            }
        } else if (citizenState.subState === "took item") {
            if (citizen.tradePaw && citizen.tradePaw.startTime + citizen.tradePaw.duration < state.time) {
                inventoryPutItemInto(citizen.tradePaw.item!.name, citizen.inventory, citizen.tradePaw.item!.counter);
                citizen.tradePaw = undefined;
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        }
    } else {
        console.log("should not be possible");
    }
}
