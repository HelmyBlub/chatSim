import { IMAGE_PATH_MUSHROOM, IMAGE_PATH_WOOD_PLANK } from "../../drawHelper.js";
import { Building, BuildingMarket, ChatSimState, Position } from "../chatSimModels.js";
import { Citizen, CitizenStateInfo, getAvaiableInventoryCapacity, isCitizenThinking, moveItemBetweenInventories, setCitizenThought } from "../citizen.js"
import { INVENTORY_MUSHROOM, INVENTORY_WOOD } from "../main.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { citizenChangeJob, CitizenJob } from "./job.js"
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";

export type CitizenJobMarket = CitizenJob & {
    marketBuilding: Building,
    sellItemNames: string[],
}

export type JobMarketStates = "checkInventory" | "getStuffFromHome" | "waitingForCustomers";

type JobMarketStateInfo = CitizenStateInfo & {
    state?: JobMarketStates,
}
const DISPLAY_ITEM_PAINT_DATA: { [key: string]: { size: number, path: string, max: number, offset: Position, offsetPerItem: Position } } = {
    INVENTORY_MUSHROOM: {
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
    },
    INVENTORY_WOOD: {
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
};

export function createMarket(state: ChatSimState, jobname: string, marketBuilding: Building, sellItemNames: string[]): CitizenJobMarket {
    return {
        name: jobname,
        sellItemNames: sellItemNames,
        marketBuilding: marketBuilding,
    }
}

export function paintInventoryOnMarket(ctx: CanvasRenderingContext2D, citizen: Citizen, job: CitizenJobMarket, state: ChatSimState) {
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
    const stateInfo = citizen.stateInfo as JobMarketStateInfo;

    if (stateInfo.state === undefined) {
        if (job.marketBuilding.deterioration >= 1) {
            citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, ["My market buidling broke down."]);
            return;
        }
        stateInfo.state = "checkInventory";
        setCitizenThought(citizen, ["Go to my market and check inventory."], state);
        citizen.moveTo = {
            x: job.marketBuilding.position.x,
            y: job.marketBuilding.position.y,
        }
    }
    if (stateInfo.state === "checkInventory") {
        if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
            for (let itemName of job.sellItemNames) {
                let availableSpace = getAvaiableInventoryCapacity(job.marketBuilding.inventory, itemName);
                if (availableSpace > 0) {
                    const citizenInventory = citizen.inventory.items.find(i => i.name = itemName);
                    if (citizenInventory && citizenInventory.counter > 0) {
                        availableSpace -= moveItemBetweenInventories(itemName, citizen.inventory, job.marketBuilding.inventory);
                    }
                    if (citizen.home && availableSpace > 5) {
                        let canGetStuffFromHome = false;
                        const homeInventory = citizen.home.inventory.items.find(i => i.name = itemName);
                        if (homeInventory && homeInventory.counter > 0) {
                            if (citizen.home.inventory.reservedSpace) {
                                let reserved = citizen.home.inventory.reservedSpace.find(i => i.name === itemName);
                                if (reserved) {
                                    if (homeInventory.counter > reserved.counter) {
                                        canGetStuffFromHome = true;
                                    }
                                } else {
                                    canGetStuffFromHome = true;
                                }
                            }
                        }
                        if (canGetStuffFromHome) {
                            stateInfo.state = "getStuffFromHome";
                            setCitizenThought(citizen, [`I want to add inventory to my market from home.`], state);
                            citizen.moveTo = {
                                x: citizen.home.position.x,
                                y: citizen.home.position.y,
                            }
                            return;
                        }
                    }
                }
            }
        }
        stateInfo.state = "waitingForCustomers";
        citizen.paintBehindBuildings = true;
    }
    if (stateInfo.state === "getStuffFromHome") {
        if (citizen.moveTo === undefined && !isCitizenThinking(citizen, state)) {
            if (!citizen.home) {
                debugger;
                return;
            }
            for (let itemName of job.sellItemNames) {
                let availableSpace = getAvaiableInventoryCapacity(job.marketBuilding.inventory, itemName);
                if (availableSpace > 5) {
                    const homeInventory = citizen.home.inventory.items.find(i => i.name = itemName);
                    if (homeInventory && homeInventory.counter > 0) {
                        let amount = homeInventory.counter;
                        if (citizen.home.inventory.reservedSpace) {
                            let reserved = citizen.home.inventory.reservedSpace.find(i => i.name === itemName);
                            if (reserved) {
                                if (homeInventory.counter > reserved.counter) {
                                    amount -= reserved.counter;
                                }
                            }
                        }
                        if (amount > 0) {
                            moveItemBetweenInventories(itemName, citizen.home.inventory, citizen.inventory, amount);
                        }
                    }
                }
            }
            stateInfo.state = "checkInventory";
        }
    }
    if (stateInfo.state === "waitingForCustomers") {
    }
}
