import { ChatSimState } from "../chatSimModels.js";
import { Building, BuildingMarket, MAP_OBJECT_BUILDING } from "../map/mapObjectBuilding.js";
import { citizenAddThought, Citizen, citizenStateStackTaskSuccess, citizenMoveTo, citizenMoveToRandom, citizenStateStackTaskSuccessWithData, CitizenStateSuccessData, citizenGetVisionDistance, citizenCanCarryMore, citizenCheckTodoList, citizenMemorizeHomeInventory } from "../citizen.js";
import { inventoryGetAvailableCapacity, inventoryGetPossibleTakeOutAmount, inventoryMoveItemBetween } from "../inventory.js";
import { calculateDistance } from "../main.js";
import { INVENTORY_MUSHROOM, INVENTORY_WOOD } from "../inventory.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateGatherMushroom } from "./citizenStateGatherMushroom.js";
import { setCitizenStateGatherWood } from "./citizenStateGatherWood.js";
import { setCitizenStateTradeItemWithMarket } from "./citizenStateMarket.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { mapGetChunksInDistance } from "../map/map.js";
import { citizenSetEquipment } from "../paintCitizenEquipment.js";
import { CITIZEN_NEED_STARVING } from "../citizenNeeds/citizenNeedStarving.js";
import { MAP_OBJECT_TREE, Tree } from "../map/mapObjectTree.js";
import { MAP_OBJECT_MUSHROOM, Mushroom } from "../map/mapObjectMushroom.js";
import { MAP_OBJECTS_FUNCTIONS, mapGetMaxObjectVisionDistanceFactor } from "../map/mapObject.js";

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
        type: string,
        intention?: string,
        condition?: SearchCondition,
    }[],
    lastSearchDirection?: number,
}

export type CitizenStateSearchSuccessData = CitizenStateSuccessData & {
    found: any,
    foundType: string,
    intention?: string,
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
            if (citizen.home === data.building) {
                citizenMemorizeHomeInventory(citizen);
            }
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
            if (citizen.home === data.building) {
                citizenMemorizeHomeInventory(citizen);
            }
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
        const availableAmountAtHome = inventoryGetPossibleTakeOutAmount(item.name, citizen.home.inventory, item.ignoreReserved, citizen.memory.home.rememberedItems);
        if (availableAmountAtHome > 0) {
            citizenAddThought(citizen, `I do have ${item.name} at home. I go get it.`, state);
            const wantedAmount = Math.min(openAmount, availableAmountAtHome);
            setCitizenStateGetItemFromBuilding(citizen, citizen.home, item.name, wantedAmount);
            return;
        }
    }
    const chunks = mapGetChunksInDistance(citizen.position, state.map, 600);
    for (let chunk of chunks) {
        const buildings = chunk.tileObjects.get(MAP_OBJECT_BUILDING) as Building[];
        if (!buildings) continue;
        for (let building of buildings) {
            if (building.inhabitedBy === citizen && building !== citizen.home) {
                const availableAmount = inventoryGetPossibleTakeOutAmount(item.name, building.inventory, item.ignoreReserved);
                if (availableAmount > 0) {
                    const wantedAmount = Math.min(openAmount, availableAmount);
                    citizenAddThought(citizen, `I do have ${item.name} at my ${building.buildingType}. I go get it.`, state);
                    setCitizenStateGetItemFromBuilding(citizen, building, item.name, wantedAmount);
                    return;
                }
            }
        }
    }

    citizenAddThought(citizen, `I will search for ${item.name}.`, state);
    setCitizenStateSearchItem(citizen, item.name, item.amount);
}

function buildingSellsItem(building: Building, citizen: Citizen, state: ChatSimState, itemName: string): boolean {
    if (building.deterioration >= 1) return false;
    if (building.buildingType !== "Market") return false;
    if (building.inhabitedBy === undefined) return false;
    const inventory = building.inventory.items.find(i => i.name === itemName);
    if (!inventory || inventory.counter === 0) return false;
    if (!isCitizenAtPosition(building.inhabitedBy, building.position)) return false;
    return true;
}

function tickCitizenStateSearchItem(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const citizenState = citizen.stateInfo.stack[0];
        const data: CitizenStateSearchItemData = citizenState.data;
        const itemName: string = data.name;
        const returnedData = citizenState.returnedData as CitizenStateSearchSuccessData;
        if (returnedData) {
            if (returnedData.foundType === "buildings") {
                if (returnedData.intention === undefined) {
                    const market = returnedData.found as BuildingMarket;
                    const item = citizen.inventory.items.find(i => i.name === itemName);
                    let openAmount = item ? data.amount! - item.counter : data.amount!;
                    citizenAddThought(citizen, `I will buy ${itemName} at ${market.inhabitedBy!.name}.`, state);
                    setCitizenStateTradeItemWithMarket(citizen, market, false, itemName, openAmount);
                    return;
                } else if (returnedData.intention === "steal") {
                    const building = returnedData.found as Building;
                    citizenAddThought(citizen, `I will steal ${itemName} from building inhabited by ${building.inhabitedBy?.name}.`, state);
                    setCitizenStateGetItemFromBuilding(citizen, building, itemName, 1);
                    citizen.stealCounter++;
                    state.stealCounter++;
                    return;
                } else {
                    throw "unknwon case";
                }
            } else if (returnedData.foundType === MAP_OBJECT_MUSHROOM) {
                const mushroom = returnedData.found as Mushroom;
                setCitizenStateGatherMushroom(citizen, mushroom.position);
            } else if (returnedData.foundType === MAP_OBJECT_TREE) {
                const tree = returnedData.found as Tree;
                setCitizenStateGatherWood(citizen, tree.position, data.amount);
            }
        } else if (citizenState.subState === "searching") {
            const item = citizen.inventory.items.find(i => i.name === itemName);
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
                searchData.searchFor.push({ type: MAP_OBJECT_MUSHROOM });

                if (citizen.money < 4 && citizen.happinessData.happiness < 0 && citizen.stateInfo.type === CITIZEN_NEED_STARVING) {
                    if (!data.firstThoughtsDone) citizenAddThought(citizen, `I am so hungry i would steal for ${INVENTORY_MUSHROOM}.`, state);
                    searchData.searchFor.push({
                        type: MAP_OBJECT_BUILDING, intention: "steal", condition:
                            (building: Building, citizen: Citizen, state: ChatSimState) => {
                                let inventoryItem = building.inventory.items.find(i => i.name === INVENTORY_MUSHROOM);
                                return inventoryItem !== undefined && inventoryItem.counter > 0;
                            }
                    });
                }
            }
            if (itemName === INVENTORY_WOOD) {
                if (!data.firstThoughtsDone) citizenAddThought(citizen, `I will look out for trees.`, state);
                searchData.searchFor.push({ type: MAP_OBJECT_TREE });
            }
            if (citizen.money >= 2 && !data.ignoreMarkets && data.amount !== undefined) {
                if (!data.firstThoughtsDone) citizenAddThought(citizen, `I will look out for Markets selling ${itemName}.`, state);
                searchData.searchFor.push({
                    type: MAP_OBJECT_BUILDING, condition:
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
            const found = getClosest(citizen, search.type, state, search.condition);
            if (found) {
                const successData: CitizenStateSearchSuccessData = { type: CITIZEN_STATE_SEARCH, found: found, foundType: search.type, intention: search.intention };
                citizenStateStackTaskSuccessWithData(citizen, successData);
                return;
            }
        }
        data.lastSearchDirection = citizenMoveToRandom(citizen, state, data.lastSearchDirection);
    }
}

function getClosest(citizen: Citizen, key: string, state: ChatSimState, searchCondition: SearchCondition | undefined = undefined): any | undefined {
    let closest: any | undefined = undefined;
    let closestDistance: number = 0;
    const baseVisionDistance = citizenGetVisionDistance(citizen, state);
    const lightModifiedVisionDistance = baseVisionDistance * state.map.lightPerCent;
    const objectTypeVisionDistance = lightModifiedVisionDistance * mapGetMaxObjectVisionDistanceFactor(key);
    const chunks = mapGetChunksInDistance(citizen.position, state.map, objectTypeVisionDistance);
    const getObjectSpecificVisionDistance = MAP_OBJECTS_FUNCTIONS[key].getVisionDistanceFactor;
    for (let chunk of chunks) {
        const mapObjects = chunk.tileObjects.get(key);
        if (!mapObjects) continue;
        let objectVisionDistance = objectTypeVisionDistance;
        for (let object of mapObjects) {
            const distance = calculateDistance(citizen.position, (object as any).position);
            if (getObjectSpecificVisionDistance) {
                objectVisionDistance = lightModifiedVisionDistance * getObjectSpecificVisionDistance(object);
            }
            if (distance > objectVisionDistance) continue;
            if (closest !== undefined && distance > closestDistance) continue;
            if (searchCondition && !searchCondition(object, citizen, state)) continue;
            closest = object;
            closestDistance = distance;
        }
    }
    return closest;
}
