import { ChatSimState, Position } from "../chatSimModels.js";
import { addCitizenThought, Citizen, setCitizenThought } from "../citizen.js";
import { citizenChangeJob, CitizenJob } from "./job.js";
import { CITIZEN_JOB_FOOD_MARKET } from "./jobFoodMarket.js";
import { INVENTORY_MUSHROOM } from "../main.js";
import { IMAGE_PATH_BASKET, IMAGE_PATH_MUSHROOM } from "../../drawHelper.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { inventoryGetAvaiableCapacity } from "../inventory.js";
import { setCitizenStateGatherMushroom } from "./citizenStateGatherMushroom.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateTransportItemToBuilding } from "./citizenStateGetItem.js";
import { setCitizenStateSellItem } from "./citizenStateSellItem.js";


export type CitizenJobFoodGatherer = CitizenJob & {
}

export const CITIZEN_JOB_FOOD_GATHERER = "Food Gatherer";

export function loadCitizenJobFoodGatherer(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_GATHERER] = {
        create: create,
        tick: tick,
        paintTool: paintTool,
    };
}

function create(state: ChatSimState): CitizenJobFoodGatherer {
    return {
        name: CITIZEN_JOB_FOOD_GATHERER,
    }
}

function paintTool(ctx: CanvasRenderingContext2D, citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const basketSize = 20;
    ctx.drawImage(state.images[IMAGE_PATH_BASKET], 0, 0, 100, 100, paintPos.x, paintPos.y, basketSize, basketSize);

    const mushrooms = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    const mushroomsPaintSize = 10;
    ctx.save();
    ctx.clip(getBasketClipPath(paintPos, basketSize));
    if (mushrooms && mushrooms.counter > 0) {
        for (let i = Math.max(6 - mushrooms.counter, 0); i < 6; i++) {
            const mushroomX = paintPos.x + (i % 3) * mushroomsPaintSize / 2;
            const mushroomY = paintPos.y + Math.floor(i / 3) * mushroomsPaintSize / 3 + 2;
            ctx.drawImage(state.images[IMAGE_PATH_MUSHROOM], 0, 0, 200, 200, mushroomX, mushroomY, mushroomsPaintSize, mushroomsPaintSize);
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

function tick(citizen: Citizen, job: CitizenJobFoodGatherer, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        const available = inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_MUSHROOM);
        if (available > 0) {
            setCitizenStateGatherMushroom(citizen);
        } else {
            if (citizen.home && inventoryGetAvaiableCapacity(citizen.home.inventory, INVENTORY_MUSHROOM) > 0) {
                setCitizenThought(citizen, [
                    `I can not carry more ${INVENTORY_MUSHROOM}.`,
                    `I will store them at home.`
                ], state);
                setCitizenStateTransportItemToBuilding(citizen, citizen.home, INVENTORY_MUSHROOM);
            } else {
                if (!citizen.stateInfo.previousTaskFailed) {
                    addCitizenThought(citizen, `I can not carry more. I need to sell.`, state);
                    setCitizenStateSellItem(citizen, INVENTORY_MUSHROOM);
                    return;
                } else {
                    const reason = [
                        `I can not carry more ${INVENTORY_MUSHROOM}.`,
                        `There is no ${CITIZEN_JOB_FOOD_MARKET} to sell to.`,
                        `I become a ${CITIZEN_JOB_FOOD_MARKET} myself,`,
                        `so i can sell my ${INVENTORY_MUSHROOM}.`
                    ];
                    citizenChangeJob(citizen, CITIZEN_JOB_FOOD_MARKET, state, reason);
                    return;
                }
            }
        }
    }
    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        if (tickFunction) {
            tickFunction(citizen, state);
            return;
        }
    }
}
