import { ChatSimState, Position } from "./chatSimModels.js";
import { Citizen, tickCitizens } from "./citizen.js";
import { moveMapCameraBy } from "./input.js";
import { onLoadCitizenStateDefaultTickGatherMushroomsFuntions } from "./citizenState/citizenStateGatherMushroom.js";
import { onLoadCitizenStateDefaultTickGatherWoodFuntions } from "./citizenState/citizenStateGatherWood.js";
import { onLoadCitizenStateDefaultTickMarketFuntions } from "./citizenState/citizenStateMarket.js";
import { onLoadCitizenStateDefaultTickSellItemFuntions } from "./citizenState/citizenStateSellItem.js";
import { tickChatSimMap } from "./map/map.js";
import { onLoadCitizenStateDefaultTickGetBuildingFuntions } from "./citizenState/citizenStateGetBuilding.js";
import { onLoadCitizenStateDefaultTickGetItemFuntions } from "./citizenState/citizenStateGetItem.js";
import { onLoadCitizenStateDefaultTickEatFuntions } from "./citizenState/citizenStateEat.js";
import { onLoadCitizenStateDefaultTickActivityFuntions } from "./citizenState/citizenStateActivity.js";
import { onLoadCitizenStateDefaultTickSmallTalkFuntions } from "./citizenState/citizenStateSmallTalk.js";

export const CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS: { [key: string]: (citizen: Citizen, state: ChatSimState) => void } = {
};

export function onLoadCitizenStateDefaultTickFuntions() {
    onLoadCitizenStateDefaultTickGetItemFuntions();
    onLoadCitizenStateDefaultTickGetBuildingFuntions();
    onLoadCitizenStateDefaultTickSellItemFuntions();
    onLoadCitizenStateDefaultTickGatherMushroomsFuntions();
    onLoadCitizenStateDefaultTickGatherWoodFuntions();
    onLoadCitizenStateDefaultTickMarketFuntions();
    onLoadCitizenStateDefaultTickEatFuntions();
    onLoadCitizenStateDefaultTickActivityFuntions();
    onLoadCitizenStateDefaultTickSmallTalkFuntions();
}

export function chatSimTick(state: ChatSimState) {
    state.time += state.tickInterval;
    tickCitizens(state);
    tickChatSimMap(state);
    if (state.paintData.map.lockCameraToSelected && state.inputData.selected) {
        const position = state.inputData.selected.object.position as Position;
        state.paintData.map.cameraPosition = { x: position.x, y: position.y };
    }
}

