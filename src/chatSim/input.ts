import { App, ChatSimState, Position, SelectedObject } from "./chatSimModels.js";
import { rectangleClickedUi, rectangleCreateSelectedUi, UiRectangle } from "./rectangle.js";
import { mapCanvasPositionToMapPosition, mapGetChunkForPosition, mapIsPositionVisible, PaintDataMap } from "./map/map.js";
import { addCitizen } from "./map/citizen.js";
import { addChatterChangeLog, calculateDistance, uiButtonsResetPosition } from "./main.js";
import { mapPositionToPaintPosition } from "./paint.js";
import { startTests, stopTests } from "./test/test.js";
import { chatSimTick } from "./tick.js";
import { MAP_OBJECT_TREE, Tree } from "./map/mapObjectTree.js";
import { MAP_OBJECT_BUILDING } from "./map/mapObjectBuilding.js";
import { MAP_OBJECT_MUSHROOM } from "./map/mapObjectMushroom.js";
import { MapObject } from "./map/mapObject.js";
import { rectangleClickedInside } from "./rectangle.js";
import { MAP_OBJECT_FARM_TILE } from "./map/mapObjectFarmTile.js";

const INPUT_CONSIDERED_CLICK_MAX_TIME = 200;
const INPUT_CONSIDERED_MIN_MOVING_DISTANCE = 20;

export function chatSimAddInputEventListeners(app: App, canvas: HTMLCanvasElement) {
    window.addEventListener('resize', (e) => fitCanvasToWindow(canvas, app.state), false);
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
    const maxLeft = state.map.maxLeft;
    const maxRight = maxLeft + state.map.width;
    if (paintDataMap.cameraPosition.x < maxLeft) {
        paintDataMap.cameraPosition.x = maxLeft;
    } else if (paintDataMap.cameraPosition.x > maxRight) {
        paintDataMap.cameraPosition.x = maxRight;
    }

    const maxTop = state.map.maxTop;
    const maxBottom = maxTop + state.map.height;
    if (paintDataMap.cameraPosition.y < maxTop) {
        paintDataMap.cameraPosition.y = maxTop;
    } else if (paintDataMap.cameraPosition.y > maxBottom) {
        paintDataMap.cameraPosition.y = maxBottom;
    }
    state.paintData.map.lockCameraToSelected = false;
}

export function selectMapObject(selectedObject: SelectedObject | undefined, state: ChatSimState) {
    if (selectedObject) {
        state.inputData.selected = selectedObject;
        if (selectedObject.type === "citizen") {
            state.paintData.map.lockCameraToSelected = true;
        } else {
            state.paintData.map.lockCameraToSelected = false;
        }
        return;
    }
    state.inputData.selected = undefined;
}

export function inputMouseClientPositionToRelativeCanvasPosition(mouseClientPos: Position, canvas: HTMLCanvasElement): Position {
    const boundingRect = canvas.getBoundingClientRect();
    return {
        x: mouseClientPos.x - boundingRect.left,
        y: mouseClientPos.y - boundingRect.top,
    }
}

function fitCanvasToWindow(canvas: HTMLCanvasElement, state: ChatSimState) {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    state.paintData.map.paintWidth = window.innerWidth;
    state.paintData.map.paintHeight = window.innerHeight;
    uiButtonsResetPosition(state);
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
        const relativeMouse = inputMouseClientPositionToRelativeCanvasPosition({ x: event.clientX, y: event.clientY }, state.canvas);
        if (!rectangleClickedUi(relativeMouse, state) && !clickedUiButton(relativeMouse, state)) {
            selectObject(relativeMouse, state);
            rectangleCreateSelectedUi(state);
        }
    }
}

function clickedUiButton(relativeMouseToCanvas: Position, state: ChatSimState): boolean {
    for (let button of state.paintData.buttons) {
        if (!button.rect) continue;
        const rect = button.rect;
        if (!rectangleClickedInside(relativeMouseToCanvas, rect)) continue;
        button.clicked(state);
        return true;
    }
    return false;
}

function selectObject(relativeMouseToCanvas: Position, state: ChatSimState) {
    if (isClickInsideMapRelative(relativeMouseToCanvas.x, relativeMouseToCanvas.y, state.paintData.map)) {
        const mapClickPosition = mapCanvasPositionToMapPosition(relativeMouseToCanvas, state.paintData.map);
        const chunk = mapGetChunkForPosition(mapClickPosition, state.map);
        if (!chunk) return;
        let closest: SelectedObject | undefined = undefined;
        let closestDistance = 0;
        let toCheckObjects = [
            { objects: state.map.citizens, type: "citizen", size: 40 },
            { objects: chunk.tileObjects.get(MAP_OBJECT_BUILDING), size: 60 },
            { objects: chunk.tileObjects.get(MAP_OBJECT_TREE), size: 60 },
            { objects: chunk.tileObjects.get(MAP_OBJECT_MUSHROOM), size: 30 },
            { objects: chunk.tileObjects.get(MAP_OBJECT_FARM_TILE), size: 60 },
        ];

        for (let toCheck of toCheckObjects) {
            const closestObject = getClosestObject(toCheck.objects, toCheck.size, relativeMouseToCanvas, state);
            if (closestObject) {
                if (closest === undefined || closestObject.distance < closestDistance) {
                    closest = {
                        object: closestObject.object,
                        type: toCheck.type ?? (closestObject.object as MapObject).type,
                    }
                    closestDistance = closestObject.distance;
                }
            }
        }
        selectMapObject(closest, state);
    }
}

function getClosestObject(objects: { position: Position }[] | undefined, size: number, relativeClickPosition: Position, state: ChatSimState): { object: any, distance: number } | undefined {
    if (objects === undefined) return;
    let closest = undefined;
    let closestDistance = 0;
    const mapClickPosition = mapCanvasPositionToMapPosition(relativeClickPosition, state.paintData.map);
    for (let object of objects) {
        if (isObjectClicked(object.position, size, relativeClickPosition.x, relativeClickPosition.y, state)) {
            if (closest === undefined) {
                closest = object;
                closestDistance = calculateDistance(object.position, mapClickPosition);
            } else {
                const distance = calculateDistance(object.position, mapClickPosition);
                if (distance < closestDistance) {
                    closest = object;
                    closestDistance = distance;
                }
            }
        }
    }
    if (closest) {
        return { object: closest, distance: closestDistance };
    }
    return undefined;
}

function isClickInsideMapRelative(relativMouseX: number, relativMouseY: number, paintDataMap: PaintDataMap) {
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
    state.inputData.mousePosition.x = event.clientX;
    state.inputData.mousePosition.y = event.clientY;
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
    const relativeCanvasMap = browserWindowPositionToCanvasMapPosition({ x: event.clientX, y: event.clientY }, state.canvas, state.paintData.map);
    const previouseMouseMapPosition = mapCanvasPositionToMapPosition(relativeCanvasMap, state.paintData.map);
    state.paintData.map.zoom *= event.deltaY < 0 ? 1 + zoomFactor : 1 / (1 + zoomFactor);
    if (Math.abs(1 - state.paintData.map.zoom) < zoomFactor * (1 - zoomFactor)) state.paintData.map.zoom = 1;
    if (state.paintData.map.zoom > maxZoom) state.paintData.map.zoom = maxZoom;
    if (state.paintData.map.zoom < minZoom) state.paintData.map.zoom = minZoom;
    const newMouseMapPosition = mapCanvasPositionToMapPosition(relativeCanvasMap, state.paintData.map);
    state.paintData.map.cameraPosition.x += previouseMouseMapPosition.x - newMouseMapPosition.x;
    state.paintData.map.cameraPosition.y += previouseMouseMapPosition.y - newMouseMapPosition.y;
}

function browserWindowPositionToCanvasMapPosition(mousePosition: Position, canvas: HTMLCanvasElement | undefined, paintDataMap: PaintDataMap): Position {
    if (canvas === undefined) throw "should not happen";
    const boundingRect = canvas.getBoundingClientRect();
    return {
        x: mousePosition.x - boundingRect.left - paintDataMap.paintOffset.x,
        y: mousePosition.y - boundingRect.top - paintDataMap.paintOffset.y,
    }
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
    const moveAmount = 8;
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
            state.inputData.map.moveY = -moveAmount;
            break;
        case "KeyS":
            state.inputData.map.moveY = moveAmount;
            break;
        case "KeyA":
            state.inputData.map.moveX = -moveAmount;
            break;
        case "KeyD":
            state.inputData.map.moveX = moveAmount;
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
            for (let i = 0; i < 10; i++) {
                addChatterChangeLog("test" + i, state);
            }
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
        case "Tab":
            event.preventDefault();
            switchThroughVisibleCitizens(app.state);
            break;
        default:
            console.log(event.key, event.code);
            break;
    }
}

function switchThroughVisibleCitizens(state: ChatSimState) {
    let startIndex = 0;
    const selected = state.inputData.selected;
    if (selected && selected.type === "citizen") {
        startIndex = state.map.citizens.findIndex(c => c === selected.object) + 1;
        if (startIndex === -1) startIndex = 0;
    }
    for (let i = 0; i < state.map.citizens.length; i++) {
        const citizen = state.map.citizens[(i + startIndex) % state.map.citizens.length];
        if (mapIsPositionVisible(citizen.position, state.paintData.map)) {
            state.inputData.selected = {
                object: citizen,
                type: "citizen",
            };
            rectangleCreateSelectedUi(state);
            state.paintData.map.lockCameraToSelected = true;
            return;
        }
    }
}