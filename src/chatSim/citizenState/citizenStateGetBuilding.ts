import { ChatSimState } from "../chatSimModels.js";
import { Building, BuildingType, MAP_OBJECT_BUILDING } from "../map/building.js";
import { citizenAddLogEntry, citizenAddThought, Citizen, citizenStateStackTaskSuccess, citizenMoveTo, TAG_PHYSICALLY_ACTIVE } from "../citizen.js";
import { inventoryMoveItemBetween } from "../inventory.js";
import { INVENTORY_WOOD } from "../inventory.js";
import { createBuildingOnRandomTile, mapGetChunksInDistance } from "../map/map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateGetItem } from "./citizenStateGetItem.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { BUILDING_DATA } from "../jobs/jobBuildingContruction.js";
import { citizenGetEquipmentData, citizenSetEquipment } from "../paintCitizenEquipment.js";
import { playChatSimSound, SOUND_PATH_HAMMER } from "../sounds.js";

export type RepairBuildingData = {
    building: Building,
    tempStartTime?: number,
}
export const CITIZEN_STATE_GET_BUILDING = "GetBuilding";
export const CITIZEN_STATE_GET_BUILDING_CHECK_REQUIREMENTS = "GetBuildingCheckRequirements";
export const CITIZEN_STATE_BUILD_BUILDING = "BuildBuilding";
export const CITIZEN_STATE_REPAIR_BUILDING = "RepairBuilding";

export function onLoadCitizenStateDefaultTickGetBuildingFuntions() {
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_BUILDING] = tickCititzenStateGetBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_GET_BUILDING_CHECK_REQUIREMENTS] = tickCititzenStateGetBuildingCheckRequirements;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_BUILD_BUILDING] = tickCititzenStateBuildBuilding;
    CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[CITIZEN_STATE_REPAIR_BUILDING] = tickCititzenStateRepairBuilding;
}

export function setCitizenStateGetBuilding(citizen: Citizen, buildingType: BuildingType) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_BUILDING, data: buildingType, tags: new Set() });
}

export function setCitizenStateBuildBuilding(citizen: Citizen, building: Building) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_BUILD_BUILDING, data: building, tags: new Set() });
    citizenSetEquipment(citizen, ["Helmet", "WoodPlanks", "Hammer"]);
}

export function setCitizenStateRepairBuilding(citizen: Citizen, building: Building) {
    const data: RepairBuildingData = { building: building };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_REPAIR_BUILDING, data: data, tags: new Set() });
    citizenSetEquipment(citizen, ["WoodPlanks", "Hammer"]);
}

export function findBuilding(citizen: Citizen, buildingType: BuildingType, state: ChatSimState): Building | undefined {
    const chunks = mapGetChunksInDistance(citizen.position, state.map, 600);
    for (let chunk of chunks) {
        const buildings = chunk.tileObjects.get(MAP_OBJECT_BUILDING) as Building[];
        if (!buildings) continue;
        for (let building of buildings) {
            if (building.buildProgress === undefined && building.inhabitedBy === citizen && building.buildingType === buildingType) {
                return building;
            }
        }
    }
    for (let chunk of chunks) {
        const buildings = chunk.tileObjects.get(MAP_OBJECT_BUILDING) as Building[];
        if (!buildings) continue;
        for (let building of buildings) {
            if (building.buildProgress === undefined && building.inhabitedBy === undefined && building.buildingType === buildingType) return building;
        }
    }
    return undefined;
}

function tickCititzenStateRepairBuilding(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const data: RepairBuildingData = citizenState.data;
    const building = data.building;
    if (building.deletedFromMap) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (building.deterioration < 1 / BUILDING_DATA[building.buildingType].woodAmount) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (citizen.moveTo === undefined) {
        const hammer = citizenGetEquipmentData(citizen, "Hammer")!;
        hammer.data = true;
        citizenState.tags.add(TAG_PHYSICALLY_ACTIVE);

        let inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
        if (!inventoryWood || inventoryWood.counter <= 0) {
            inventoryWood = building.inventory.items.find(i => i.name === INVENTORY_WOOD);
        }
        if (inventoryWood && inventoryWood.counter > 0) {
            const repairDuration = 2000;
            if (isCitizenAtPosition(citizen, building.position)) {
                if (data.tempStartTime === undefined) data.tempStartTime = state.time;
                const soundCounter = 3;
                if (((state.time - data.tempStartTime) / repairDuration * soundCounter) % 1 < (state.tickInterval / repairDuration) * soundCounter) {
                    playChatSimSound(SOUND_PATH_HAMMER, citizen.position, state);
                }
                if (data.tempStartTime + repairDuration < state.time) {
                    data.tempStartTime = undefined;
                    building.deterioration -= 1 / BUILDING_DATA[building.buildingType].woodAmount;
                    building.brokeDownTime = undefined;
                    inventoryWood.counter--;
                    citizenAddThought(citizen, `I repaired my building. Current deterioration: ${(building.deterioration * 100).toFixed()}%`, state);
                }
            } else {
                citizenState.tags.delete(TAG_PHYSICALLY_ACTIVE);
                citizenMoveTo(citizen, building.position);
                return;
            }
        } else {
            const totalWood = BUILDING_DATA[building.buildingType].woodAmount;
            const repairAmount = Math.floor(totalWood * building.deterioration);
            hammer.data = false;
            setCitizenStateGetItem(citizen, INVENTORY_WOOD, repairAmount, true);
            return;
        }
    }
}


function tickCititzenStateGetBuilding(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const buildingType = citizenState.data as BuildingType;
    const building = findBuilding(citizen, buildingType, state);
    if (building) {
        citizenStateStackTaskSuccess(citizen);
    } else {
        citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_BUILDING_CHECK_REQUIREMENTS, data: buildingType, tags: new Set() });
    }
}

function tickCititzenStateGetBuildingCheckRequirements(citizen: Citizen, state: ChatSimState) {
    const buildingType = citizen.stateInfo.stack[0].data as BuildingType;
    const building = findBuilding(citizen, buildingType, state);
    if (building) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    const unfinishedBuilding = getCitizenUnfinishedBuilding(citizen, buildingType, state);
    if (unfinishedBuilding) {
        citizenAddThought(citizen, `I have an unfinished ${buildingType}. I go continue building it.`, state);
        setCitizenStateBuildBuilding(citizen, unfinishedBuilding);
        return;
    }
    const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
    const amountRequired = BUILDING_DATA[buildingType].woodAmount;
    if (inventoryWood && inventoryWood.counter >= amountRequired) {
        const buildingPosition = citizen.home ? citizen.home.position : citizen.position;
        const building = createBuildingOnRandomTile(citizen, state, buildingType, buildingPosition);
        if (building) {
            citizenAddThought(citizen, `I have enough wood to build ${buildingType} myself.`, state);
            setCitizenStateBuildBuilding(citizen, building);
        };
    } else {
        citizenAddThought(citizen, `I need ${INVENTORY_WOOD} to build ${buildingType}.`, state);
        citizenSetEquipment(citizen, ["WoodPlanks"]);
        setCitizenStateGetItem(citizen, INVENTORY_WOOD, amountRequired);
    }
}

function tickCititzenStateBuildBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const citizenState = citizen.stateInfo.stack[0];
        const building = citizenState.data as Building;
        if (isCitizenAtPosition(citizen, building.position)) {
            if (building.deletedFromMap) {
                citizenStateStackTaskSuccess(citizen);
                return;
            }

            if (building.buildProgress === undefined) {
                citizenStateStackTaskSuccess(citizen);
                return;
            }
            const hammer = citizenGetEquipmentData(citizen, "Hammer")!;
            hammer.data = true;
            citizenState.tags.add(TAG_PHYSICALLY_ACTIVE);
            const woodRequired = BUILDING_DATA[building.buildingType].woodAmount;
            const progressPerTick = 0.008 / woodRequired;
            if ((building.buildProgress * woodRequired) % 1 < progressPerTick * woodRequired) {
                let buildingInventoryWood = building.inventory.items.find(i => i.name === INVENTORY_WOOD);
                if (!buildingInventoryWood || buildingInventoryWood.counter < 1) {
                    const amountRequiredLeft = Math.floor(woodRequired * (1 - building.buildProgress) + 0.01);
                    const citizenInventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
                    if (citizenInventoryWood && citizenInventoryWood.counter > 0) {
                        inventoryMoveItemBetween(INVENTORY_WOOD, citizen.inventory, building.inventory, amountRequiredLeft);
                        buildingInventoryWood = building.inventory.items.find(i => i.name === INVENTORY_WOOD);
                        if (!buildingInventoryWood) {
                            debugger; // should not be possible?
                            return;
                        }
                    } else {
                        setCitizenStateGetItem(citizen, INVENTORY_WOOD, amountRequiredLeft);
                        return;
                    }
                }
                citizenAddLogEntry(citizen, `building in Progress ${building.buildProgress} `, state);
                if (buildingInventoryWood.counter > 0) {
                    buildingInventoryWood.counter--;
                }
            }
            const soundCounter = 18;
            if ((building.buildProgress * soundCounter) % 1 < progressPerTick * soundCounter) {
                playChatSimSound(SOUND_PATH_HAMMER, citizen.position, state);
            }
            building.buildProgress += progressPerTick;
            building.deterioration -= progressPerTick;
            if (building.deterioration < 0) building.deterioration = 0;
            if (building.buildProgress >= 1) {
                citizenAddLogEntry(citizen, `building finished.`, state);
                building.buildProgress = undefined;
                if (!citizen.home && building.buildingType === "House") {
                    citizen.home = building;
                    building.inhabitedBy = citizen;
                }
                citizenStateStackTaskSuccess(citizen);
            }
        } else {
            citizenState.tags.delete(TAG_PHYSICALLY_ACTIVE);
            citizenMoveTo(citizen, building.position);
        }
    }
}

function getCitizenUnfinishedBuilding(citizen: Citizen, buildingType: BuildingType, state: ChatSimState): Building | undefined {
    const chunks = mapGetChunksInDistance(citizen.position, state.map, 600);
    for (let chunk of chunks) {
        const buildings = chunk.tileObjects.get(MAP_OBJECT_BUILDING) as Building[];
        if (!buildings) continue;
        for (let building of buildings) {
            if (building.buildProgress !== undefined && building.buildingType === buildingType && citizen === building.owner) {
                return building;
            }
        }
    }
    return undefined;
}
