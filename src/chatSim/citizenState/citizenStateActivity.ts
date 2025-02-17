import { ChatSimState } from "../chatSimModels.js";
import { citizenIsInVisionDistanceForMapObject, citizenMoveToRandom, TAG_DOING_NOTHING } from "../map/citizen.js";
import { citizenAddLogEntry, citizenAddThought, Citizen, citizenStateStackTaskSuccess, citizenMoveTo } from "../map/citizen.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateStartCitizenChat } from "./citizenStateChat.js";
import { INTENTION_GREETING } from "./citizenChatMessageOptions.js";
import { INVENTORY_MUSHROOM, InventoryItemMushroom } from "../inventory.js";
import { setCitizenStateEat } from "./citizenStateEat.js";
import { setCitizenStateGetItem } from "./citizenStateGetItem.js";

type RandomMoveData = {
    lastSearchDirection?: number,
    startTime: number,
}

type TalkToSomebodyData = {
    lastSearchDirection?: number,
    citizenInVisionDistance?: Citizen,
    talkStarted?: boolean,
}

export const CITIZEN_STATE_DO_NOTHING_AT_HOME = "do nothing at home";
export const CITIZEN_STATE_WALKING_AROUND_RANDOMLY = "walking around randomly";
export const CITIZEN_STATE_TALK_TO_SOMEBODY = "talk to somebody";
export const CITIZEN_STATE_FIND_FOOD_AND_EAT = "find food and eat";

export function onLoadCitizenStateDefaultTickActivityFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_DO_NOTHING_AT_HOME] = tickCitizenStateDoNothingAtHome;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_WALKING_AROUND_RANDOMLY] = tickCitizenStateWalkingAroundRandomly;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_TALK_TO_SOMEBODY] = tickCitizenStateTalkToSomebody;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_FIND_FOOD_AND_EAT] = tickCitizenStateFindFoodAndEat;
}

export function setCitizenStateDoNothingAtHome(citizen: Citizen, state: ChatSimState) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_DO_NOTHING_AT_HOME, data: state.time, tags: new Set([TAG_DOING_NOTHING]) });
}

export function setCitizenStateWalkingAroundRandomly(citizen: Citizen, state: ChatSimState) {
    const data: RandomMoveData = { startTime: state.time };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_WALKING_AROUND_RANDOMLY, data: data, tags: new Set() });
}

export function setCitizenStateFindFoodAndEat(citizen: Citizen, state: ChatSimState) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_FIND_FOOD_AND_EAT, tags: new Set() });
}

export function setCitizenStateTalkToSomebody(citizen: Citizen) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_TALK_TO_SOMEBODY, tags: new Set(), data: {} });
}

function tickCitizenStateTalkToSomebody(citizen: Citizen, state: ChatSimState) {
    if (!citizen.moveTo) {
        const data = citizen.stateInfo.stack[0].data as TalkToSomebodyData;
        if (data.talkStarted) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        if (!data.citizenInVisionDistance) {
            data.citizenInVisionDistance = state.map.citizens.find(c => c !== citizen && citizenIsInVisionDistanceForMapObject(citizen, c, state));
        }
        if (data.citizenInVisionDistance) {
            data.talkStarted = true;
            setCitizenStateStartCitizenChat(citizen, citizen, data.citizenInVisionDistance, INTENTION_GREETING);
            return;
        } else {
            data.lastSearchDirection = citizenMoveToRandom(citizen, state, data.lastSearchDirection);
        }
    }
}

function tickCitizenStateWalkingAroundRandomly(citizen: Citizen, state: ChatSimState) {
    if (!citizen.moveTo) {
        if (citizen.happinessData.happiness > 0.5) {
            citizenAddThought(citizen, "I feel happy again.", state);
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        const data = citizen.stateInfo.stack[0].data as RandomMoveData;
        const timepassed = state.time - data.startTime;
        if (timepassed > state.timPerDay / 4) {
            citizenAddThought(citizen, "I walked around enough.", state);
            citizenStateStackTaskSuccess(citizen);
            return;
        }

        data.lastSearchDirection = citizenMoveToRandom(citizen, state, data.lastSearchDirection);
    }
}

function tickCitizenStateFindFoodAndEat(citizen: Citizen, state: ChatSimState) {
    const inventoryMushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM) as InventoryItemMushroom;
    const stackData = citizen.stateInfo.stack[0];
    if (stackData.subState === "eating") {
        citizenStateStackTaskSuccess(citizen);
        return;
    }

    if (inventoryMushrooms && inventoryMushrooms.counter > 0) {
        stackData.subState = "eating";
        setCitizenStateEat(citizen, inventoryMushrooms, "", 3);
        return;
    } else {
        setCitizenStateGetItem(citizen, INVENTORY_MUSHROOM, 3);
        return;
    }
}

function tickCitizenStateDoNothingAtHome(citizen: Citizen, state: ChatSimState) {
    if (!citizen.home) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }

    if (!citizen.moveTo) {
        if (isCitizenAtPosition(citizen, citizen.home.position)) {
            if (citizen.happinessData.happiness > 0.5) {
                citizenAddThought(citizen, "I feel happy again.", state);
                citizenStateStackTaskSuccess(citizen);
                return;
            }
            const timepassed = state.time - citizen.stateInfo.stack[0].data;
            if (timepassed > state.timPerDay / 4) {
                citizenAddThought(citizen, "I did enough doing nothing.", state);
                citizenStateStackTaskSuccess(citizen);
                return;
            }
        } else {
            citizenAddLogEntry(citizen, `moving home`, state);
            citizenMoveTo(citizen, citizen.home.position);
            return;
        }
    }
}
