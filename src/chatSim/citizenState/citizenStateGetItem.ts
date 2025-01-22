import { ChatSimState, Mushroom, Position } from "../chatSimModels.js";
import { Building, BuildingMarket } from "../building.js";
import { citizenAddThought, Citizen, citizenStateStackTaskSuccess, citizenMoveTo, citizenMoveToRandom, citizenStateStackTaskSuccessWithData, CitizenStateSuccessData, citizenGetVisionDistance, citizenCanCarryMore, citizenCheckTodoList } from "../citizen.js";
import { inventoryGetAvailableCapacity, inventoryGetPossibleTakeOutAmount, inventoryMoveItemBetween } from "../inventory.js";
import { calculateDistance } from "../main.js";
import { INVENTORY_MUSHROOM, INVENTORY_WOOD } from "../inventory.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateGatherMushroom } from "./citizenStateGatherMushroom.js";
import { setCitizenStateGatherWood } from "./citizenStateGatherWood.js";
import { setCitizenStateTradeItemWithMarket } from "./citizenStateMarket.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { MapChunk, mapGetChunksInDistance } from "../map.js";
import { citizenSetEquipment } from "../paintCitizenEquipment.js";

export type CitizenStateGetItemData = {
    name: string,
    amount: number,
    ignoreReserved?: boolean,
    ignoreHome?: boolean,
}

export type CitizenStateSearchItemData = {
    name: string,
    ignoreMarkets?: boolean,
    amount?: number,
    firstThoughtsDone?: boolean,
}

export type CitizenStateItemAndBuildingData = {
    itemName: string,
    itemAmount?: number,
    building: Building,
    stepState?: string,
    stepStartTime?: number,
}

export type CitizenStateSearchData = {
    searchFor: {
        type: keyof MapChunk,
        viewDistance: number,
        condition?: SearchCondition,
    }[],
    lastSearchDirection?: number,
}

export type CitizenStateSearchSuccessData = CitizenStateSuccessData & {
    found: any,
    foundType: keyof MapChunk,
}

type SearchCondition = (object: any, citizen: Citizen, state: ChatSimState) => boolean;

export const CITIZEN_STATE_GET_ITEM = "GetItem";
export const CITIZEN_STATE_GET_ITEM_FROM_BUILDING = "GetItemFromBuilding";
export const CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING = "TransportItemToBuilding";
export const CITIZEN_STATE_SEARCH = "Search";
export const CITIZEN_STATE_SEARCH_ITEM = "SearchItem";

export function onLoadCitizenStateDefaultTickGetItemFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM] = tickCititzenStateGetItem;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_ITEM_FROM_BUILDING] = tickCitizenStateGetItemFromBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING] = tickCitizenStateTransportItemToBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_SEARCH] = tickCitizenStateSearch;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_SEARCH_ITEM] = tickCitizenStateSearchItem;
}

export function setCitizenStateGetItem(citizen: Citizen, itemName: string, itemAmount: number, ignoreReserved: boolean = false, ignoreHome: boolean = false) {
    const data: CitizenStateGetItemData = { name: itemName, amount: itemAmount, ignoreReserved: ignoreReserved, ignoreHome: ignoreHome };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_ITEM, data: data, tags: new Set() });
}

export function setCitizenStateSearchItem(citizen: Citizen, itemName: string, amount?: number, ignoreMarkets?: boolean) {
    const data: CitizenStateSearchItemData = {
        name: itemName,
        ignoreMarkets,
        amount,
    }
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_SEARCH_ITEM, data: data, tags: new Set() });
}

export function setCitizenStateSearch(citizen: Citizen, data: CitizenStateSearchData) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_SEARCH, data: data, tags: new Set() });
}

export function setCitizenStateGetItemFromBuilding(citizen: Citizen, building: Building, itemName: string, itemAmount: number) {
    const data: CitizenStateItemAndBuildingData = { itemName: itemName, itemAmount: itemAmount, building: building };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_ITEM_FROM_BUILDING, data: data, tags: new Set() });
}

export function setCitizenStateTransportItemToBuilding(citizen: Citizen, building: Building, itemName: string, itemAmount?: number) {
    const data: CitizenStateItemAndBuildingData = { itemName: itemName, itemAmount: itemAmount, building: building };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_TRANSPORT_ITEM_TO_BUILDING, data: data, tags: new Set() });
}

function tickCitizenStateTransportItemToBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateItemAndBuildingData;
        if (isCitizenAtPosition(citizen, data.building.position)) {
            inventoryMoveItemBetween(data.itemName, citizen.inventory, data.building.inventory, data.itemAmount);
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizenMoveTo(citizen, data.building.position);
        }
    }
}

function tickCitizenStateGetItemFromBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateItemAndBuildingData;
        if (isCitizenAtPosition(citizen, data.building.position)) {
            inventoryMoveItemBetween(data.itemName, data.building.inventory, citizen.inventory, data.itemAmount);
            citizenStateStackTaskSuccess(citizen);
            return;
        } else {
            citizenMoveTo(citizen, data.building.position);
        }
    }
}

function tickCititzenStateGetItem(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const item = citizenState.data as CitizenStateGetItemData;
    const citizenInventory = citizen.inventory.items.find(i => i.name === item.name);
    let openAmount = item.amount;
    if (citizenInventory) {
        if (citizenInventory.counter >= item.amount) {
            citizenStateStackTaskSuccess(citizen);
            return;
        }
        openAmount -= citizenInventory.counter;
    }
    if (citizen.home && !item.ignoreHome) {
        const availableAmountAtHome = inventoryGetPossibleTakeOutAmount(item.name, citizen.home.inventory, item.ignoreReserved);
        if (availableAmountAtHome > 0) {
            citizenAddThought(citizen, `I do have ${item.name} at home. I go get it.`, state);
            const wantedAmount = Math.min(openAmount, availableAmountAtHome);
            setCitizenStateGetItemFromBuilding(citizen, citizen.home, item.name, wantedAmount);
            return;
        }
    }
    const chunks = mapGetChunksInDistance(citizen.position, state.map, 600);
    for (let chunk of chunks) {
        for (let building of chunk.buildings) {
            if (building.inhabitedBy === citizen && building !== citizen.home) {
                const availableAmount = inventoryGetPossibleTakeOutAmount(item.name, building.inventory, item.ignoreReserved);
                if (availableAmount > 0) {
                    const wantedAmount = Math.min(openAmount, availableAmount);
                    citizenAddThought(citizen, `I do have ${item.name} at my ${building.type}. I go get it.`, state);
                    setCitizenStateGetItemFromBuilding(citizen, building, item.name, wantedAmount);
                    return;
                }
            }
        }
    }

    if (item.name === INVENTORY_MUSHROOM) {
        citizenAddThought(citizen, `I will search for ${item.name}.`, state);
        setCitizenStateSearchItem(citizen, item.name, item.amount);
        return;
    }
    if (citizen.money >= 2) {
        const market = findClosestOpenMarketWhichSellsItem(citizen, item.name, state) as BuildingMarket;
        if (market) {
            citizenAddThought(citizen, `I will buy ${item.name} at ${market.inhabitedBy!.name}.`, state);
            setCitizenStateTradeItemWithMarket(citizen, market, false, item.name, item.amount);
            return;
        }
    }

    if (item.name === INVENTORY_WOOD) {
        citizenAddThought(citizen, `I did not see a way to get ${item.name}. Let's gather it myself.`, state);
        setCitizenStateGatherWood(citizen, item.amount);
        return;
    }
}

function buildingSellsItem(building: Building, citizen: Citizen, state: ChatSimState, itemName: string): boolean {
    if (building.deterioration >= 1) return false;
    if (building.type !== "Market") return false;
    if (building.inhabitedBy === undefined) return false;
    const inventory = building.inventory.items.find(i => i.name === itemName);
    if (!inventory || inventory.counter === 0) return false;
    if (!isCitizenAtPosition(building.inhabitedBy, building.position)) return false;
    return true;
}

function findClosestOpenMarketWhichSellsItem(citizen: Citizen, itemName: string, state: ChatSimState): Building | undefined {
    let closest = undefined;
    let closestDistance: number = -1;
    const chunks = mapGetChunksInDistance(citizen.position, state.map, 800);
    for (let chunk of chunks) {
        for (let building of chunk.buildings) {
            if (building.deterioration >= 1) continue;
            if (building.type !== "Market") continue;
            if (building.inhabitedBy === undefined) continue;
            const inventory = building.inventory.items.find(i => i.name === itemName);
            if (!inventory || inventory.counter === 0) continue;
            if (!isCitizenAtPosition(building.inhabitedBy, building.position)) continue;
            if (!closest) {
                closest = building;
                closestDistance = calculateDistance(building.position, citizen.position);
            } else {
                const tempDistance = calculateDistance(building.position, citizen.position);
                if (tempDistance < closestDistance) {
                    closest = building;
                    closestDistance = tempDistance;
                }
            }
        }
    }
    return closest;
}

function tickCitizenStateSearchItem(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const citizenState = citizen.stateInfo.stack[0];
        const data: CitizenStateSearchItemData = citizenState.data;
        const itemName: string = data.name;
        const returnedData = citizenState.returnedData as CitizenStateSearchSuccessData;
        if (returnedData) {
            if (returnedData.foundType === "buildings") {
                const market = returnedData.found as BuildingMarket;
                citizenAddThought(citizen, `I will buy ${itemName} at ${market.inhabitedBy!.name}.`, state);
                setCitizenStateTradeItemWithMarket(citizen, market, false, itemName, data.amount!);
                return;
            } else if (returnedData.foundType === "mushrooms") {
                const mushroom = returnedData.found as Mushroom;
                setCitizenStateGatherMushroom(citizen, mushroom.position);
            }
        } else if (citizenState.subState === "searching") {
            let item = citizen.inventory.items.find(i => i.name === itemName);
            const canCarryMore = inventoryGetAvailableCapacity(citizen.inventory, INVENTORY_MUSHROOM) > 0;
            const reachedLimit = !canCarryMore || (item && data.amount !== undefined && item.counter >= data.amount);
            if (reachedLimit) {
                citizenStateStackTaskSuccess(citizen);
            } else {
                const switchTodo = citizenCheckTodoList(citizen, state, 4);
                if (switchTodo) return;
                citizenState.subState = undefined;
            }
        } else {
            const searchData: CitizenStateSearchData = { searchFor: [] };
            const viewDistance = citizenGetVisionDistance(citizen, state);
            if (itemName === INVENTORY_MUSHROOM) {
                citizenSetEquipment(citizen, ["Basket"]);
                if (!data.firstThoughtsDone) citizenAddThought(citizen, `I will look out for growing ${INVENTORY_MUSHROOM}.`, state);
                searchData.searchFor.push({ type: "mushrooms", viewDistance: viewDistance });
            }
            if (itemName === INVENTORY_WOOD) searchData.searchFor.push({ type: "trees", viewDistance: viewDistance });
            if (citizen.money >= 2 && !data.ignoreMarkets && data.amount !== undefined) {
                if (!data.firstThoughtsDone) citizenAddThought(citizen, `I will look out for Markets selling ${INVENTORY_MUSHROOM}.`, state);
                searchData.searchFor.push({
                    type: "buildings", viewDistance: viewDistance, condition:
                        (building: Building, citizen: Citizen, state: ChatSimState) => {
                            return buildingSellsItem(building, citizen, state, itemName);
                        }
                });
            }
            citizenState.subState = "searching";
            data.firstThoughtsDone = true;
            setCitizenStateSearch(citizen, searchData);
        }
    }
}

function tickCitizenStateSearch(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const data = citizen.stateInfo.stack[0].data as CitizenStateSearchData;
        for (let search of data.searchFor) {
            const found = getClosest(citizen, search.viewDistance, search.type, state, search.condition);
            if (found) {
                const successData: CitizenStateSearchSuccessData = { type: CITIZEN_STATE_SEARCH, found: found, foundType: search.type };
                citizenStateStackTaskSuccessWithData(citizen, successData);
                return;
            }
        }
        data.lastSearchDirection = citizenMoveToRandom(citizen, state, data.lastSearchDirection);
    }
}

function getClosest(citizen: Citizen, visionDistance: number, key: keyof MapChunk, state: ChatSimState, searchCondition: SearchCondition | undefined = undefined): any | undefined {
    let closest: any | undefined = undefined;
    let closestDistance: number = 0;
    const chunks = mapGetChunksInDistance(citizen.position, state.map, visionDistance);
    for (let chunk of chunks) {
        const arrayProperty = chunk[key];
        if (!Array.isArray(arrayProperty)) continue;
        for (let object of arrayProperty) {
            const distance = calculateDistance(citizen.position, (object as any).position);
            if (distance > visionDistance) continue;
            if (closest !== undefined && distance > closestDistance) continue;
            if (searchCondition && !searchCondition(object, citizen, state)) continue;
            closest = object;
            closestDistance = distance;
        }
    }
    return closest;
}
