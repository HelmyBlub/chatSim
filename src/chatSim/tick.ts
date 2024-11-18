import { ChatSimState, Position } from "./chatSimModels.js";
import { tickCitizens } from "./citizen.js";
import { moveMapCameraBy } from "./input.js";
import { tickChatSimMap } from "./map.js";

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

