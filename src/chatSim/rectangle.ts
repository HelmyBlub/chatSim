import { ChatSimState, Position } from "./chatSimModels.js";
import { MAP_OBJECTS_FUNCTIONS } from "./map/mapObject.js";
import { paintDataSetCurrenTab } from "./paint.js";

export type Rectangle = {
    topLeft: Position,
    width: number,
    height: number,
}

export type UiRectangle = {
    mainRect: Rectangle,
    tabs: UiRectangleTab[],
    heading?: string,
    currentTab?: UiRectangleTab,
    tabConntentRect?: Rectangle,
    data?: any,
}

export type UiButton = {
    rect?: Rectangle,
    paintIcon?: (ctx: CanvasRenderingContext2D, rect: Rectangle) => void,
    clicked: (state: ChatSimState) => void,
}

export type UiRectangleTab = {
    name: string,
    paint: (ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) => void,
    click?: (relativeMouseToCanvas: Position, rect: Rectangle, state: ChatSimState) => void,
    onSelect?: (tabName: string, state: ChatSimState) => void,
    clickRect?: Rectangle,
}

export function rectangleClickedInside(relativeMouseToCanvas: Position, rect: Rectangle | undefined): boolean {
    if (!rect) return false;
    return rect.topLeft.x <= relativeMouseToCanvas.x && rect.topLeft.x + rect.width >= relativeMouseToCanvas.x
        && rect.topLeft.y <= relativeMouseToCanvas.y && rect.topLeft.y + rect.height >= relativeMouseToCanvas.y;
}

export function rectangleCreateSelectedUi(state: ChatSimState) {
    const selected = state.inputData.selected;
    if (selected === undefined) {
        state.paintData.currentUiRectangle = undefined;
        return;
    }
    const mapObjectFunctions = MAP_OBJECTS_FUNCTIONS[selected.type];
    if (mapObjectFunctions && mapObjectFunctions.createSelectionData) {
        const oldDisplay = state.paintData.currentUiRectangle;
        state.paintData.currentUiRectangle = mapObjectFunctions.createSelectionData(state);
        if (oldDisplay && oldDisplay.currentTab) {
            const selectByTabName = oldDisplay.currentTab.name;
            const currentTab = state.paintData.currentUiRectangle.tabs.find(t => t.name === selectByTabName);
            if (currentTab) paintDataSetCurrenTab(currentTab, state.paintData.currentUiRectangle);
        }
    } else {
        state.paintData.currentUiRectangle = undefined;
    }
}


export function rectanglePaint(ctx: CanvasRenderingContext2D, rect: Rectangle, fillColor?: string, text?: { text: string, fontSize: number, padding: number }) {
    if (fillColor) {
        ctx.fillStyle = fillColor;
        ctx.fillRect(rect.topLeft.x, rect.topLeft.y, rect.width, rect.height);
    }
    ctx.beginPath();
    ctx.strokeStyle = "black";
    ctx.rect(rect.topLeft.x, rect.topLeft.y, rect.width, rect.height);
    ctx.stroke();
    ctx.fillStyle = "black";
    if (text) {
        ctx.fillText(text.text, rect.topLeft.x + text.padding, rect.topLeft.y + text.fontSize + text.padding);
    }
}

export function rectangleClickedUi(relativeMouseToCanvas: Position, state: ChatSimState): boolean {
    if (!state.paintData.currentUiRectangle) return false;
    const rect = state.paintData.currentUiRectangle.mainRect;
    if (!rectangleClickedInside(relativeMouseToCanvas, rect)) return false;

    for (let tab of state.paintData.currentUiRectangle.tabs) {
        if (rectangleClickedInside(relativeMouseToCanvas, tab.clickRect)) {
            if (tab.onSelect) tab.onSelect(tab.name, state);
            state.paintData.currentUiRectangle.currentTab = tab;
            return true;
        }
    }
    clickedUiTabContentRectangle(relativeMouseToCanvas, state);
    return true;
}

function clickedUiTabContentRectangle(relativeMouseToCanvas: Position, state: ChatSimState): boolean {
    const rect = state.paintData.currentUiRectangle?.tabConntentRect;
    if (rect && rectangleClickedInside(relativeMouseToCanvas, rect)) {
        const currentTab = state.paintData.currentUiRectangle?.currentTab;
        if (currentTab && currentTab.click) currentTab.click(relativeMouseToCanvas, rect, state);
        return true;
    }
    return false;
}

