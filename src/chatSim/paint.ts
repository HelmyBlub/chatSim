import { drawTextWithOutline, IMAGE_PATH_CITIZEN, IMAGE_PATH_CITIZEN_HOUSE, IMAGE_PATH_MUSHROOM, IMAGE_PATH_TREE } from "../drawHelper.js";
import { ChatSimState, PaintDataMap, Position } from "./chatSimModels.js";

export function paintChatSim(state: ChatSimState) {
    const ctx = state.canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    paintMap(ctx, state, state.paintData.map);
    paintMapBorder(ctx, state.paintData.map);
    paintData(ctx, state);

}

function mapPositionToPaintPosition(mapPosition: Position, paintDataMap: PaintDataMap): Position {
    return {
        x: Math.floor(mapPosition.x - paintDataMap.cameraPosition.x + paintDataMap.paintOffset.x + paintDataMap.paintWidth / 2),
        y: Math.floor(mapPosition.y - paintDataMap.cameraPosition.y + paintDataMap.paintOffset.y + paintDataMap.paintHeight / 2),
    };
}

function paintMap(ctx: CanvasRenderingContext2D, state: ChatSimState, paintDataMap: PaintDataMap) {
    ctx.fillStyle = "black";
    ctx.rect(paintDataMap.paintOffset.x, paintDataMap.paintOffset.y, paintDataMap.paintWidth, paintDataMap.paintHeight);
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
    const citizenHousePaintSize = 80;
    const citizenHouseImageSize = 200;
    const nameOffsetY = 90 * citizenHousePaintSize / citizenHouseImageSize;
    ctx.font = "8px Arial";
    for (let house of state.map.houses) {
        const paintPos = mapPositionToPaintPosition(house.position, paintDataMap);
        let factor = (house.buildProgress !== undefined ? house.buildProgress : 1);
        ctx.drawImage(citizenHouseImage, 0, citizenHouseImageSize - citizenHouseImageSize * factor, citizenHouseImageSize, citizenHouseImageSize * factor,
            paintPos.x - citizenHousePaintSize / 2,
            paintPos.y - citizenHousePaintSize / 2 + citizenHousePaintSize - citizenHousePaintSize * factor,
            citizenHousePaintSize, citizenHousePaintSize * factor);
        if (house.inhabitedBy) {
            const nameOffsetX = Math.floor(ctx.measureText(house.inhabitedBy.name).width / 2);
            drawTextWithOutline(ctx, house.inhabitedBy.name, paintPos.x - nameOffsetX, paintPos.y - citizenHousePaintSize / 2 + nameOffsetY);
        }
    }
    const citizenImage = state.images[IMAGE_PATH_CITIZEN];
    const citizenPaintSize = 40;
    ctx.font = "20px Arial";
    for (let citizen of state.map.citizens) {
        const paintPos = mapPositionToPaintPosition(citizen.position, paintDataMap);
        ctx.drawImage(citizenImage, 0, 0, 200, 200,
            paintPos.x - citizenPaintSize / 2,
            paintPos.y - citizenPaintSize / 2,
            citizenPaintSize, citizenPaintSize);

        const nameOffsetX = Math.floor(ctx.measureText(citizen.name).width / 2);
        const nameYSpacing = 5;
        drawTextWithOutline(ctx, citizen.name, paintPos.x - nameOffsetX, paintPos.y - citizenPaintSize / 2 - nameYSpacing);
    }
    ctx.restore();
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
    const offsetX = state.map.mapWidth + 100;
    ctx.fillText(`speed: ${state.gameSpeed}`, offsetX, 25);
    for (let i = 0; i < state.map.citizens.length; i++) {
        const citizen = state.map.citizens[i];
        let text = `${citizen.name}, state: ${citizen.state}, $${citizen.money}, Job: ${citizen.job.name}`;
        ctx.fillText(text, offsetX, 50 + i * 26);
    }
}
