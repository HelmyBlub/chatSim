import { App, ChatSimState, Position } from "./chatSimModels.js";
import { PaintDataMap } from "./map.js";
import { addCitizen } from "./citizen.js";
import { calculateDistance } from "./main.js";
import { mapPositionToPaintPosition } from "./paint.js";
import { startTests, stopTests } from "./test/test.js";
import { chatSimTick } from "./tick.js";

const INPUT_CONSIDERED_CLICK_MAX_TIME = 200;
const INPUT_CONSIDERED_MIN_MOVING_DISTANCE = 20;

export function chatSimAddInputEventListeners(app: App, canvas: HTMLCanvasElement) {
    window.addEventListener('resize', (e) => fitCanvasToWindow(canvas), false);
    document.addEventListener('keydown', (e) => keyDown(e, app));
    document.addEventListener('keyup', (e) => keyUp(e, app.state));
    canvas.addEventListener('wheel', (e) => mouseWheel(e, app.state));
    canvas.addEventListener('mousedown', (e) => mouseDown(e, app.state));
    canvas.addEventListener('mouseup', (e) => mouseUp(e, app.state));
    canvas.addEventListener('mousemove', (e) => mouseMove(e, app.state));
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

function fitCanvasToWindow(canvas: HTMLCanvasElement) {
    canvas.width = window.innerWidth - 10;
    canvas.height = window.innerHeight - 10;
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
    if (!state.canvas) return;
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
    if (!state.canvas) return;
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

function keyDown(event: KeyboardEvent, app: App) {
    const state = app.state;
    const moveTickAmount = 4;
    const speedScaling = 0.2;
    switch (event.code) {
        case "Period":
            if (app.gameSpeed !== 0) {
                app.gameSpeed *= 1 + speedScaling;
                if (app.gameSpeed > 10 || Math.abs(app.gameSpeed - 1) < speedScaling / 2) app.gameSpeed = Math.round(app.gameSpeed);
            } else {
                app.gameSpeed = 1;
            }
            break;
        case "Comma":
            app.gameSpeed /= 1 + speedScaling;
            if (app.gameSpeed > 10 || Math.abs(app.gameSpeed - 1) < speedScaling / 2) app.gameSpeed = Math.round(app.gameSpeed);
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
            if (app.gameSpeed === 0) chatSimTick(state);
            break;
        case "KeyK":
            app.gameSpeed = 0;
            console.log(state);
            break;
        case "KeyM":
            addCitizen("TestCitizen" + Math.floor(Math.random() * 1000), state);
            break
        case "KeyT":
            startTests(app);
            break;
        case "KeyU":
            if (app.runningTests) {
                stopTests(app);
            } else {
                startTests(app, true);
            }
            break;
        default:
            console.log(event.key, event.code);
            break;
    }
}
