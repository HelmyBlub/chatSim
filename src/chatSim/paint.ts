import { drawTextWithOutline } from "../drawHelper.js";
import { ChatSimState, Position } from "./chatSimModels.js";
import { UiRectangle, UiRectangleTab } from "./rectangle.js";
import { mapChunkKeyToPosition, mapCanvasPositionToMapPosition, MapChunk, mapChunkXyToChunkKey, mapPositionToChunkXy, PaintDataMap } from "./map/map.js";
import { Building, BuildingMarket } from "./map/mapObjectBuilding.js";
import { Citizen, paintCititzenSpeechBubbles, paintCitizenComplete, paintCitizens, paintSelectionBox } from "./citizen.js";
import { MUSHROOM_FOOD_VALUE } from "./citizenNeeds/citizenNeedFood.js";
import { getTimeOfDay, getTimeAndDayString, getTimeOfDayString, getDay, uiButtonsResetPosition } from "./main.js";
import { Tree } from "./map/mapObjectTree.js";
import { CITIZEN_TRAIT_FUNCTIONS } from "./traits/trait.js";
import { mapPaintChunkObjects } from "./map/mapObject.js";
import { Mushroom } from "./map/mapObjectMushroom.js";

export const PAINT_LAYER_CITIZEN_AFTER_HOUSES = 2;
export const PAINT_LAYER_CITIZEN_BEFORE_HOUSES = 1;

export function paintChatSim(state: ChatSimState, gameSpeed: number) {
    if (!state.canvas) return;
    const ctx = state.canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    if (state.paintData.map.lockCameraToSelected && state.inputData.selected) {
        const position = state.inputData.selected.object.position as Position;
        state.paintData.map.cameraPosition = { x: position.x, y: position.y };
    }
    paintMap(ctx, state, state.paintData.map);
    paintMapBorder(ctx, state.paintData.map);
    paintUiRectangleData(ctx, state);
    paintData(ctx, state, gameSpeed);
    paintButtons(ctx, state);
    paintChatMessageOptions(ctx, state, 1200, 500);
    paintChatterChangeLog(ctx, state);
}

export function mapPositionToPaintPosition(mapPosition: Position, paintDataMap: PaintDataMap): Position {
    return {
        x: mapPosition.x - paintDataMap.cameraPosition.x + paintDataMap.paintOffset.x + paintDataMap.paintWidth / 2,
        y: mapPosition.y - paintDataMap.cameraPosition.y + paintDataMap.paintOffset.y + paintDataMap.paintHeight / 2,
    };
}

function paintChatterChangeLog(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    const logData = state.inputData.chatterChangeLog;
    const fontSize = 20;
    ctx.font = `${fontSize}px Arial`;
    for (let i = 0; i < logData.log.length; i++) {
        const job = logData.log[i];
        if (job.time + 10000 < performance.now()) continue;
        drawTextWithOutline(ctx, job.message, 10, 30 + i * fontSize);
    }
}

function paintChatMessageOptions(ctx: CanvasRenderingContext2D, state: ChatSimState, paintX: number, paintY: number) {
    if (state.inputData.selected) return;
    const jobList = Object.keys(state.functionsCitizenJobs);
    let textLineCounter = 0;
    const fontSize = 16;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    ctx.fillText("Chat Commands:", paintX, paintY + fontSize * textLineCounter++);
    ctx.fillText("    !job <jobname>", paintX, paintY + fontSize * textLineCounter++);
    for (let i = 0; i < jobList.length; i++) {
        const job = jobList[i];
        ctx.fillText(`        ${job}`, paintX, paintY + fontSize * textLineCounter++);
    }
    const traitList = Object.keys(CITIZEN_TRAIT_FUNCTIONS);
    ctx.fillText("    !trait <trait>", paintX, paintY + fontSize * textLineCounter++);
    for (let i = 0; i < traitList.length; i++) {
        const trait = traitList[i];
        ctx.fillText(`        ${trait}`, paintX, paintY + fontSize * textLineCounter++);
    }
}

export function paintDataSetCurrenTab(uiTab: UiRectangleTab, rectUI: UiRectangle, fontSize: number = 20, padding: number = 5) {
    rectUI.currentTab = uiTab;
    rectUI.tabConntentRect = {
        topLeft: { x: rectUI.mainRect.topLeft.x, y: rectUI.mainRect.topLeft.y },
        height: rectUI.mainRect.height,
        width: rectUI.mainRect.width,
    }
    if (rectUI.heading) {
        rectUI.tabConntentRect.topLeft.y += fontSize + padding * 2;
    }
    if (rectUI.tabs.length > 1) {
        rectUI.tabConntentRect.topLeft.y += fontSize + padding * 2;
    }
}

function paintButtons(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    const buttons = state.paintData.buttons;
    for (let button of buttons) {
        ctx.globalAlpha = 0.5;
        if (!button.rect) {
            uiButtonsResetPosition(state);
        }
        const rect = button.rect!;
        ctx.fillStyle = "white";
        ctx.fillRect(rect.topLeft.x, rect.topLeft.y, rect.width, rect.height);
        ctx.beginPath();
        ctx.strokeStyle = "black";
        ctx.rect(rect.topLeft.x, rect.topLeft.y, rect.width, rect.height);
        ctx.stroke();
        ctx.globalAlpha = 1;
        if (button.paintIcon) button.paintIcon(ctx, rect);
    }
}

function paintUiRectangleData(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    const rectUI = state.paintData.displaySelected;
    if (!rectUI) return;
    const padding = 5;
    const fontSize = 20;
    if (rectUI.currentTab === undefined) {
        paintDataSetCurrenTab(rectUI.tabs[0], rectUI);
    }
    rectUI.mainRect.height = rectUI.tabConntentRect!.topLeft.y - rectUI.mainRect.topLeft.y + rectUI.tabConntentRect!.height;
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "white";
    const mainRect = rectUI.mainRect;
    ctx.fillRect(mainRect.topLeft.x, mainRect.topLeft.y, mainRect.width, mainRect.height);
    ctx.globalAlpha = 1;

    let tabY = mainRect.topLeft.y;
    ctx.font = `${fontSize}px Arial`
    if (rectUI.heading) {
        ctx.fillStyle = "black";
        const headingTextWidth = ctx.measureText(rectUI.heading).width;
        const centeredOffset = rectUI.mainRect.width / 2 - headingTextWidth / 2;
        ctx.fillText(rectUI.heading, rectUI.mainRect.topLeft.x + centeredOffset, rectUI.mainRect.topLeft.y + fontSize + padding);
        tabY += fontSize + padding * 2;
    }
    if (rectUI.tabs.length > 1) {
        let tabOffsetX = 0;
        for (let tab of rectUI.tabs) {
            if (tab.clickRect === undefined) {
                const textWidth = ctx.measureText(tab.name).width;
                tab.clickRect = {
                    topLeft: { x: mainRect.topLeft.x + tabOffsetX, y: tabY },
                    width: textWidth + padding * 2,
                    height: fontSize + padding * 2,
                }
            }
            if (tab === rectUI.currentTab) {
                ctx.fillStyle = "lightblue";
                ctx.fillRect(tab.clickRect.topLeft.x, tab.clickRect.topLeft.y, tab.clickRect.width, tab.clickRect.height);
            }
            ctx.beginPath();
            ctx.strokeStyle = "black";
            ctx.rect(tab.clickRect.topLeft.x, tab.clickRect.topLeft.y, tab.clickRect.width, tab.clickRect.height);
            ctx.stroke();
            ctx.fillStyle = "black";
            ctx.fillText(tab.name, tab.clickRect.topLeft.x + padding, tab.clickRect.topLeft.y + fontSize + padding);
            tabOffsetX += tab.clickRect.width + 5;
        }
    }

    rectUI.currentTab!.paint(ctx, rectUI.tabConntentRect!, state);
}

function paintMap(ctx: CanvasRenderingContext2D, state: ChatSimState, paintDataMap: PaintDataMap) {
    ctx.fillStyle = "black";
    ctx.fillRect(paintDataMap.paintOffset.x, paintDataMap.paintOffset.y, paintDataMap.paintWidth, paintDataMap.paintHeight);
    const clipPath = new Path2D();
    clipPath.rect(paintDataMap.paintOffset.x, paintDataMap.paintOffset.y, paintDataMap.paintWidth, paintDataMap.paintHeight)
    ctx.save();
    ctx.clip(clipPath);
    const translateX = paintDataMap.paintOffset.x + paintDataMap.paintWidth / 2;
    const translateY = paintDataMap.paintOffset.y + paintDataMap.paintHeight / 2;
    ctx.translate(translateX, translateY);
    ctx.scale(paintDataMap.zoom, paintDataMap.zoom);
    ctx.translate(-translateX, -translateY);

    ctx.fillStyle = "green";
    for (let chunkKey of state.map.mapChunks.keys()) {
        const chunkTopLeft = mapChunkKeyToPosition(chunkKey, state.map);
        if (!chunkTopLeft) continue;
        const chunk = state.map.mapChunks.get(chunkKey)!;
        const chunkWidth = chunk.tilesHorizontal * state.map.tileSize + 1 / paintDataMap.zoom;
        const chunkHeight = chunk.tilesVertical * state.map.tileSize + 1 / paintDataMap.zoom;
        const paintMapTopLeft = mapPositionToPaintPosition(chunkTopLeft, paintDataMap);
        ctx.fillRect(paintMapTopLeft.x, paintMapTopLeft.y, chunkWidth, chunkHeight);
    }
    const chunksToPaint = getChunksToPaint(state);
    mapPaintChunkObjects(ctx, chunksToPaint, paintDataMap, state);
    paintCitizens(ctx, state, PAINT_LAYER_CITIZEN_BEFORE_HOUSES);
    paintSelectionBox(ctx, state);
    paintCitizens(ctx, state, PAINT_LAYER_CITIZEN_AFTER_HOUSES);
    paintCititzenSpeechBubbles(ctx, state);
    if (state.inputData.selected && state.inputData.selected.type === "citizen") {
        const citizen = state.inputData.selected.object as Citizen;
        paintCitizenComplete(ctx, citizen, state);
    }

    ctx.restore();

    //paint night darkness
    const timeOfDay = getTimeOfDay(state.time, state);
    const transitionTime = 0.05;

    if (state.map.lightPerCent < 1) {
        ctx.fillStyle = "black";
        ctx.globalAlpha = 1 - state.map.lightPerCent;
        ctx.fillRect(paintDataMap.paintOffset.x, paintDataMap.paintOffset.y, paintDataMap.paintWidth, paintDataMap.paintHeight);
        ctx.globalAlpha = 1;
    }
}

function getChunksToPaint(state: ChatSimState): MapChunk[] {
    const chunksToPaint: MapChunk[] = [];
    const mapPaintData = state.paintData.map;
    const topLeftMap = mapCanvasPositionToMapPosition({ x: 0, y: 0 }, mapPaintData);
    const chunkXY = mapPositionToChunkXy(topLeftMap, state.map);
    const chunkSize = state.map.tileSize * state.map.defaultChunkLength;
    const horizontalChunks = 1 + mapPaintData.paintWidth / mapPaintData.zoom / chunkSize;
    const verticalChunks = 1 + mapPaintData.paintHeight / mapPaintData.zoom / chunkSize;
    for (let x = 0; x < horizontalChunks; x++) {
        for (let y = 0; y < verticalChunks; y++) {
            const chunkKey = mapChunkXyToChunkKey(chunkXY.chunkX + x, chunkXY.chunkY + y);
            const chunk = state.map.mapChunks.get(chunkKey);
            if (chunk) chunksToPaint.push(chunk);
        }
    }

    return chunksToPaint;
}

function paintMapBorder(ctx: CanvasRenderingContext2D, paintDataMap: PaintDataMap) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(paintDataMap.paintOffset.x, paintDataMap.paintOffset.y, paintDataMap.paintWidth, paintDataMap.paintHeight);
    ctx.stroke();
}

function paintData(ctx: CanvasRenderingContext2D, state: ChatSimState, gameSpeed: number) {
    const fontSize = 20;
    ctx.font = `${fontSize}px Arial`;
    const displayTexts = [
        getTimeOfDayString(state.time, state),
        "Day: " + getDay(state),
        "Citizen: " + state.map.citizens.length,
        "Speed:" + gameSpeed.toFixed(2),
        "Steal: " + state.stealCounter,
    ];

    const margin = 5;
    const padding = 5;
    let xOffset = margin + padding;
    let yOffset = fontSize + margin + padding;
    for (let text of displayTexts) {
        const textWidth = ctx.measureText(text).width;
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = "white";
        ctx.fillRect(xOffset - padding, yOffset - fontSize - padding, textWidth + padding * 2, fontSize + padding * 2);
        ctx.globalAlpha = 1;
        ctx.fillStyle = "black";
        ctx.fillText(text, xOffset, yOffset - 1);
        xOffset += ctx.measureText(text).width + margin + padding * 2;
    }
}
