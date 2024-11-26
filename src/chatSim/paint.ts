import { drawTextWithOutline, IMAGE_PATH_BUILDING_MARKET, IMAGE_PATH_CITIZEN_HOUSE, IMAGE_PATH_MUSHROOM, IMAGE_PATH_WOOD_PLANK } from "../drawHelper.js";
import { Building, ChatSimState, Mushroom, PaintDataMap, Position } from "./chatSimModels.js";
import { Citizen, paintCitizens, paintSelectionBox } from "./citizen.js";
import { MUSHROOM_FOOD_VALUE } from "./citizenNeeds/citizenNeedFood.js";
import { paintCitizenJobInventoryOnMarket } from "./jobs/job.js";
import { getTimeOfDay, getTimeOfDayString, INVENTORY_MUSHROOM, INVENTORY_WOOD } from "./main.js";
import { paintTrees, Tree } from "./tree.js";

export const PAINT_LAYER_CITIZEN_AFTER_HOUSES = 2;
export const PAINT_LAYER_CITIZEN_BEFORE_HOUSES = 1;

export function paintChatSim(state: ChatSimState) {
    const ctx = state.canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    paintMap(ctx, state, state.paintData.map);
    paintMapBorder(ctx, state.paintData.map);
    paintSelectedData(ctx, state);
    paintData(ctx, state);
}

export function mapPositionToPaintPosition(mapPosition: Position, paintDataMap: PaintDataMap): Position {
    return {
        x: Math.floor(mapPosition.x - paintDataMap.cameraPosition.x + paintDataMap.paintOffset.x + paintDataMap.paintWidth / 2),
        y: Math.floor(mapPosition.y - paintDataMap.cameraPosition.y + paintDataMap.paintOffset.y + paintDataMap.paintHeight / 2),
    };
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
        ctx.fillText(`    Food: ${(citizen.foodPerCent * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Energy: ${(citizen.energyPerCent * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Money: $${(citizen.money).toFixed()}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Job: ${citizen.job.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    State: ${citizen.stateInfo.type}`, offsetX, offsetY + lineSpacing * lineCounter++);
        if (citizen.stateInfo.stack.length > 0) ctx.fillText(`        ${citizen.stateInfo.stack[0].state}`, offsetX, offsetY + lineSpacing * lineCounter++);
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
            for (let i = 0; i < Math.min(5, citizen.log.length); i++) {
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
    const mapTopLeft = {
        x: -state.map.mapWidth / 2,
        y: -state.map.mapHeight / 2,
    };
    const paintMapTopLeft = mapPositionToPaintPosition(mapTopLeft, paintDataMap);
    ctx.fillRect(paintMapTopLeft.x, paintMapTopLeft.y, state.map.mapWidth, state.map.mapHeight);

    const mushroomPaintSize = 30;
    const mushroomImage = state.images[IMAGE_PATH_MUSHROOM];
    for (let mushroom of state.map.mushrooms) {
        const paintPos = mapPositionToPaintPosition(mushroom.position, paintDataMap);
        ctx.drawImage(mushroomImage, 0, 0, 200, 200,
            paintPos.x - mushroomPaintSize / 2,
            paintPos.y - mushroomPaintSize / 2,
            mushroomPaintSize, mushroomPaintSize);
    }
    paintTrees(ctx, paintDataMap, state);
    paintCitizens(ctx, state, PAINT_LAYER_CITIZEN_BEFORE_HOUSES);
    paintBuildings(ctx, state);
    paintSelectionBox(ctx, state);
    paintCitizens(ctx, state, PAINT_LAYER_CITIZEN_AFTER_HOUSES);
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

function paintBuildings(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    const citizenHouseImage = state.images[IMAGE_PATH_CITIZEN_HOUSE];
    const marketImage = state.images[IMAGE_PATH_BUILDING_MARKET];
    const buildingPaintSize = 80;
    const buildingImageSize = 200;
    const houseNameOffsetY = 90 * buildingPaintSize / buildingImageSize;
    const marketNameOffsetY = 181 * buildingPaintSize / buildingImageSize;
    const marketJobOffsetY = 161 * buildingPaintSize / buildingImageSize;
    ctx.font = "8px Arial";
    for (let building of state.map.buildings) {
        const paintPos = mapPositionToPaintPosition(building.position, state.paintData.map);
        let factor = (building.buildProgress !== undefined ? building.buildProgress : 1);
        const image = building.type === "House" ? citizenHouseImage : marketImage;
        ctx.drawImage(image, 0, buildingImageSize - buildingImageSize * factor, buildingImageSize, buildingImageSize * factor,
            paintPos.x - buildingPaintSize / 2,
            paintPos.y - buildingPaintSize / 2 + buildingPaintSize - buildingPaintSize * factor,
            buildingPaintSize, buildingPaintSize * factor);
        if (building.buildProgress !== undefined) {
            const wood = building.inventory.items.find(i => i.name === INVENTORY_WOOD);
            if (wood) {
                const woodPaintSize = 30;
                for (let i = 0; i < wood.counter; i++) {
                    const offsetY = buildingPaintSize / 2 - i * 2 - woodPaintSize;
                    ctx.drawImage(state.images[IMAGE_PATH_WOOD_PLANK], 0, 0, 200, 200,
                        paintPos.x,
                        paintPos.y + offsetY,
                        woodPaintSize, woodPaintSize);
                }
            }
        }
        if (building.inhabitedBy) {
            const nameOffsetX = Math.floor(ctx.measureText(building.inhabitedBy.name).width / 2);
            if (building.type === "House") {
                drawTextWithOutline(ctx, building.inhabitedBy.name, paintPos.x - nameOffsetX, paintPos.y - buildingPaintSize / 2 + houseNameOffsetY);
            } else if (building.type === "Market") {
                const jobOffsetX = Math.floor(ctx.measureText(building.inhabitedBy.job.name).width / 2);
                drawTextWithOutline(ctx, building.inhabitedBy.job.name, paintPos.x - jobOffsetX - 2, paintPos.y - buildingPaintSize / 2 + marketJobOffsetY);
                drawTextWithOutline(ctx, building.inhabitedBy.name, paintPos.x - nameOffsetX - 2, paintPos.y - buildingPaintSize / 2 + marketNameOffsetY);
                paintCitizenJobInventoryOnMarket(ctx, building.inhabitedBy, state);
            }
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

function paintData(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    ctx.font = "20px Arial";
    ctx.fillStyle = "black";
    const offsetX = state.paintData.map.paintWidth + 20;
    const citizenCounter = state.map.citizens.length;
    ctx.fillText(`${getTimeOfDayString(state.time, state)}, speed: ${state.gameSpeed.toFixed(2)},     zoom:${state.paintData.map.zoom.toFixed(2)}, citizens: ${citizenCounter}`, offsetX, 25);
    if (state.inputData.selected === undefined) {
        for (let i = 0; i < Math.min(20, state.map.citizens.length); i++) {
            const citizen = state.map.citizens[i];
            ctx.fillText(`${citizen.name}`, offsetX, 45 + 20 * i);
            ctx.fillText(`$${citizen.money}`, offsetX + 240, 45 + 20 * i);
            ctx.fillText(`job:${citizen.job.name}`, offsetX + 300, 45 + 20 * i);
        }
    }
}
