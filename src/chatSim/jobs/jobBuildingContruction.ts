import { Building, ChatSimState, BuildingType } from "../chatSimModels.js";
import { Citizen } from "../citizen.js";
import { CitizenJob } from "./job.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { IMAGE_PATH_HELMET } from "../../drawHelper.js";
import { setCitizenStateBuildBuilding } from "./citizenStateGetBuilding.js";
import { INVENTORY_WOOD } from "../main.js";
import { createBuildingOnRandomTile } from "../map.js";
import { setCitizenStateGetItem } from "./citizenStateGetItem.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";

type JobContructionStateInfo = {
}

export type CitizenJobBuildingConstruction = CitizenJob & {
}

export const CITIZEN_JOB_BUILDING_CONSTRUCTION = "Building Construction";
export const BUILDING_DATA: { [key: string]: { woodAmount: number } } = {
    "House": {
        woodAmount: 5,
    },
    "Market": {
        woodAmount: 2,
    }
}

export function loadCitizenJobHouseConstruction(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_BUILDING_CONSTRUCTION] = {
        create: create,
        tick: tick,
        paintTool: paintTool,
    };
}

function create(state: ChatSimState): CitizenJobBuildingConstruction {
    return {
        name: CITIZEN_JOB_BUILDING_CONSTRUCTION,
    }
}

function paintTool(ctx: CanvasRenderingContext2D, citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const axeSize = 20;
    ctx.drawImage(state.images[IMAGE_PATH_HELMET], 0, 0, 100, 100, paintPos.x - axeSize / 2, paintPos.y - 33, axeSize, axeSize);
}

function tick(citizen: Citizen, job: CitizenJobBuildingConstruction, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        const unfinished = getCitizenUnfinishedBuilding(citizen, state);
        if (unfinished) {
            setCitizenStateBuildBuilding(citizen, unfinished);
        } else {
            let buildType: BuildingType;
            if (!citizen.home) {
                buildType = "House";
            } else {
                buildType = Math.random() < 0.5 ? "House" : "Market";
            }
            const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
            if (inventoryWood && inventoryWood.counter >= BUILDING_DATA[buildType].woodAmount) {
                const building = createBuildingOnRandomTile(citizen, state, buildType);
                if (building) setCitizenStateBuildBuilding(citizen, building);
            } else {
                setCitizenStateGetItem(citizen, INVENTORY_WOOD, BUILDING_DATA[buildType].woodAmount);
            }
        }
    }

    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        if (tickFunction) {
            tickFunction(citizen, state);
            return;
        }
    }
}

function getCitizenUnfinishedBuilding(citizen: Citizen, state: ChatSimState): Building | undefined {
    for (let building of state.map.buildings) {
        if (building.buildProgress !== undefined && citizen === building.owner) {
            return building;
        }
    }
    return undefined;
}
