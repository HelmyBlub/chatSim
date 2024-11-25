import { IMAGE_PATH_MUSHROOM, IMAGE_PATH_WOOD_PLANK } from "../../drawHelper.js";
import { BuildingMarket, ChatSimState, Position } from "../chatSimModels.js";
import { Citizen, CitizenStateInfo, isCitizenThinking, setCitizenThought } from "../citizen.js"
import { inventoryGetAvaiableCapacity, inventoryGetMissingReserved, inventoryGetPossibleTakeOutAmount, inventoryMoveItemBetween } from "../inventory.js";
import { INVENTORY_MUSHROOM, INVENTORY_WOOD } from "../main.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateGetBuilding } from "./citizenStateGetBuilding.js";
import { setCitizenStateGetItemFromBuilding } from "./citizenStateGetItem.js";
import { CitizenJob, findMarketBuilding, isCitizenInInteractDistance } from "./job.js"

export type CitizenJobMarket = CitizenJob & {
    sellItemNames: string[],
}

export type JobMarketStates = "checkInventory" | "waitingForCustomers" | "getMarketBuilding";

type JobMarketStateInfo = CitizenStateInfo & {
    state: JobMarketStates,
}

const STRING_TO_STATE_MAPPING: { [key: string]: (citizen: Citizen, job: CitizenJob, state: ChatSimState) => void } = {
    "checkInventory": stateCheckInventory,
    "waitingForCustomers": stateWaitingForCustomers,
    "getMarketBuilding": stateGetMarketBuilding,
};

const DISPLAY_ITEM_PAINT_DATA: { [key: string]: { size: number, path: string, max: number, offset: Position, offsetPerItem: Position } } = {
};

export function onLoadDisplayItemPaintData() {
    DISPLAY_ITEM_PAINT_DATA[INVENTORY_MUSHROOM] = {
        size: 14,
        max: 13,
        path: IMAGE_PATH_MUSHROOM,
        offset: {
            x: - 38,
            y: -2,
        },
        offsetPerItem: {
            x: 5,
            y: 0
        }
    };
    DISPLAY_ITEM_PAINT_DATA[INVENTORY_WOOD] = {
        size: 30,
        max: 10,
        path: IMAGE_PATH_WOOD_PLANK,
        offset: {
            x: - 38,
            y: -2,
        },
        offsetPerItem: {
            x: 0,
            y: -2,
        }
    }
}

export function createJobMarket(state: ChatSimState, jobname: string, sellItemNames: string[]): CitizenJobMarket {
    return {
        name: jobname,
        sellItemNames: sellItemNames,
    }
}

export function paintInventoryOnMarket(ctx: CanvasRenderingContext2D, citizen: Citizen, job: CitizenJobMarket, state: ChatSimState) {
    if (!job.marketBuilding) return;
    const market = job.marketBuilding as BuildingMarket;
    if (!market.displayedItem) return;
    const data = DISPLAY_ITEM_PAINT_DATA[market.displayedItem];

    const paintPos = mapPositionToPaintPosition(job.marketBuilding.position, state.paintData.map);
    const item = job.marketBuilding.inventory.items.find(i => i.name === market.displayedItem);
    if (!item || item.counter === 0) return;
    const image = state.images[data.path];
    for (let i = 0; i < Math.min(data.max, item.counter); i++) {
        ctx.drawImage(image, 0, 0, image.width, image.height,
            paintPos.x + i * data.offsetPerItem.x + data.offset.x,
            paintPos.y + i * data.offsetPerItem.y + data.offset.y,
            data.size, data.size
        );
    }
}

export function tickMarket(citizen: Citizen, job: CitizenJobMarket, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (!job.marketBuilding || job.marketBuilding.deterioration >= 1) {
            citizen.stateInfo.stack.unshift({ state: "getMarketBuilding" });
        } else {
            setCitizenThought(citizen, ["Go to my market and check inventory."], state);
            citizen.stateInfo.stack.unshift({ state: "checkInventory" });
            citizen.moveTo = {
                x: job.marketBuilding.position.x,
                y: job.marketBuilding.position.y,
            }
        }
    } else {
        const stateInfo = citizen.stateInfo.stack[0] as JobMarketStateInfo;
        const stateFunction = STRING_TO_STATE_MAPPING[stateInfo.state];
        if (stateFunction) {
            stateFunction(citizen, job, state);
        } else {
            CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[stateInfo.state](citizen, state);
        }
    }
}

function stateGetMarketBuilding(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const stateInfo = citizen.stateInfo as JobMarketStateInfo;
    const market = findMarketBuilding(citizen, state);
    if (market) {
        market.inhabitedBy = citizen;
        job.marketBuilding = market;
        stateInfo.state = "checkInventory";
        setCitizenThought(citizen, ["Go to my market and check inventory."], state);
        citizen.moveTo = {
            x: job.marketBuilding.position.x,
            y: job.marketBuilding.position.y,
        }
    } else {
        setCitizenThought(citizen, ["I do not have a market building. I need to get one."], state);
        setCitizenStateGetBuilding(citizen, "Market");
    }
}

function stateWaitingForCustomers(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
}

function stateCheckInventory(citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
        const jobMarket = job as CitizenJobMarket;
        const stateInfo = citizen.stateInfo.stack[0] as JobMarketStateInfo;
        if (!job.marketBuilding) {
            citizen.stateInfo.stack.shift();
            return;
        }
        if (isCitizenInInteractDistance(citizen, job.marketBuilding.position)) {
            const market = job.marketBuilding as BuildingMarket;
            if (market.displayedItem === undefined && jobMarket.sellItemNames.length > 0) {
                market.displayedItem = jobMarket.sellItemNames[0];
            }
            for (let itemName of jobMarket.sellItemNames) {
                let availableSpace = inventoryGetMissingReserved(job.marketBuilding.inventory, itemName);
                if (availableSpace > 0) {
                    const citizenInventory = citizen.inventory.items.find(i => i.name = itemName);
                    if (citizenInventory && citizenInventory.counter > 0) {
                        availableSpace -= inventoryMoveItemBetween(itemName, citizen.inventory, job.marketBuilding.inventory);
                    }
                    if (citizen.home && availableSpace > 5) {
                        const availableAtHome = inventoryGetPossibleTakeOutAmount(itemName, citizen.home.inventory);
                        if (availableAtHome > 5) {
                            setCitizenThought(citizen, [`I want to add inventory to my market from home.`], state);
                            setCitizenStateGetItemFromBuilding(citizen, citizen.home, itemName, availableAtHome);
                            return;
                        }
                    }
                }
            }
            stateInfo.state = "waitingForCustomers";
            citizen.paintBehindBuildings = true;
        } else {
            citizen.moveTo = {
                x: job.marketBuilding.position.x,
                y: job.marketBuilding.position.y,
            }
        }
    }
}
