import { Position, Building, ChatSimState, BuildingType } from "../chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen } from "../citizen.js";
import { CitizenJob, createJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { calculateDistance, INVENTORY_WOOD } from "../main.js";
import { createBuildingOnRandomTile } from "../map.js";

export type CitizenJobBuildingConstruction = CitizenJob & {
    state: "buyWood" | "buildHouse" | "searchBuildLocation" | "moveToOldLocation" | "decideType",
    buildPosition?: Position,
    houseInProgress?: Building,
    buildType?: BuildingType,
}

export const CITIZEN_JOB_BUILDING_CONSTRUCTION = "Building Construction";
const BUILDING_DATA: { [key: string]: { woodAmount: number } } = {
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
        state: "decideType",
    }
}

function tick(citizen: Citizen, job: CitizenJobBuildingConstruction, state: ChatSimState) {
    if (job.state === "decideType") {
        if (!citizen.home) {
            job.buildType = "House";
        } else {
            job.buildType = Math.random() < 0.5 ? "House" : "Market";
        }
        job.state = "searchBuildLocation";
    }
    if (job.state === "moveToOldLocation") {
        if (citizen.moveTo === undefined) {
            if (job.buildPosition && calculateDistance(job.buildPosition, citizen.position) < 10) {
                job.state = "buildHouse";
                for (let house of state.map.houses) {
                    if (house.owner === citizen && house.buildProgress !== undefined) {
                        job.houseInProgress = house;
                        break;
                    }
                }
            } else {
                job.state = "searchBuildLocation";
            }
        }
    }
    if (job.state === "searchBuildLocation") {
        let doIHaveAHouseBuildInProgress = false;
        for (let house of state.map.houses) {
            if (house.owner === citizen && house.buildProgress !== undefined) {
                job.state = "moveToOldLocation";
                citizen.moveTo = {
                    x: house.position.x,
                    y: house.position.y,
                };
                job.buildPosition = {
                    x: house.position.x,
                    y: house.position.y,
                }

                doIHaveAHouseBuildInProgress = true;
                break;
            }
        }

        if (!doIHaveAHouseBuildInProgress) {
            const inventoryWood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
            const woodRequired = BUILDING_DATA[job.buildType!].woodAmount;
            if (inventoryWood && inventoryWood.counter >= woodRequired) {
                moveToBuildLocation(citizen, job, state);
                if (job.buildPosition && calculateDistance(job.buildPosition, citizen.position) < 10) {
                    job.houseInProgress = createBuildingOnRandomTile(citizen, state, job.buildType!);
                    if (job.houseInProgress !== undefined) {
                        inventoryWood.counter -= woodRequired;
                        job.state = "buildHouse";
                    }
                }
            } else {
                job.state = "buyWood";
            }
        }
    }
    if (job.state === "buildHouse") {
        if (job.houseInProgress && job.houseInProgress.buildProgress !== undefined
            && isCitizenInInteractDistance(citizen, job.houseInProgress.position)
        ) {
            const woodRequired = BUILDING_DATA[job.buildType!].woodAmount;
            const progressPerTick = 0.008 / woodRequired;
            job.houseInProgress.buildProgress += progressPerTick;
            if (job.houseInProgress.buildProgress >= 1) {
                if (!citizen.home) {
                    citizen.home = job.houseInProgress;
                    job.houseInProgress.inhabitedBy = citizen;
                }
                job.houseInProgress.buildProgress = undefined;
                job.houseInProgress = undefined;
                job.buildType = undefined;
            }
        } else {
            job.state = "decideType";
        }
    }
    if (job.state === "buyWood") {
        if (canCitizenCarryMore(citizen)) {
            if (citizen.money > 2) {
                const woodMarket = findAWoodMarketWhichHasWood(citizen, state.map.citizens);
                if (woodMarket) {
                    moveToMarket(citizen, woodMarket);
                    if (isCitizenInInteractDistance(citizen, woodMarket.position)) {
                        sellItem(woodMarket, citizen, INVENTORY_WOOD, 2, state);
                    }
                } else {
                    addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_LUMBERJACK} as their is no wood market to buy wood from`, state);
                    citizen.job = createJob(CITIZEN_JOB_LUMBERJACK, state);
                }
            } else {
                addCitizenLogEntry(citizen, `switch job to ${CITIZEN_JOB_LUMBERJACK} as i have no money for wood`, state);
                citizen.job = createJob(CITIZEN_JOB_LUMBERJACK, state);
            }
        } else {
            const wood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
            const requiredWood = BUILDING_DATA[job.buildType!].woodAmount;
            if (wood && wood.counter >= requiredWood) {
                job.state = "searchBuildLocation";
            }
        }
    }
}

function moveToBuildLocation(citizen: Citizen, job: CitizenJobBuildingConstruction, state: ChatSimState) {
    if (!job.buildPosition) {
        let height = state.map.mapHeight - 40;
        job.buildPosition = {
            x: Math.random() * state.map.mapWidth - state.map.mapWidth / 2,
            y: Math.random() * height - height / 2,
        }
        citizen.moveTo = {
            x: job.buildPosition.x,
            y: job.buildPosition.y,
        }
    }
}

function moveToMarket(citizen: Citizen, market: Citizen) {
    citizen.moveTo = {
        x: market.position.x,
        y: market.position.y,
    }
}

function findAWoodMarketWhichHasWood(searcher: Citizen, citizens: Citizen[]): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen.job && citizen.job.name === CITIZEN_JOB_WOOD_MARKET) {
            let inventoryWood = citizen.inventory.find(i => i.name === INVENTORY_WOOD);
            if (inventoryWood === undefined || inventoryWood.counter === 0) continue;
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

