import { ChatSimState, Position } from "./chatSimModels.js";
import { Citizen, tickCitizens } from "./citizen.js";
import { moveMapCameraBy } from "./input.js";
import { onLoadCitizenStateDefaultTickGatherMushroomsFuntions } from "./jobs/citizenStateGatherMushroom.js";
import { onLoadCitizenStateDefaultTickGatherWoodFuntions } from "./jobs/citizenStateGatherWood.js";
import { onLoadCitizenStateDefaultTickGetBuildingFuntions } from "./jobs/citizenStateGetBuilding.js";
import { onLoadCitizenStateDefaultTickGetItemFuntions } from "./jobs/citizenStateGetItem.js";
import { onLoadCitizenStateDefaultTickMarketFuntions } from "./jobs/citizenStateMarket.js";
import { onLoadCitizenStateDefaultTickSellItemFuntions } from "./jobs/citizenStateSellItem.js";
import { tickChatSimMap } from "./map.js";

export const CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS: { [key: string]: (citizen: Citizen, state: ChatSimState) => void } = {
};

export function onLoadCitizenStateDefaultTickFuntions() {
    onLoadCitizenStateDefaultTickGetItemFuntions();
    onLoadCitizenStateDefaultTickGetBuildingFuntions();
    onLoadCitizenStateDefaultTickSellItemFuntions();
    onLoadCitizenStateDefaultTickGatherMushroomsFuntions();
    onLoadCitizenStateDefaultTickGatherWoodFuntions();
    onLoadCitizenStateDefaultTickMarketFuntions();
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

