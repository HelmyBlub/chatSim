import { Building, BuildingType, ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, addCitizenThought, Citizen } from "../citizen.js";
import { inventoryMoveItemBetween } from "../inventory.js";
import { INVENTORY_WOOD } from "../main.js";
import { createBuildingOnRandomTile } from "../map.js";
import { setCitizenStateGetItem } from "./citizenStateGetItem.js";
import { isCitizenInInteractDistance } from "./job.js";
import { BUILDING_DATA } from "./jobBuildingContruction.js";

export const CITIZEN_STATE_GET_BUILDING = "GetBuilding";
export const CITIZEN_STATE_GET_BUILDING_CHECK_REQUIREMENTS = "GetBuildingCheckRequirements";
export const CITIZEN_STATE_BUILD_BUILDING = "BuildBuilding";

export function setCitizenStateGetBuilding(citizen: Citizen, buildingType: BuildingType) {
    citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_BUILDING, data: buildingType });
}

export function tickCititzenStateGetBuilding(citizen: Citizen, state: ChatSimState) {
    const citizenState = citizen.stateInfo.stack[0];
    const buildingType = citizenState.data as BuildingType;
    const building = findBuilding(citizen, buildingType, state);
    if (building) {
        if (!building.inhabitedBy) building.inhabitedBy = citizen;
        citizen.stateInfo.stack.shift();
    } else {
        citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_GET_BUILDING_CHECK_REQUIREMENTS, data: buildingType });
    }
}

export function tickCititzenStateGetBuildingCheckRequirements(citizen: Citizen, state: ChatSimState) {
    const buildingType = citizen.stateInfo.stack[0].data as BuildingType;
    const building = findBuilding(citizen, buildingType, state);
    if (building) {
        citizen.stateInfo.stack.shift();
        return;
    }
    const unfinishedBuilding = getCitizenUnfinishedBuilding(citizen, buildingType, state);
    if (unfinishedBuilding) {
        addCitizenThought(citizen, `I have an unfinished ${buildingType}. I go continue building it.`, state);
        citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_BUILD_BUILDING, data: unfinishedBuilding });
        return;
    }
    const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
    const amountRequired = BUILDING_DATA[buildingType].woodAmount;
    if (inventoryWood && inventoryWood.counter >= amountRequired) {
        const building = createBuildingOnRandomTile(citizen, state, buildingType);
        if (building) {
            addCitizenThought(citizen, `I have enough wood to build ${buildingType} myself.`, state);
            citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_BUILD_BUILDING, data: building })
        };
    } else {
        addCitizenThought(citizen, `I need ${INVENTORY_WOOD} to build ${buildingType}.`, state);
        setCitizenStateGetItem(citizen, INVENTORY_WOOD, amountRequired);
    }
}

export function tickCititzenStateBuildBuilding(citizen: Citizen, state: ChatSimState) {
    if (citizen.moveTo === undefined) {
        const building = citizen.stateInfo.stack[0].data as Building;
        if (isCitizenInInteractDistance(citizen, building.position)) {
            if (building.buildProgress === undefined) {
                citizen.stateInfo.stack.shift();
                return;
            }
            const woodRequired = BUILDING_DATA[building.type].woodAmount;
            const progressPerTick = 0.008 / woodRequired;
            if ((building.buildProgress * woodRequired) % 1 < progressPerTick * woodRequired) {
                let buildingInventoryWood = building.inventory.items.find(i => i.name === INVENTORY_WOOD);
                if (!buildingInventoryWood || buildingInventoryWood.counter < 1) {
                    const amountRequiredLeft = Math.floor(woodRequired * (1 - building.buildProgress));
                    const citizenInventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
                    if (citizenInventoryWood && citizenInventoryWood.counter > 1) {
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
            if (building.buildProgress >= 1) {
                addCitizenLogEntry(citizen, `building finished.`, state);
                building.buildProgress = undefined;
                citizen.stateInfo.stack.shift();
            }
        } else {
            citizen.moveTo = {
                x: building.position.x,
                y: building.position.y,
            }
        }
    }
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

function getCitizenUnfinishedBuilding(citizen: Citizen, buildingType: BuildingType, state: ChatSimState): Building | undefined {
    for (let building of state.map.buildings) {
        if (building.buildProgress !== undefined && building.type === buildingType) {
            return building;
        }
    }
    return undefined;
}
