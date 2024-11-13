import { ChatSimState, PaintDataMap } from "./chatSimModels.js";
import { addCitizen } from "./main.js";

export function chatSimAddInputEventListeners(state: ChatSimState) {
    document.addEventListener('keydown', (e) => keyDown(e, state));
    document.addEventListener('keyup', (e) => keyUp(e, state));
    document.addEventListener('wheel', (e) => mouseWheel(e, state));
    document.addEventListener('mousedown', (e) => mouseDown(e, state));
    document.addEventListener('mouseup', (e) => mouseUp(e, state));
    document.addEventListener('mousemove', (e) => mouseMove(e, state));
}

export function moveMapCameraBy(moveX: number, moveY: number, state: ChatSimState) {
    const paintDataMap = state.paintData.map;
    const zoom = state.paintData.map.zoom;
    paintDataMap.cameraPosition.x += moveX / zoom;
    paintDataMap.cameraPosition.y += moveY / zoom;
    const maxLeft = -state.map.mapWidth / 2;
    const maxRight = state.map.mapWidth / 2;
    if (paintDataMap.cameraPosition.x < maxLeft) {
        paintDataMap.cameraPosition.x = maxLeft;
    } else if (paintDataMap.cameraPosition.x > maxRight) {
        paintDataMap.cameraPosition.x = maxRight;
    }

    const maxTop = -state.map.mapHeight / 2;
    const maxBottom = state.map.mapHeight / 2;
    if (paintDataMap.cameraPosition.y < maxTop) {
        paintDataMap.cameraPosition.y = maxTop;
    } else if (paintDataMap.cameraPosition.y > maxBottom) {
        paintDataMap.cameraPosition.y = maxBottom;
    }
}

function mouseDown(event: MouseEvent, state: ChatSimState) {
    state.inputData.map.mouseMoveMap = true;
}
function mouseUp(event: MouseEvent, state: ChatSimState) {
    state.inputData.map.mouseMoveMap = false;
}
function mouseMove(event: MouseEvent, state: ChatSimState) {
    if (state.inputData.map.mouseMoveMap) {
        moveMapCameraBy(-event.movementX, -event.movementY, state);
    }
}

function mouseWheel(event: WheelEvent, state: ChatSimState) {
    const zoomFactor = 0.2;
    const maxZoom = 10;
    const minZoom = 0.1;
    state.paintData.map.zoom *= event.deltaY < 0 ? 1 + zoomFactor : 1 / (1 + zoomFactor);
    if (Math.abs(1 - state.paintData.map.zoom) < zoomFactor * 0.80) state.paintData.map.zoom = 1;
    if (state.paintData.map.zoom > maxZoom) state.paintData.map.zoom = maxZoom;
    if (state.paintData.map.zoom < minZoom) state.paintData.map.zoom = minZoom;
}

function keyUp(event: KeyboardEvent, state: ChatSimState) {
    switch (event.code) {
        case "KeyW": case "KeyS":
            state.inputData.map.moveY = 0;
            break;
        case "KeyA": case "KeyD":
            state.inputData.map.moveX = 0;
            break;
    }
}

function keyDown(event: KeyboardEvent, state: ChatSimState) {
    const moveTickAmount = 4;
    const speedScaling = 1.2;
    switch (event.code) {
        case "Period":
            if (state.gameSpeed < 5) {
                state.gameSpeed++;
            } else {
                state.gameSpeed *= speedScaling;
                state.gameSpeed = Math.round(state.gameSpeed);
            }
            break;
        case "Comma":
            if (state.gameSpeed < 5 && state.gameSpeed > 0) {
                state.gameSpeed--;
            } else {
                state.gameSpeed /= speedScaling;
                state.gameSpeed = Math.round(state.gameSpeed);
            }
            break
        case "KeyW":
            state.inputData.map.moveY = -moveTickAmount;
            break;
        case "KeyS":
            state.inputData.map.moveY = moveTickAmount;
            break;
        case "KeyA":
            state.inputData.map.moveX = -moveTickAmount;
            break;
        case "KeyD":
            state.inputData.map.moveX = moveTickAmount;
            break;
        case "KeyM":
            addCitizen("TestCitizen" + Math.floor(Math.random() * 1000), state);
            break
        default:
            console.log(event.key, event.code);
            break;
    }
}
