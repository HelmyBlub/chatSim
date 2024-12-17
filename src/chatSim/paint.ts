import { drawTextWithOutline, IMAGE_PATH_MUSHROOM } from "../drawHelper.js";
import { ChatSimState, Mushroom, Position } from "./chatSimModels.js";
import { ChatSimMap, chunkKeyToPosition, mapCanvasPositionToMapPosition, MapChunk, mapChunkXyToChunkKey, mapPositionToChunkXy, PaintDataMap } from "./map.js";
import { Building, BuildingMarket, paintBuildings } from "./building.js";
import { Citizen, paintCititzenSpeechBubbles, paintCitizenComplete, paintCitizens, paintSelectionBox } from "./citizen.js";
import { MUSHROOM_FOOD_VALUE } from "./citizenNeeds/citizenNeedFood.js";
import { IMAGES } from "./images.js";
import { getTimeOfDay, getTimeOfDayString } from "./main.js";
import { paintTrees, Tree } from "./tree.js";
import { CITIZEN_TRAIT_FUNCTIONS } from "./traits/trait.js";

export const PAINT_LAYER_CITIZEN_AFTER_HOUSES = 2;
export const PAINT_LAYER_CITIZEN_BEFORE_HOUSES = 1;

export function paintChatSim(state: ChatSimState, gameSpeed: number) {
    if (!state.canvas) return;
    const ctx = state.canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    paintMap(ctx, state, state.paintData.map);
    paintMapBorder(ctx, state.paintData.map);
    paintSelectedData(ctx, state);
    paintData(ctx, state, gameSpeed);
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

function paintSelectedData(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    const selected = state.inputData.selected;
    if (!selected) return;
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    const offsetX = state.paintData.map.paintWidth + 20;
    const offsetY = 50;
    let lineCounter = 0;
    const lineSpacing = 25;
    if (selected.type === "citizen") {
        const citizen: Citizen = selected.object;
        ctx.fillText(`Citizen: ${citizen.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
        if (citizen.isDead) {
            ctx.fillText(`    Death Reason: ${citizen.isDead.reason}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
        if (citizen.dreamJob) {
            ctx.fillText(`    Dream Job: ${citizen.dreamJob}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
        ctx.fillText(`    Food: ${(citizen.foodPerCent * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Energy: ${(citizen.energyPerCent * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Money: $${(citizen.money).toFixed()}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Job: ${citizen.job.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    State: ${citizen.stateInfo.type}`, offsetX, offsetY + lineSpacing * lineCounter++);
        if (citizen.stateInfo.stack.length > 0) {
            ctx.fillText(`        ${citizen.stateInfo.stack[0].state}`, offsetX, offsetY + lineSpacing * lineCounter++);
            if (citizen.stateInfo.stack[0].subState) ctx.fillText(`            ${citizen.stateInfo.stack[0].subState}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
        if (citizen.traitsData.traits.length > 0) {
            ctx.fillText(`    Traits:`, offsetX, offsetY + lineSpacing * lineCounter++);
            for (let trait of citizen.traitsData.traits) {
                ctx.fillText(`        ${trait}`, offsetX, offsetY + lineSpacing * lineCounter++);
            }
        }
        ctx.fillText(`    Inventory:`, offsetX, offsetY + lineSpacing * lineCounter++);
        for (let item of citizen.inventory.items) {
            ctx.fillText(`        ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
        if (citizen.home) {
            ctx.fillText(`    Home Inventory:`, offsetX, offsetY + lineSpacing * lineCounter++);
            for (let item of citizen.home.inventory.items) {
                ctx.fillText(`        ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
            }
        }
        if (citizen.log.length > 0) {
            ctx.fillText(`    Action Log:`, offsetX, offsetY + lineSpacing * lineCounter++);
            for (let i = 0; i < Math.min(14, citizen.log.length); i++) {
                const logEntry = citizen.log[i];
                const time = getTimeOfDayString(logEntry.time, state);
                ctx.fillText(`        ${time}, ${logEntry.message}`, offsetX, offsetY + lineSpacing * lineCounter++);
            }
        }
    } else if (selected.type === "building") {
        const building: Building = selected.object;
        ctx.fillText(`Building: ${building.type}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Owner: ${building.owner.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
        if (building.inhabitedBy !== undefined) ctx.fillText(`    Inhabited by: ${building.inhabitedBy.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
        if (building.buildProgress !== undefined) ctx.fillText(`    Build Progress: ${(building.buildProgress * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Deterioration: ${(building.deterioration * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Inventory:`, offsetX, offsetY + lineSpacing * lineCounter++);
        for (let item of building.inventory.items) {
            ctx.fillText(`        ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
        if (building.type === "Market") {
            const market = building as BuildingMarket;
            ctx.fillText(`    Counter:`, offsetX, offsetY + lineSpacing * lineCounter++);
            ctx.fillText(`        money: ${market.counter.money}`, offsetX, offsetY + lineSpacing * lineCounter++);
            ctx.fillText(`        items:`, offsetX, offsetY + lineSpacing * lineCounter++);
            for (let item of market.counter.items) {
                ctx.fillText(`            ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
            }
        }
    } else if (selected.type === "tree") {
        const tree: Tree = selected.object;
        ctx.fillText(`Tree:`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    wood: ${tree.woodValue}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    trunkDamage: ${(tree.trunkDamagePerCent * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
    } else if (selected.type === "mushroom") {
        const mushroom: Mushroom = selected.object;
        ctx.fillText(`Mushroom:`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    foodValue: ${MUSHROOM_FOOD_VALUE}`, offsetX, offsetY + lineSpacing * lineCounter++);
    }
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
    const chunkKeys = Object.keys(state.map.mapChunks);
    for (let chunkKey of chunkKeys) {
        const chunkTopLeft = chunkKeyToPosition(chunkKey, state.map);
        if (!chunkTopLeft) continue;
        const chunk = state.map.mapChunks[chunkKey];
        const chunkWidth = chunk.tilesHorizontal * state.map.tileSize + 1 / paintDataMap.zoom;
        const chunkHeight = chunk.tilesVertical * state.map.tileSize + 1 / paintDataMap.zoom;
        const paintMapTopLeft = mapPositionToPaintPosition(chunkTopLeft, paintDataMap);
        ctx.fillRect(paintMapTopLeft.x, paintMapTopLeft.y, chunkWidth, chunkHeight);
    }
    const chunksToPaint = getChunksToPaint(state);
    paintMushrooms(ctx, paintDataMap, chunksToPaint, state);
    paintTrees(ctx, paintDataMap, chunksToPaint, state);
    paintCitizens(ctx, state, PAINT_LAYER_CITIZEN_BEFORE_HOUSES);
    paintBuildings(ctx, chunksToPaint, state);
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

    if (timeOfDay < state.sunriseAt + transitionTime || timeOfDay > state.sunsetAt - transitionTime) {
        const nightAlpha = 0.55;
        let transitionAlpha = nightAlpha;
        if (Math.abs(state.sunriseAt - timeOfDay + transitionTime) < transitionTime) {
            transitionAlpha *= (state.sunriseAt - timeOfDay + transitionTime) / transitionTime;
        } else if (Math.abs(state.sunsetAt - timeOfDay - transitionTime) < transitionTime) {
            transitionAlpha *= (timeOfDay - state.sunsetAt + transitionTime) / transitionTime;
        }
        ctx.fillStyle = "black";
        ctx.globalAlpha = transitionAlpha;
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
            const chunk = state.map.mapChunks[chunkKey];
            if (chunk) chunksToPaint.push(chunk);
        }
    }

    return chunksToPaint;
}

function paintMushrooms(ctx: CanvasRenderingContext2D, paintDataMap: PaintDataMap, chunksToPaint: MapChunk[], state: ChatSimState) {
    for (let chunk of chunksToPaint) {
        const mushroomPaintSize = 30;
        const mushroomImage = IMAGES[IMAGE_PATH_MUSHROOM];
        for (let mushroom of chunk.mushrooms) {
            const paintPos = mapPositionToPaintPosition(mushroom.position, paintDataMap);
            ctx.drawImage(mushroomImage, 0, 0, 200, 200,
                paintPos.x - mushroomPaintSize / 2,
                paintPos.y - mushroomPaintSize / 2,
                mushroomPaintSize, mushroomPaintSize);
        }
    }
}

function paintMapBorder(ctx: CanvasRenderingContext2D, paintDataMap: PaintDataMap) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.rect(paintDataMap.paintOffset.x, paintDataMap.paintOffset.y, paintDataMap.paintWidth, paintDataMap.paintHeight);
    ctx.stroke();
}

function paintData(ctx: CanvasRenderingContext2D, state: ChatSimState, gameSpeed: number) {
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    const offsetX = state.paintData.map.paintWidth + 20;
    const citizenCounter = state.map.citizens.length;
    ctx.fillText(`${getTimeOfDayString(state.time, state)}, speed: ${gameSpeed.toFixed(2)},     zoom:${state.paintData.map.zoom.toFixed(2)}, citizens: ${citizenCounter}`, offsetX, 25);
    if (state.inputData.selected === undefined) {
        for (let i = 0; i < Math.min(20, state.map.citizens.length); i++) {
            const citizen = state.map.citizens[i];
            ctx.fillText(`${citizen.name}`, offsetX, 45 + 20 * i);
            ctx.fillText(`$${citizen.money}`, offsetX + 240, 45 + 20 * i);
            ctx.fillText(`job:${citizen.job.name}`, offsetX + 300, 45 + 20 * i);
        }
    }
}
