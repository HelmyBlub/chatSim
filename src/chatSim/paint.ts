import { drawTextWithOutline, IMAGE_PATH_BUILDING_MARKET, IMAGE_PATH_CITIZEN_HOUSE, IMAGE_PATH_MUSHROOM, IMAGE_PATH_TREE } from "../drawHelper.js";
import { ChatSimState, PaintDataMap, Position } from "./chatSimModels.js";
import { Citizen, paintCitizens } from "./citizen.js";
import { getTimeOfDay, getTimeOfDayString } from "./main.js";

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
    const offsetX = state.paintData.map.paintWidth + 100;
    const offsetY = 50;
    let lineCounter = 0;
    const lineSpacing = 25;
    if (selected.type === "citizen") {
        const citizen: Citizen = selected.object;
        ctx.fillText(`Citizen: ${citizen.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Food: ${(citizen.foodPerCent * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Energy: ${(citizen.energyPerCent * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Money: $${(citizen.money).toFixed()}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    State: ${citizen.stateInfo.type}`, offsetX, offsetY + lineSpacing * lineCounter++);
        if (citizen.stateInfo.state) ctx.fillText(`        ${citizen.stateInfo.state}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Job: ${citizen.job.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`        State: ${citizen.job.state}`, offsetX, offsetY + lineSpacing * lineCounter++);
        ctx.fillText(`    Inventory:`, offsetX, offsetY + lineSpacing * lineCounter++);
        for (let item of citizen.inventory) {
            ctx.fillText(`        ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
        if (citizen.home) {
            ctx.fillText(`    Home Inventory:`, offsetX, offsetY + lineSpacing * lineCounter++);
            for (let item of citizen.home.inventory) {
                ctx.fillText(`        ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
            }
        }
        if (citizen.log.length > 0) {
            ctx.fillText(`    Action Log:`, offsetX, offsetY + lineSpacing * lineCounter++);
            for (let i = 0; i < Math.min(5, citizen.log.length); i++) {
                const logEntry = citizen.log[i];
                ctx.fillText(`        ${logEntry.message}`, offsetX, offsetY + lineSpacing * lineCounter++);
            }
        }
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
    const treePaintSize = 60;
    const treeImage = state.images[IMAGE_PATH_TREE];
    for (let tree of state.map.trees) {
        const paintPos = mapPositionToPaintPosition(tree.position, paintDataMap);
        ctx.drawImage(treeImage, 0, 0, 200, 200,
            paintPos.x - treePaintSize / 2,
            paintPos.y - treePaintSize / 2,
            treePaintSize, treePaintSize);
    }
    const citizenHouseImage = state.images[IMAGE_PATH_CITIZEN_HOUSE];
    const marketImage = state.images[IMAGE_PATH_BUILDING_MARKET];
    const buildingPaintSize = 80;
    const buildingImageSize = 200;
    const nameOffsetY = 90 * buildingPaintSize / buildingImageSize;
    ctx.font = "8px Arial";
    for (let house of state.map.houses) {
        const paintPos = mapPositionToPaintPosition(house.position, paintDataMap);
        let factor = (house.buildProgress !== undefined ? house.buildProgress : 1);
        const image = house.type === "House" ? citizenHouseImage : marketImage;
        ctx.drawImage(image, 0, buildingImageSize - buildingImageSize * factor, buildingImageSize, buildingImageSize * factor,
            paintPos.x - buildingPaintSize / 2,
            paintPos.y - buildingPaintSize / 2 + buildingPaintSize - buildingPaintSize * factor,
            buildingPaintSize, buildingPaintSize * factor);
        if (house.inhabitedBy) {
            const nameOffsetX = Math.floor(ctx.measureText(house.inhabitedBy.name).width / 2);
            drawTextWithOutline(ctx, house.inhabitedBy.name, paintPos.x - nameOffsetX, paintPos.y - buildingPaintSize / 2 + nameOffsetY);
        }
    }
    paintCitizens(ctx, state);
    ctx.restore();

    //paint night darkness
    const timeOfDay = getTimeOfDay(state);
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
    const offsetX = state.paintData.map.paintWidth + 500;
    ctx.fillText(`${getTimeOfDayString(state)}, speed: ${state.gameSpeed},     zoom:${state.paintData.map.zoom.toFixed(2)}`, offsetX, 25);
    for (let i = 0; i < state.map.citizens.length; i++) {
        const citizen = state.map.citizens[i];
        let text = `${citizen.name}, state: ${citizen.stateInfo.type}, $${citizen.money}, Job: ${citizen.job.name}`;
        ctx.fillText(text, offsetX, 50 + i * 26);
    }
}
