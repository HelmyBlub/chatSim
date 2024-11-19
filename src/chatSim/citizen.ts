import { drawTextWithOutline, IMAGE_PATH_CITIZEN } from "../drawHelper.js";
import { ChatSimState, Building, Inventory, Position } from "./chatSimModels.js";
import { tickCitizenNeeds } from "./citizenNeeds/citizenNeed.js";
import { CITIZEN_NEED_SLEEP } from "./citizenNeeds/citizenNeedSleep.js";
import { CitizenJob, createJob, isCitizenInInteractDistance, paintCitizenJobTool, tickCitizenJob } from "./jobs/job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobs/jobFoodGatherer.js";
import { CITIZEN_JOB_FOOD_MARKET, hasFoodMarketStock } from "./jobs/jobFoodMarket.js";
import { calculateDistance, INVENTORY_MUSHROOM, INVENTORY_WOOD } from "./main.js";
import { mapPositionToPaintPosition, PAINT_LAYER_CITIZEN_AFTER_HOUSES, PAINT_LAYER_CITIZEN_BEFORE_HOUSES } from "./paint.js";

export type CitizenStateInfo = {
    type: string,
    state?: string,
}

export type Citizen = {
    job: CitizenJob,
    birthTime: number,
    name: string,
    stateInfo: CitizenStateInfo,
    speed: number,
    position: Position,
    moveTo?: Position,
    foodPerCent: number,
    energyPerCent: number,
    inventory: Inventory,
    home?: Building,
    money: number,
    skills: { [key: string]: number },
    lastCheckedNeedsTime?: number,
    log: CitizenLogEntry[];
    maxLogLength: number,
}

export type CitizenLogEntry = {
    time: number,
    message: string,
}

export const CITIZEN_STATE_TYPE_WORKING_JOB = "workingJob";
const CITIZEN_PAINT_SIZE = 40;

export function addCitizen(user: string, state: ChatSimState) {
    if (state.map.citizens.find(c => c.name === user)) return;
    state.map.citizens.push({
        name: user,
        birthTime: state.time,
        speed: 2,
        foodPerCent: 1,
        energyPerCent: 1,
        position: { x: 0, y: 0 },
        stateInfo: {
            type: CITIZEN_STATE_TYPE_WORKING_JOB,
        },
        inventory: {
            items: [],
            reservedSpace: [
                {
                    counter: 3,
                    name: INVENTORY_MUSHROOM
                },
                {
                    counter: 2,
                    name: INVENTORY_WOOD
                },
            ],
            size: 10,
        },
        money: 10,
        skills: {},
        job: createJob(CITIZEN_JOB_FOOD_GATHERER, state),
        log: [],
        maxLogLength: 100,
    })
}

export function addCitizenLogEntry(citizen: Citizen, message: string, state: ChatSimState) {
    citizen.log.unshift({
        time: state.time,
        message: message,
    });
    if (citizen.log.length > citizen.maxLogLength) {
        citizen.log.pop();
    }
}

export function canCitizenCarryMore(citizen: Citizen): boolean {
    return getUsedInventoryCapacity(citizen.inventory) < citizen.inventory.size;
}

export function getAvaiableInventoryCapacity(inventory: Inventory, itemName: string) {
    if (inventory.reservedSpace) {
        let counter = 0;
        for (let item of inventory.items) {
            const reserved = inventory.reservedSpace.find(i => i.name === item.name);
            if (itemName !== item.name && reserved) {
                if (reserved.counter > item.counter) {
                    counter += reserved.counter;
                } else {
                    counter += item.counter;
                }
            } else {
                counter += item.counter;
            }
        }
        return Math.max(inventory.size - counter, 0);
    } else {
        return Math.max(inventory.size - getUsedInventoryCapacity(inventory), 0);
    }
}

export function getUsedInventoryCapacity(inventory: Inventory): number {
    let counter = 0;
    for (let item of inventory.items) {
        counter += item.counter;
    }
    return counter;
}

export function emptyCitizenInventoryToHomeInventory(citizen: Citizen, state: ChatSimState) {
    if (citizen.home && isCitizenInInteractDistance(citizen, citizen.home.position)) {
        for (let item of citizen.inventory.items) {
            if (item.counter > 0) {
                const amount = moveItemBetweenInventories(item.name, citizen.inventory, citizen.home.inventory, item.counter);
                if (amount > 0) addCitizenLogEntry(citizen, `move ${amount}x${item.name} from inventory to home inventory`, state);
            }
        }
    }
}

export function moveItemBetweenInventories(itemName: string, fromInventory: Inventory, toInventory: Inventory, amount: number | undefined = undefined): number {
    const item = fromInventory.items.find(i => i.name === itemName);
    if (!item || item.counter === 0) {
        return 0;
    }
    let maxFromInventoryAmount = amount !== undefined ? amount : item.counter;
    if (item.counter < maxFromInventoryAmount) {
        maxFromInventoryAmount = item.counter;
    }
    const toAmount = putItemIntoInventory(itemName, toInventory, maxFromInventoryAmount);
    item.counter -= toAmount;
    return toAmount;
}

/**
 * @returns actual amount put into inventory. As inventory has a max capacity it might not fit all in
 */
export function putItemIntoInventory(itemName: string, inventory: Inventory, amount: number): number {
    let item = inventory.items.find(i => i.name === itemName);
    let actualAmount = amount;
    if (!item) {
        item = {
            name: itemName,
            counter: 0,
        }
        inventory.items.push(item);
    }
    const availableCapacity = getAvaiableInventoryCapacity(inventory, itemName);
    if (actualAmount > availableCapacity) actualAmount = availableCapacity;
    if (actualAmount < 0) {
        throw "negativ trade not allowed";
    }
    item.counter += actualAmount;
    return actualAmount;
}

export function tickCitizens(state: ChatSimState) {
    for (let citizen of state.map.citizens) {
        tickCitizen(citizen, state);
    }
    deleteCitizens(state);
}

export function paintCitizens(ctx: CanvasRenderingContext2D, state: ChatSimState, layer: number) {
    const paintDataMap = state.paintData.map;
    const citizenImage = state.images[IMAGE_PATH_CITIZEN];
    let nameFontSize = 16 / state.paintData.map.zoom;
    let nameLineWidth = 2 / state.paintData.map.zoom;
    ctx.font = `${nameFontSize}px Arial`;
    for (let citizen of state.map.citizens) {
        const paintBehind = citizen.stateInfo.state === "selling" && citizen.stateInfo.type === CITIZEN_STATE_TYPE_WORKING_JOB;
        if (layer === PAINT_LAYER_CITIZEN_BEFORE_HOUSES && !paintBehind) continue;
        if (layer === PAINT_LAYER_CITIZEN_AFTER_HOUSES && paintBehind) continue;
        const paintPos = mapPositionToPaintPosition(citizen.position, paintDataMap);
        const isAtHomeSleeping = citizen.home && citizen.stateInfo.type === CITIZEN_NEED_SLEEP && isCitizenInInteractDistance(citizen, citizen.home.position);
        if (!isAtHomeSleeping) {
            ctx.drawImage(citizenImage, 0, 0, 200, 200,
                paintPos.x - CITIZEN_PAINT_SIZE / 2,
                paintPos.y - CITIZEN_PAINT_SIZE / 2,
                CITIZEN_PAINT_SIZE, CITIZEN_PAINT_SIZE
            );
        }

        paintSleeping(ctx, citizen, { x: paintPos.x, y: paintPos.y - CITIZEN_PAINT_SIZE / 2 - 10 }, state.time);
        paintCitizenJobTool(ctx, citizen, state);

        const nameOffsetX = Math.floor(ctx.measureText(citizen.name).width / 2);
        const nameYSpacing = 5;
        drawTextWithOutline(ctx, citizen.name, paintPos.x - nameOffsetX, paintPos.y - CITIZEN_PAINT_SIZE / 2 - nameYSpacing, "white", "black", nameLineWidth);
    }
}

export function paintSelectionBox(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    if (state.inputData.selected) {
        if (state.inputData.selected.type === "citizen") {
            const citizen: Citizen = state.inputData.selected.object;
            const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.rect(Math.floor(paintPos.x - CITIZEN_PAINT_SIZE / 2), Math.floor(paintPos.y - CITIZEN_PAINT_SIZE / 2), CITIZEN_PAINT_SIZE, CITIZEN_PAINT_SIZE);
            ctx.stroke();
        }
    }
}

function paintSleeping(ctx: CanvasRenderingContext2D, citizen: Citizen, paintPosition: Position, time: number) {
    if (citizen.stateInfo.type !== CITIZEN_NEED_SLEEP) return;
    if (citizen.stateInfo.state !== "sleeping") return;
    const timer = time / 300;
    const swingRadius = 10;
    const fontSize = 14;
    const offsetY = -fontSize * ((Math.sin(timer) + 1) / 2);
    ctx.font = `${fontSize}px Arial`;
    drawTextWithOutline(ctx, "z", paintPosition.x + Math.floor(Math.sin(timer) * swingRadius), paintPosition.y + offsetY);
    drawTextWithOutline(ctx, "Z", paintPosition.x + 5 + Math.floor(Math.sin(timer + 1) * swingRadius), paintPosition.y + offsetY - fontSize);
    drawTextWithOutline(ctx, "Z", paintPosition.x + 10 + Math.floor(Math.sin(timer + 2) * swingRadius), paintPosition.y + offsetY - fontSize * 2);
}

function tickCitizen(citizen: Citizen, state: ChatSimState) {
    citizen.foodPerCent -= 0.0002;
    citizen.energyPerCent -= 16 / state.timPerDay;
    tickCitizenNeeds(citizen, state);
    tickCitizenState(citizen, state);
    citizenMoveToTick(citizen);
}

function tickCitizenState(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.type === CITIZEN_STATE_TYPE_WORKING_JOB) {
        tickCitizenJob(citizen, state);
    }
}

function deleteCitizens(state: ChatSimState) {
    for (let i = state.map.citizens.length - 1; i >= 0; i--) {
        const starved = state.map.citizens[i].foodPerCent < 0;
        const outOfEngergy = state.map.citizens[i].energyPerCent < 0;
        if (starved || outOfEngergy) {
            let deceased = state.map.citizens.splice(i, 1)[0];
            if (starved) console.log(`${deceased.name} died by starving`, deceased);
            if (outOfEngergy) console.log(`${deceased.name} died by over working`, deceased);
            if (deceased.home) {
                if (deceased.home.owner === deceased && state.map.citizens.length > 0) {
                    const randomNewOwnerIndex = Math.floor(Math.random() * state.map.citizens.length);
                    const randomNewOwner = state.map.citizens[randomNewOwnerIndex];
                    deceased.home.owner = randomNewOwner;
                    if (!randomNewOwner.home) {
                        randomNewOwner.home = deceased.home;
                    }
                }
                if (deceased.home.inhabitedBy === deceased) {
                    deceased.home.inhabitedBy = undefined;
                }
            }
        }
    }
}

function citizenMoveToTick(citizen: Citizen) {
    if (citizen.moveTo) {
        const diffX = citizen.moveTo.x - citizen.position.x;
        const diffY = citizen.moveTo.y - citizen.position.y;
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);
        if (citizen.speed - distance > 0) {
            citizen.position.x = citizen.moveTo.x;
            citizen.position.y = citizen.moveTo.y;
            citizen.moveTo = undefined;
        } else {
            const factor = citizen.speed / distance;
            citizen.position.x += diffX * factor;
            citizen.position.y += diffY * factor;
        }
    }
}

export function findClosestFoodMarket(searcher: Citizen, citizens: Citizen[], shouldHaveFood: boolean): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen === searcher) continue;
        const inventoryMushroom = citizen.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
        if (citizen.job && citizen.job.name === CITIZEN_JOB_FOOD_MARKET && citizen.moveTo === undefined && (!shouldHaveFood || (inventoryMushroom && hasFoodMarketStock(citizen)))) {
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
