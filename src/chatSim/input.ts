import { ChatSimState, PaintDataMap, Position } from "./chatSimModels.js";
import { addCitizen } from "./citizen.js";
import { calculateDistance } from "./main.js";
import { mapPositionToPaintPosition } from "./paint.js";
import { chatSimTick } from "./tick.js";

const INPUT_CONSIDERED_CLICK_MAX_TIME = 200;
const INPUT_CONSIDERED_MIN_MOVING_DISTANCE = 20;

export function chatSimAddInputEventListeners(state: ChatSimState) {
    document.addEventListener('keydown', (e) => keyDown(e, state));
    document.addEventListener('keyup', (e) => keyUp(e, state));
    state.canvas.addEventListener('wheel', (e) => mouseWheel(e, state));
    state.canvas.addEventListener('mousedown', (e) => mouseDown(e, state));
    state.canvas.addEventListener('mouseup', (e) => mouseUp(e, state));
    state.canvas.addEventListener('mousemove', (e) => mouseMove(e, state));
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
    state.paintData.map.lockCameraToSelected = false;
}

function mouseDown(event: MouseEvent, state: ChatSimState) {
    state.inputData.map.mouseMoveMap = true;
    state.inputData.lastMouseDownTime = performance.now();
    state.inputData.lastMouseDownPosition = {
        x: event.clientX,
        y: event.clientY,
    }
}
function mouseUp(event: MouseEvent, state: ChatSimState) {
    state.inputData.map.mouseMoveMap = false;
    if (performance.now() - state.inputData.lastMouseDownTime < INPUT_CONSIDERED_CLICK_MAX_TIME) {
        const boundingRect = state.canvas.getBoundingClientRect();
        const relativMouseX = event.clientX - boundingRect.left;
        const relativMouseY = event.clientY - boundingRect.top;
        if (isClickInsideMapRelativ(relativMouseX, relativMouseY, state.paintData.map)) {
            for (let citizen of state.map.citizens) {
                if (isObjectClicked(citizen.position, 40, relativMouseX, relativMouseY, state)) {
                    state.inputData.selected = {
                        object: citizen,
                        type: "citizen"
                    }
                    state.paintData.map.lockCameraToSelected = true;
                    return;
                }
            }
            for (let building of state.map.buildings) {
                if (isObjectClicked(building.position, 60, relativMouseX, relativMouseY, state)) {
                    state.inputData.selected = {
                        object: building,
                        type: "building"
                    }
                    return;
                }
            }
            for (let tree of state.map.trees) {
                if (isObjectClicked(tree.position, 60, relativMouseX, relativMouseY, state)) {
                    state.inputData.selected = {
                        object: tree,
                        type: "tree"
                    }
                    return;
                }
            }
            for (let mushroom of state.map.mushrooms) {
                if (isObjectClicked(mushroom.position, 20, relativMouseX, relativMouseY, state)) {
                    state.inputData.selected = {
                        object: mushroom,
                        type: "mushroom"
                    }
                    return;
                }
            }
            state.inputData.selected = undefined;
        }
    }
}

function isClickInsideMapRelativ(relativMouseX: number, relativMouseY: number, paintDataMap: PaintDataMap) {
    return relativMouseX >= paintDataMap.paintOffset.x && relativMouseX <= paintDataMap.paintOffset.x + paintDataMap.paintWidth
        && relativMouseY >= paintDataMap.paintOffset.y && relativMouseY <= paintDataMap.paintOffset.y + paintDataMap.paintHeight;
}

function isClickInsideMap(clientX: number, clientY: number, state: ChatSimState) {
    const paintDataMap = state.paintData.map;
    const boundingRect = state.canvas.getBoundingClientRect();
    const relativMouseX = clientX - boundingRect.left;
    const relativMouseY = clientY - boundingRect.top;

    return relativMouseX >= paintDataMap.paintOffset.x && relativMouseX <= paintDataMap.paintOffset.x + paintDataMap.paintWidth
        && relativMouseY >= paintDataMap.paintOffset.y && relativMouseY <= paintDataMap.paintOffset.y + paintDataMap.paintHeight;
}

function isObjectClicked(objectPosition: Position, objectSize: number, relativMouseX: number, relativMouseY: number, state: ChatSimState): boolean {
    const paintDataMap = state.paintData.map;
    const translateX = paintDataMap.paintOffset.x + paintDataMap.paintWidth / 2;
    const translateY = paintDataMap.paintOffset.y + paintDataMap.paintHeight / 2;

    const citizenPaintPosition = mapPositionToPaintPosition(objectPosition, paintDataMap);
    const citizenPaintPositionWithZoom = {
        x: translateX - (translateX - citizenPaintPosition.x) * paintDataMap.zoom,
        y: translateY - (translateY - citizenPaintPosition.y) * paintDataMap.zoom,
    }
    const citizenPaintSizeHalved = objectSize / 2 * paintDataMap.zoom;
    const objectClicked = relativMouseX >= citizenPaintPositionWithZoom.x - citizenPaintSizeHalved
        && relativMouseX <= citizenPaintPositionWithZoom.x + citizenPaintSizeHalved
        && relativMouseY >= citizenPaintPositionWithZoom.y - citizenPaintSizeHalved
        && relativMouseY <= citizenPaintPositionWithZoom.y + citizenPaintSizeHalved;
    return objectClicked;
}

function mouseMove(event: MouseEvent, state: ChatSimState) {
    const mightBeAClick = performance.now() - state.inputData.lastMouseDownTime < INPUT_CONSIDERED_CLICK_MAX_TIME;
    const movedEnoughToNoBeAClick = calculateDistance(state.inputData.lastMouseDownPosition, { x: event.clientX, y: event.clientY }) >= INPUT_CONSIDERED_MIN_MOVING_DISTANCE;
    if (state.inputData.map.mouseMoveMap && (!mightBeAClick || movedEnoughToNoBeAClick)) {
        moveMapCameraBy(-event.movementX, -event.movementY, state);
    }
}

function mouseWheel(event: WheelEvent, state: ChatSimState) {
    if (!isClickInsideMap(event.clientX, event.clientY, state)) return;
    const zoomFactor = 0.2;
    const maxZoom = 10;
    const minZoom = 0.1;
    event.preventDefault();
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
    const speedScaling = 0.2;
    switch (event.code) {
        case "Period":
            if (state.gameSpeed !== 0) {
                state.gameSpeed *= 1 + speedScaling;
                if (state.gameSpeed > 10 || Math.abs(state.gameSpeed - 1) < speedScaling / 2) state.gameSpeed = Math.round(state.gameSpeed);
            } else {
                state.gameSpeed = 1;
            }
            break;
        case "Comma":
            state.gameSpeed /= 1 + speedScaling;
            if (state.gameSpeed > 10 || Math.abs(state.gameSpeed - 1) < speedScaling / 2) state.gameSpeed = Math.round(state.gameSpeed);
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
        case "NumpadAdd":
            if (state.gameSpeed === 0) chatSimTick(state);
            break;
        case "KeyK":
            state.gameSpeed = 0;
            console.log(state);
            break;
        case "KeyM":
            addCitizen("TestCitizen" + Math.floor(Math.random() * 1000), state);
            break
        default:
            console.log(event.key, event.code);
            break;
    }
}
