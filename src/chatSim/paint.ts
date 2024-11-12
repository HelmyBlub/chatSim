import { drawTextWithOutline } from "../drawHelper.js";
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
    const citizenSize = 20;
    for (let citizen of state.map.citizens) {
        ctx.fillStyle = "black";
        ctx.strokeStyle = "black";
        ctx.font = "20px Arial";
        ctx.fillRect(mapPaintMiddle.x + citizen.position.x - citizenSize / 2, mapPaintMiddle.y + citizen.position.y - citizenSize / 2, citizenSize, citizenSize * citizen.foodPerCent);
        ctx.beginPath();
        ctx.rect(mapPaintMiddle.x + citizen.position.x - citizenSize / 2, mapPaintMiddle.y + citizen.position.y - citizenSize / 2, citizenSize, citizenSize);
        ctx.stroke();
        const nameOffsetX = Math.floor(ctx.measureText(citizen.name).width / 2);
        drawTextWithOutline(ctx, citizen.name, mapPaintMiddle.x + citizen.position.x - nameOffsetX, mapPaintMiddle.y + citizen.position.y - citizenSize / 2);
    }
    const mushroomSize = 10;
    for (let mushroom of state.map.mushrooms) {
        ctx.fillStyle = "red";
        ctx.fillRect(mapPaintMiddle.x + mushroom.position.x - mushroomSize / 2, mapPaintMiddle.y + mushroom.position.y - mushroomSize / 2, mushroomSize, mushroomSize);
    }
    const treeSizeHeight = 20;
    const treeSizeWidth = 5;
    for (let tree of state.map.trees) {
        ctx.fillStyle = "brown";
        ctx.fillRect(mapPaintMiddle.x + tree.position.x - mushroomSize / 2, mapPaintMiddle.y + tree.position.y - mushroomSize / 2, treeSizeWidth, treeSizeHeight);
    }
    const houseSize = 20;
    for (let house of state.map.houses) {
        ctx.fillStyle = "blue";
        ctx.strokeStyle = "black";
        ctx.font = "20px Arial";
        let factor = (house.buildProgress !== undefined ? house.buildProgress : 1);
        factor = Math.min(factor, 1 - house.deterioration);
        ctx.fillRect(mapPaintMiddle.x + house.position.x - houseSize / 2, mapPaintMiddle.y + house.position.y - houseSize / 2, houseSize, houseSize * factor);
        ctx.beginPath();
        ctx.rect(mapPaintMiddle.x + house.position.x - houseSize / 2, mapPaintMiddle.y + house.position.y - houseSize / 2, houseSize, houseSize);
        ctx.stroke();
        if (house.inhabitedBy) {
            const nameOffsetX = Math.floor(ctx.measureText(house.inhabitedBy.name).width / 2);
            drawTextWithOutline(ctx, house.inhabitedBy.name, mapPaintMiddle.x + house.position.x - nameOffsetX, mapPaintMiddle.y + house.position.y - houseSize / 2);
        }
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
