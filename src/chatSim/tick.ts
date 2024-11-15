import { ChatSimState, Tree, Mushroom } from "./chatSimModels.js";
import { tickCitizens } from "./citizen.js";
import { moveMapCameraBy } from "./input.js";
import { tickChatSimMap } from "./map.js";

export function chatSimTick(state: ChatSimState) {
    state.time += 16;
    tickCitizens(state);
    tickChatSimMap(state);
    if (state.inputData.map.moveX || state.inputData.map.moveY) moveMapCameraBy(state.inputData.map.moveX, state.inputData.map.moveY, state);
}

