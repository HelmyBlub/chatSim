import { drawTextWithOutline, IMAGE_PATH_CITIZEN, IMAGE_PATH_CITIZEN_HOUSE, IMAGE_PATH_MUSHROOM, IMAGE_PATH_TREE } from "../drawHelper.js";
import { ChatSimState } from "./chatSimModels.js";

export function paintChatSim(state: ChatSimState) {
    const ctx = state.canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);


    ctx.fillStyle = "green";
    ctx.fillRect(state.map.paintOffset.x, state.map.paintOffset.y, state.map.mapWidth, state.map.mapHeight);
    const mapPaintMiddle = {
        x: Math.floor(state.map.paintOffset.x + state.map.mapWidth / 2),
        y: Math.floor(state.map.paintOffset.y + state.map.mapHeight / 2),
    };
    const mushroomPaintSize = 30;
    const mushroomImage = state.images[IMAGE_PATH_MUSHROOM];
    for (let mushroom of state.map.mushrooms) {
        ctx.drawImage(mushroomImage, 0, 0, 200, 200,
            mapPaintMiddle.x + mushroom.position.x - mushroomPaintSize / 2,
            mapPaintMiddle.y + mushroom.position.y - mushroomPaintSize / 2,
            mushroomPaintSize, mushroomPaintSize);
    }
    const treePaintSize = 60;
    const treeImage = state.images[IMAGE_PATH_TREE];
    for (let tree of state.map.trees) {
        ctx.drawImage(treeImage, 0, 0, 200, 200,
            mapPaintMiddle.x + tree.position.x - treePaintSize / 2,
            mapPaintMiddle.y + tree.position.y - treePaintSize / 2,
            treePaintSize, treePaintSize);
    }
    const citizenHouseImage = state.images[IMAGE_PATH_CITIZEN_HOUSE];
    const citizenHousePaintSize = 80;
    const citizenHouseImageSize = 200;
    const nameOffsetY = 90 * citizenHousePaintSize / citizenHouseImageSize;
    for (let house of state.map.houses) {
        let factor = (house.buildProgress !== undefined ? house.buildProgress : 1);
        ctx.drawImage(citizenHouseImage, 0, citizenHouseImageSize - citizenHouseImageSize * factor, citizenHouseImageSize, citizenHouseImageSize * factor,
            mapPaintMiddle.x + house.position.x - citizenHousePaintSize / 2,
            mapPaintMiddle.y + house.position.y - citizenHousePaintSize / 2 + citizenHousePaintSize - citizenHousePaintSize * factor,
            citizenHousePaintSize, citizenHousePaintSize * factor);
        ctx.font = "8px Arial";
        if (house.inhabitedBy) {
            const nameOffsetX = Math.floor(ctx.measureText(house.inhabitedBy.name).width / 2);
            drawTextWithOutline(ctx, house.inhabitedBy.name, mapPaintMiddle.x + house.position.x - nameOffsetX, mapPaintMiddle.y + house.position.y - citizenHousePaintSize / 2 + nameOffsetY);
        }
    }
    const citizenImage = state.images[IMAGE_PATH_CITIZEN];
    const citizenPaintSize = 40;
    for (let citizen of state.map.citizens) {
        ctx.drawImage(citizenImage, 0, 0, 200, 200,
            mapPaintMiddle.x + citizen.position.x - citizenPaintSize / 2,
            mapPaintMiddle.y + citizen.position.y - citizenPaintSize / 2,
            citizenPaintSize, citizenPaintSize);

        const nameOffsetX = Math.floor(ctx.measureText(citizen.name).width / 2);
        const nameYSpacing = 5;
        drawTextWithOutline(ctx, citizen.name, mapPaintMiddle.x + citizen.position.x - nameOffsetX, mapPaintMiddle.y + citizen.position.y - citizenPaintSize / 2 - nameYSpacing);
    }

    paintData(ctx, state);
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
