import { IMAGE_PATH_AXE, IMAGE_PATH_BASKET, IMAGE_PATH_HAMMER, IMAGE_PATH_HELMET, IMAGE_PATH_MUSHROOM, IMAGE_PATH_WOOD_PLANK } from "../drawHelper.js";
import { ChatSimState, Position } from "./chatSimModels.js";
import { Citizen } from "./map/citizen.js";
import { IMAGES } from "./images.js";
import { INVENTORY_MUSHROOM, INVENTORY_WOOD } from "./inventory.js";
import { mapPositionToPaintPosition } from "./paint.js";

export type CitizenEquipment = "Helmet" | "Axe" | "Basket" | "Hammer" | "WoodPlanks";
export type CitizenEquipmentData = {
    name: CitizenEquipment,
    data?: any,
}
type DataAxeIsSwinging = boolean;

const CITIZEN_EQUIPMENT_PAINT_FUNCTIONS: { [key: string]: (ctx: CanvasRenderingContext2D, citizen: Citizen, equipment: CitizenEquipmentData, state: ChatSimState) => void } = {
    "Helmet": paintToolHelmet,
    "Axe": paintToolAxe,
    "Basket": paintToolBasket,
    "WoodPlanks": paintCarryingWoodPlanks,
    "Hammer": paintToolHammer,
}

export function citizenGetEquipmentData(citizen: Citizen, equipment: CitizenEquipment): CitizenEquipmentData | undefined {
    return citizenAddEquipment(citizen, equipment);
}

export function citizenAddEquipment(citizen: Citizen, equipment: CitizenEquipment): CitizenEquipmentData {
    let equip = citizen.displayedEquipments.find(i => i.name === equipment);
    if (equip) return equip;
    equip = { name: equipment };
    citizen.displayedEquipments.push(equip);
    return equip;
}

export function citizenSetEquipment(citizen: Citizen, equipments: CitizenEquipment[]) {
    citizen.displayedEquipments = [];
    for (let equip of equipments) {
        citizenAddEquipment(citizen, equip)
    }
}

export function paintCitizenEquipments(ctx: CanvasRenderingContext2D, citizen: Citizen, state: ChatSimState) {
    if (citizen.displayedEquipments.length === 0) return;
    for (let equipment of citizen.displayedEquipments) {
        const toolPaintFunction = CITIZEN_EQUIPMENT_PAINT_FUNCTIONS[equipment.name];
        if (toolPaintFunction) toolPaintFunction(ctx, citizen, equipment, state);
    }
}

function paintCarryingWoodPlanks(ctx: CanvasRenderingContext2D, citizen: Citizen, equipment: CitizenEquipmentData, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const size = 20;
    const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
    if (!inventoryWood || inventoryWood.counter === 0) return;
    for (let i = 0; i < Math.min(inventoryWood.counter, 10); i++) {
        ctx.drawImage(IMAGES[IMAGE_PATH_WOOD_PLANK], 0, 0, 200, 200, paintPos.x - size / 2, paintPos.y - 33 - i, size, size);
    }
}

function paintToolHelmet(ctx: CanvasRenderingContext2D, citizen: Citizen, equipment: CitizenEquipmentData, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const size = 20;
    ctx.drawImage(IMAGES[IMAGE_PATH_HELMET], 0, 0, 100, 100, paintPos.x - size / 2, paintPos.y - 33, size, size);
}

function paintToolAxe(ctx: CanvasRenderingContext2D, citizen: Citizen, equipment: CitizenEquipmentData, state: ChatSimState) {
    const isSwinging: DataAxeIsSwinging = equipment.data;
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const axeSize = 20;
    ctx.save();
    if (citizen.moveTo === undefined && isSwinging) {
        const rotation = (Math.sin(state.time / 100) + 1) / 2 * Math.PI / 2;
        ctx.translate(paintPos.x, paintPos.y);
        ctx.rotate(rotation)
        ctx.translate(-paintPos.x, -paintPos.y);
    }
    ctx.drawImage(IMAGES[IMAGE_PATH_AXE], 0, 0, 100, 100, paintPos.x, paintPos.y - 15, axeSize, axeSize);
    ctx.restore();
}

function paintToolHammer(ctx: CanvasRenderingContext2D, citizen: Citizen, equipment: CitizenEquipmentData, state: ChatSimState) {
    const isSwinging: DataAxeIsSwinging = equipment.data;
    if (!isSwinging) return;
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const axeSize = 20;
    ctx.save();
    if (citizen.moveTo === undefined && isSwinging) {
        const rotation = (Math.sin(state.time / 100) + 1) / 2 * Math.PI / 2;
        ctx.translate(paintPos.x, paintPos.y);
        ctx.rotate(rotation)
        ctx.translate(-paintPos.x, -paintPos.y);
    }
    ctx.drawImage(IMAGES[IMAGE_PATH_HAMMER], 0, 0, 100, 100, paintPos.x, paintPos.y - 15, axeSize, axeSize);
    ctx.restore();
}


function paintToolBasket(ctx: CanvasRenderingContext2D, citizen: Citizen, equipment: CitizenEquipmentData, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const basketSize = 20;
    ctx.drawImage(IMAGES[IMAGE_PATH_BASKET], 0, 0, 100, 100, paintPos.x, paintPos.y, basketSize, basketSize);

    const mushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    const mushroomsPaintSize = 10;
    ctx.save();
    ctx.clip(getBasketClipPath(paintPos, basketSize));
    if (mushrooms && mushrooms.counter > 0) {
        for (let i = Math.max(6 - mushrooms.counter, 0); i < 6; i++) {
            const mushroomX = paintPos.x + (i % 3) * mushroomsPaintSize / 2;
            const mushroomY = paintPos.y + Math.floor(i / 3) * mushroomsPaintSize / 3 + 2;
            ctx.drawImage(IMAGES[IMAGE_PATH_MUSHROOM], 0, 0, 200, 200, mushroomX, mushroomY, mushroomsPaintSize, mushroomsPaintSize);
        }
    }
    ctx.restore();
}

function getBasketClipPath(topLeft: Position, basketPaintSize: number): Path2D {
    const basketImageSize = 100;
    const basketSizeFactor = basketPaintSize / basketImageSize;
    const path = new Path2D();
    path.moveTo(topLeft.x + 8 * basketSizeFactor, topLeft.y + 48 * basketSizeFactor);
    path.quadraticCurveTo(topLeft.x + 48 * basketSizeFactor, topLeft.y + 64 * basketSizeFactor, topLeft.x + 88 * basketSizeFactor, topLeft.y + 48 * basketSizeFactor);
    path.lineTo(topLeft.x + 120 * basketSizeFactor, topLeft.y + 48 * basketSizeFactor);
    path.lineTo(topLeft.x + 120 * basketSizeFactor, topLeft.y - 20);
    path.lineTo(topLeft.x - 20 * basketSizeFactor, topLeft.y - 20 * basketSizeFactor);
    path.lineTo(topLeft.x - 20 * basketSizeFactor, topLeft.y + 48 * basketSizeFactor);
    path.lineTo(topLeft.x + 8 * basketSizeFactor, topLeft.y + 48 * basketSizeFactor);
    return path;
}

