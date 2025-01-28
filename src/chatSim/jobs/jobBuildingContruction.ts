import { ChatSimState } from "../chatSimModels.js";
import { Building, BuildingType, createBuildingOnRandomTile, MAP_OBJECT_BUILDING } from "../map/mapObjectBuilding.js";
import { Citizen } from "../citizen.js";
import { CitizenJob } from "./job.js";
import { nextRandom } from "../main.js";
import { INVENTORY_WOOD } from "../inventory.js";
import { mapGetChunksInDistance } from "../map/map.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateBuildBuilding } from "../citizenState/citizenStateGetBuilding.js";
import { setCitizenStateGetItem } from "../citizenState/citizenStateGetItem.js";

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
    };
}

function create(state: ChatSimState): CitizenJobBuildingConstruction {
    return {
        name: CITIZEN_JOB_BUILDING_CONSTRUCTION,
    }
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
                buildType = nextRandom(state.randomSeed) < 0.5 ? "House" : "Market";
            }
            const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
            if (inventoryWood && inventoryWood.counter >= BUILDING_DATA[buildType].woodAmount) {
                const building = createBuildingOnRandomTile(citizen, state, buildType, citizen.position);
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
    const chunks = mapGetChunksInDistance(citizen.position, state.map, 1000);
    for (let chunk of chunks) {
        const buildings = chunk.tileObjects.get(MAP_OBJECT_BUILDING) as Building[];
        if (!buildings) continue;
        for (let building of buildings) {
            if (building.buildProgress !== undefined && citizen === building.owner) {
                return building;
            }
        }
    }
    return undefined;
}
