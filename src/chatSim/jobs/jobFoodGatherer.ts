import { ChatSimState, Position } from "../chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen, CITIZEN_TIME_PER_THOUGHT_LINE, CitizenStateInfo, emptyCitizenInventoryToHomeInventory, getAvaiableInventoryCapacity, getUsedInventoryCapacity, isCitizenThinking, setCitizenThought } from "../citizen.js";
import { citizenChangeJob, CitizenJob, isCitizenInInteractDistance } from "./job.js";
import { CITIZEN_JOB_FOOD_MARKET, sellFoodToFoodMarket } from "./jobFoodMarket.js";
import { INVENTORY_MUSHROOM, calculateDistance, SKILL_GATHERING } from "../main.js";
import { CITIZEN_FOOD_IN_INVENTORY_NEED } from "../citizenNeeds/citizenNeedFood.js";
import { removeMushroomFromMap } from "../map.js";
import { IMAGE_PATH_BASKET, IMAGE_PATH_MUSHROOM } from "../../drawHelper.js";
import { mapPositionToPaintPosition } from "../paint.js";


export type CitizenJobFoodGatherer = CitizenJob & {
    sellToFoodMarket?: Citizen,
}

type JobFoodGathererStateInfo = CitizenStateInfo & {
    state?: "gathering" | "selling" | "goHome" | "sellAtFoodMarket",
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
    const stateInfo = citizen.stateInfo as JobFoodGathererStateInfo;

    if (stateInfo.state === undefined) {
        if (getAvaiableInventoryCapacity(citizen.inventory, INVENTORY_MUSHROOM) > 0) {
            moveToMushroom(citizen, state);
            stateInfo.state = "gathering";
        } else {
            if (citizen.home && getUsedInventoryCapacity(citizen.home.inventory) < citizen.home.inventory.size) {
                stateInfo.state = "goHome";
                setCitizenThought(citizen, [
                    `I can not carry more ${INVENTORY_MUSHROOM}.`,
                    `I will store them at home.`
                ], state);
            } else {
                const mushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (mushroom && mushroom.counter > CITIZEN_FOOD_IN_INVENTORY_NEED) {
                    stateInfo.state = "selling";
                }
            }
        }
    }
    if (stateInfo.state === "goHome") {
        if (citizen.moveTo === undefined) {
            if (citizen.home && stateInfo.actionStartTime !== undefined && stateInfo.thoughts !== undefined) {
                if (!isCitizenThinking(citizen, state)) {
                    stateInfo.actionStartTime = undefined;
                    stateInfo.thoughts = undefined;
                    citizen.moveTo = {
                        x: citizen.home.position.x,
                        y: citizen.home.position.y,
                    }
                }
            } else {
                emptyCitizenInventoryToHomeInventory(citizen, state);
                stateInfo.state = undefined;
            }
        }
    }
    if (stateInfo.state === "gathering") {
        if (citizen.moveTo === undefined) {
            const isCloseToMushroomIndex = isCloseToMushroom(citizen, state);
            if (isCloseToMushroomIndex !== undefined) {
                addCitizenLogEntry(citizen, `picked up ${INVENTORY_MUSHROOM}`, state);
                pickUpMushroom(citizen, state, isCloseToMushroomIndex);
            } else if (citizen.moveTo === undefined) {
                addCitizenLogEntry(citizen, `no ${INVENTORY_MUSHROOM} at pickup location. Search a new one`, state);
            }
            stateInfo.state = undefined;
        }
    }
    if (stateInfo.state === "selling" && !isCitizenThinking(citizen, state)) {
        const foodMarket = findAFoodMarketWhichHasMoneyAndCapacity(citizen, state.map.citizens);
        if (foodMarket) {
            job.sellToFoodMarket = foodMarket;
            stateInfo.state = "sellAtFoodMarket";
            setCitizenThought(citizen, [
                `I can not carry more ${INVENTORY_MUSHROOM}.`,
                `I will sell them to ${foodMarket.name}.`,
            ], state);
            citizen.moveTo = {
                x: foodMarket.position.x,
                y: foodMarket.position.y,
            }
        } else {
            const reason = [
                `I can not carry more ${INVENTORY_MUSHROOM}.`,
                `There is no ${CITIZEN_JOB_FOOD_MARKET} to sell to.`,
                `I become a ${CITIZEN_JOB_FOOD_MARKET} myself,`,
                `so i can sell my ${INVENTORY_MUSHROOM}.`
            ];
            citizenChangeJob(citizen, CITIZEN_JOB_FOOD_MARKET, state, reason);
        }
    }
    if (stateInfo.state === "sellAtFoodMarket") {
        if (citizen.moveTo === undefined) {
            if (job.sellToFoodMarket && isCitizenInInteractDistance(citizen, job.sellToFoodMarket.position)) {
                const mushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (mushroom && mushroom.counter > CITIZEN_FOOD_IN_INVENTORY_NEED) {
                    const sellAmount = mushroom.counter - CITIZEN_FOOD_IN_INVENTORY_NEED;
                    sellFoodToFoodMarket(job.sellToFoodMarket, citizen, sellAmount, state);
                }
                stateInfo.state = "gathering";
            } else {
                stateInfo.state = "selling";
                setCitizenThought(citizen, [
                    `I do not see the food market.`,
                ], state);
            }
        }
    }
}

function findAFoodMarketWhichHasMoneyAndCapacity(searcher: Citizen, citizens: Citizen[]): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen.job && citizen.job.name === CITIZEN_JOB_FOOD_MARKET && citizen.moveTo === undefined && citizen.money > 2 && canCitizenCarryMore(citizen)) {
            if (closest === undefined) {
                closest = citizen;
                distance = calculateDistance(citizen.position, searcher.position);
            } else {
                const tempDistance = calculateDistance(citizen.position, searcher.position);
                if (tempDistance < distance) {
                    closest = citizen;
                    distance = tempDistance;
                }
            }
        }
    }
    return closest;
}

function pickUpMushroom(citizen: Citizen, state: ChatSimState, mushroomIndex: number) {
    removeMushroomFromMap(state.map.mushrooms[mushroomIndex], state.map);
    let inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
    if (inventoryMushroom === undefined) {
        inventoryMushroom = { name: INVENTORY_MUSHROOM, counter: 0 };
        citizen.inventory.items.push(inventoryMushroom);
    }
    inventoryMushroom.counter++;
    if (citizen.skills[SKILL_GATHERING] === undefined) citizen.skills[SKILL_GATHERING] = 0;
    const skillGathering = citizen.skills[SKILL_GATHERING];
    if (Math.random() < skillGathering / 100) {
        inventoryMushroom.counter++;
    }
    if (skillGathering < 100) citizen.skills[SKILL_GATHERING] += 1;
}

function isCloseToMushroom(citizen: Citizen, state: ChatSimState): number | undefined {
    for (let i = state.map.mushrooms.length - 1; i >= 0; i--) {
        const mushroom = state.map.mushrooms[i];
        const distance = calculateDistance(mushroom.position, citizen.position);
        if (distance < 10) return i;
    }
    return undefined;
}

function moveToMushroom(citizen: Citizen, state: ChatSimState) {
    if (state.map.mushrooms.length > 0) {
        const stateInfo = citizen.stateInfo as JobFoodGathererStateInfo;
        const mushroomIndex = Math.floor(Math.random() * state.map.mushrooms.length);
        stateInfo.state = "gathering";
        citizen.moveTo = {
            x: state.map.mushrooms[mushroomIndex].position.x,
            y: state.map.mushrooms[mushroomIndex].position.y,
        }
        addCitizenLogEntry(citizen, `move to ${INVENTORY_MUSHROOM} at x:${citizen.moveTo.x}, y:${citizen.moveTo.y}`, state);
    }
}