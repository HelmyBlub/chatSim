import { ChatSimState } from "../chatSimModels.js";
import { Building, BuildingType } from "../building.js";
import { addCitizenLogEntry, addCitizenThought, Citizen, citizenStateStackTaskSuccess } from "../citizen.js";
import { inventoryMoveItemBetween } from "../inventory.js";
import { INVENTORY_WOOD } from "../main.js";
import { createBuildingOnRandomTile } from "../map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateGetItem } from "./citizenStateGetItem.js";
import { isCitizenAtPosition } from "../jobs/job.js";
import { BUILDING_DATA } from "../jobs/jobBuildingContruction.js";
import { citizenGetEquipmentData, citizenSetEquipment } from "../paintCitizenEquipment.js";

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
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_BUILDING, data: buildingType });
}

export function setCitizenStateBuildBuilding(citizen: Citizen, building: Building) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_BUILD_BUILDING, data: building });
    citizenSetEquipment(citizen, ["Helmet", "WoodPlanks", "Hammer"]);
}

export function setCitizenStateRepairBuilding(citizen: Citizen, building: Building) {
    const data: RepairBuildingData = { building: building };
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_REPAIR_BUILDING, data: data });
    citizenSetEquipment(citizen, ["WoodPlanks", "Hammer"]);
}

export function findBuilding(citizen: Citizen, buildingType: BuildingType, state: ChatSimState): Building | undefined {
    for (let building of state.map.buildings) {
        if (building.buildProgress === undefined && building.inhabitedBy === citizen && building.type === buildingType) {
            return building;
        }
    }
    for (let building of state.map.buildings) {
        if (building.buildProgress === undefined && building.inhabitedBy === undefined && building.type === buildingType) return building;
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
    if (building.deterioration < 1 / BUILDING_DATA[building.type].woodAmount) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (citizen.moveTo === undefined) {
        const hammer = citizenGetEquipmentData(citizen, "Hammer")!;
        hammer.data = true;
        let inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
        if (!inventoryWood || inventoryWood.counter <= 0) {
            inventoryWood = building.inventory.items.find(i => i.name === INVENTORY_WOOD);
        }
        if (inventoryWood && inventoryWood.counter > 0) {
            const repairDuration = 1000;
            if (isCitizenAtPosition(citizen, building.position)) {
                if (data.tempStartTime === undefined) data.tempStartTime = state.time;
                if (data.tempStartTime + repairDuration < state.time) {
                    data.tempStartTime = undefined;
                    building.deterioration -= 1 / BUILDING_DATA[building.type].woodAmount;
                    building.brokeDownTime = undefined;
                    inventoryWood.counter--;
                    addCitizenThought(citizen, `I repaired my building. Current deterioration: ${(building.deterioration * 100).toFixed()}%`, state);
                }
            } else {
                citizen.moveTo = {
                    x: building.position.x,
                    y: building.position.y,
                }
                return;
            }
        } else {
            const totalWood = BUILDING_DATA[building.type].woodAmount;
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
        citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_BUILDING_CHECK_REQUIREMENTS, data: buildingType });
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
        addCitizenThought(citizen, `I have an unfinished ${buildingType}. I go continue building it.`, state);
        setCitizenStateBuildBuilding(citizen, unfinishedBuilding);
        return;
    }
    const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
    const amountRequired = BUILDING_DATA[buildingType].woodAmount;
    if (inventoryWood && inventoryWood.counter >= amountRequired) {
        const building = createBuildingOnRandomTile(citizen, state, buildingType);
        if (building) {
            addCitizenThought(citizen, `I have enough wood to build ${buildingType} myself.`, state);
            setCitizenStateBuildBuilding(citizen, building);
        };
    } else {
        addCitizenThought(citizen, `I need ${INVENTORY_WOOD} to build ${buildingType}.`, state);
        citizenSetEquipment(citizen, ["WoodPlanks"]);
        setCitizenStateGetItem(citizen, INVENTORY_WOOD, amountRequired);
    }
}

function tickCititzenStateBuildBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const building = citizen.stateInfo.stack[0].data as Building;
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
            const woodRequired = BUILDING_DATA[building.type].woodAmount;
            const progressPerTick = 0.008 / woodRequired;
            if ((building.buildProgress * woodRequired) % 1 < progressPerTick * woodRequired) {
                let buildingInventoryWood = building.inventory.items.find(i => i.name === INVENTORY_WOOD);
                if (!buildingInventoryWood || buildingInventoryWood.counter < 1) {
                    const amountRequiredLeft = Math.floor(woodRequired * (1 - building.buildProgress));
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
                addCitizenLogEntry(citizen, `building in Progress ${building.buildProgress} `, state);
                if (buildingInventoryWood.counter > 0) buildingInventoryWood.counter--;
            }
            building.buildProgress += progressPerTick;
            building.deterioration -= progressPerTick;
            if (building.deterioration < 0) building.deterioration = 0;
            if (building.buildProgress >= 1) {
                addCitizenLogEntry(citizen, `building finished.`, state);
                building.buildProgress = undefined;
                if (!citizen.home && building.type === "House") {
                    citizen.home = building;
                    building.inhabitedBy = citizen;
                }
                citizenStateStackTaskSuccess(citizen);
            }
        } else {
            citizen.moveTo = {
                x: building.position.x,
                y: building.position.y,
            }
        }
    }
}

function getCitizenUnfinishedBuilding(citizen: Citizen, buildingType: BuildingType, state: ChatSimState): Building | undefined {
    for (let building of state.map.buildings) {
        if (building.buildProgress !== undefined && building.type === buildingType && citizen === building.owner) {
            return building;
        }
    }
    return undefined;
}
