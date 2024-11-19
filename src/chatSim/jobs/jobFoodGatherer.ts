import { ChatSimState, Position } from "../chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen, emptyCitizenInventoryToHomeInventory, getAvaiableInventoryCapacity, getUsedInventoryCapacity } from "../citizen.js";
import { CitizenJob, createJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_FOOD_MARKET, sellFoodToFoodMarket } from "./jobFoodMarket.js";
import { INVENTORY_MUSHROOM, calculateDistance, SKILL_GATHERING } from "../main.js";
import { CITIZEN_FOOD_IN_INVENTORY_NEED } from "../citizenNeeds/citizenNeedFood.js";
import { removeMushroomFromMap } from "../map.js";
import { IMAGE_PATH_BASKET, IMAGE_PATH_MUSHROOM } from "../../drawHelper.js";
import { mapPositionToPaintPosition } from "../paint.js";

export type CitizenJobFoodGatherer = CitizenJob & {
    state: "gathering" | "selling" | "setMoveToMushroom" | "goHome",
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
        state: "setMoveToMushroom",
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
    if (job.state === "setMoveToMushroom") {
        if (getAvaiableInventoryCapacity(citizen.inventory, INVENTORY_MUSHROOM) > 0) {
            moveToMushroom(citizen, state);
            job.state = "gathering";
        } else {
            if (citizen.home && getUsedInventoryCapacity(citizen.home.inventory) < citizen.home.inventory.size) {
                job.state = "goHome";
                citizen.moveTo = {
                    x: citizen.home.position.x,
                    y: citizen.home.position.y,
                }
                addCitizenLogEntry(citizen, `go home to store stuff to free inventory space`, state);
            } else {
                const mushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (mushroom && mushroom.counter > CITIZEN_FOOD_IN_INVENTORY_NEED) {
                    job.state = "selling";
                }
            }
        }
    }
    if (job.state === "goHome") {
        if (citizen.moveTo === undefined) {
            emptyCitizenInventoryToHomeInventory(citizen, state);
            job.state = "setMoveToMushroom";
        }
    }
    if (job.state === "gathering") {
        if (citizen.moveTo === undefined) {
            const isCloseToMushroomIndex = isCloseToMushroom(citizen, state);
            if (isCloseToMushroomIndex !== undefined) {
                addCitizenLogEntry(citizen, `picked up ${INVENTORY_MUSHROOM}`, state);
                pickUpMushroom(citizen, state, isCloseToMushroomIndex);
            } else if (citizen.moveTo === undefined) {
                addCitizenLogEntry(citizen, `no ${INVENTORY_MUSHROOM} at pickup location. Search a new one`, state);
            }
            job.state = "setMoveToMushroom";
        }
    }
    if (job.state === "selling") {
        const foodMarket = findAFoodMarketWhichHasMoneyAndCapacity(citizen, state.map.citizens);
        if (foodMarket) {
            if (isCitizenInInteractDistance(citizen, foodMarket.position)) {
                const mushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                if (mushroom && mushroom.counter > CITIZEN_FOOD_IN_INVENTORY_NEED) {
                    const sellAmount = mushroom.counter - CITIZEN_FOOD_IN_INVENTORY_NEED;
                    sellFoodToFoodMarket(foodMarket, citizen, sellAmount, state);
                }
                job.state = "gathering";
            } else {
                citizen.moveTo = {
                    x: foodMarket.position.x,
                    y: foodMarket.position.y,
                }
            }
        } else {
            addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_FOOD_MARKET} as there is no food market to sell food too`, state);
            citizen.job = createJob(CITIZEN_JOB_FOOD_MARKET, state);
        }
    }
}

function findAFoodMarketWhichHasMoneyAndCapacity(searcher: Citizen, citizens: Citizen[]): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen.job && citizen.job.name === CITIZEN_JOB_FOOD_MARKET && citizen.money > 2 && canCitizenCarryMore(citizen)) {
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
        const mushroomIndex = Math.floor(Math.random() * state.map.mushrooms.length);
        citizen.job.state = "gathering";
        citizen.moveTo = {
            x: state.map.mushrooms[mushroomIndex].position.x,
            y: state.map.mushrooms[mushroomIndex].position.y,
        }
        addCitizenLogEntry(citizen, `move to ${INVENTORY_MUSHROOM} at x:${citizen.moveTo.x}, y:${citizen.moveTo.y}`, state);
    }
}