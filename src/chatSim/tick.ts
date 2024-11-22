import { ChatSimState, Position } from "./chatSimModels.js";
import { Citizen, tickCitizens } from "./citizen.js";
import { moveMapCameraBy } from "./input.js";
import { CITIZEN_STATE_GATHER_MUSHROOM, tickCititzenStateGatherMushroom } from "./jobs/citizenStateGatherMushroom.js";
import { CITIZEN_STATE_BUILD_BUILDING, CITIZEN_STATE_GET_BUILDING, CITIZEN_STATE_GET_BUILDING_CHECK_REQUIREMENTS, tickCititzenStateBuildBuilding, tickCititzenStateGetBuilding, tickCititzenStateGetBuildingCheckRequirements } from "./jobs/citizenStateGetBuilding.js";
import { CITIZEN_STATE_BUY_ITEM_FROM_MARKET, CITIZEN_STATE_GET_ITEM, CITIZEN_STATE_GET_ITEM_FROM_BUILDING, tickCititzenStateGetItem, tickCitizenStateBuyItemFromMarket, tickCitizenStateGetItemFromBuilding } from "./jobs/citizenStateGetItem.js";
import { tickChatSimMap } from "./map.js";

export const CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS: { [key: string]: (citizen: Citizen, state: ChatSimState) => void } = {
};

export function onLoadCitizenStateDefaultTickFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM] = tickCititzenStateGetItem;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM_FROM_BUILDING] = tickCitizenStateGetItemFromBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_BUY_ITEM_FROM_MARKET] = tickCitizenStateBuyItemFromMarket;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_BUILDING] = tickCititzenStateGetBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_BUILDING_CHECK_REQUIREMENTS] = tickCititzenStateGetBuildingCheckRequirements;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_BUILD_BUILDING] = tickCititzenStateBuildBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GATHER_MUSHROOM] = tickCititzenStateGatherMushroom;
}

export function chatSimTick(state: ChatSimState) {
    state.time += 16;
    tickCitizens(state);
    tickChatSimMap(state);
    if (state.paintData.map.lockCameraToSelected && state.inputData.selected) {
        const position = state.inputData.selected.object.position as Position;
        state.paintData.map.cameraPosition = { x: position.x, y: position.y };
    }
    if (state.inputData.map.moveX || state.inputData.map.moveY) moveMapCameraBy(state.inputData.map.moveX, state.inputData.map.moveY, state);
}

