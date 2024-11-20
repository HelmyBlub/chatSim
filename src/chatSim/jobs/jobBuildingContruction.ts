import { Position, Building, ChatSimState, BuildingType } from "../chatSimModels.js";
import { Citizen, CitizenStateInfo, getAvaiableInventoryCapacity } from "../citizen.js";
import { buyItem, citizenChangeJob, CitizenJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { calculateDistance, INVENTORY_WOOD } from "../main.js";
import { createBuildingOnRandomTile } from "../map.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { IMAGE_PATH_HELMET } from "../../drawHelper.js";

type JobContructionStateInfo = CitizenStateInfo & {
    state?: "buyWood" | "buildHouse" | "searchBuildLocation" | "moveToOldLocation" | "buyWoodFromMarket" | "carryWoodToSetupLocation",
}

export type CitizenJobBuildingConstruction = CitizenJob & {
    buildPosition?: Position,
    houseInProgress?: Building,
    buildType?: BuildingType,
    marketToBuyFrom?: Citizen,
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
    const stateInfo = citizen.stateInfo as JobContructionStateInfo;
    if (stateInfo.state === undefined) {
        if (!citizen.home) {
            job.buildType = "House";
        } else {
            job.buildType = Math.random() < 0.5 ? "House" : "Market";
        }
        stateInfo.state = "searchBuildLocation";
    }
    if (stateInfo.state === "moveToOldLocation") {
        if (citizen.moveTo === undefined) {
            if (job.buildPosition && calculateDistance(job.buildPosition, citizen.position) < 10) {
                stateInfo.state = "buildHouse";
                for (let house of state.map.buildings) {
                    if (house.owner === citizen && house.buildProgress !== undefined) {
                        job.houseInProgress = house;
                        break;
                    }
                }
            } else {
                stateInfo.state = "searchBuildLocation";
            }
        }
    }
    if (stateInfo.state === "searchBuildLocation") {
        let doIHaveAHouseBuildInProgress = false;
        for (let house of state.map.buildings) {
            if (house.owner === citizen && house.buildProgress !== undefined) {
                stateInfo.state = "moveToOldLocation";
                stateInfo.actionStartTime = state.time;
                stateInfo.thoughts = [
                    `I have a unfinished building. Let's go there.`
                ]
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
            const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
            const woodRequired = BUILDING_DATA[job.buildType!].woodAmount;
            if (inventoryWood && inventoryWood.counter >= woodRequired) {
                moveToBuildLocation(citizen, job, state);
                stateInfo.state = "carryWoodToSetupLocation";
                if (job.buildPosition && calculateDistance(job.buildPosition, citizen.position) < 10) {
                    job.houseInProgress = createBuildingOnRandomTile(citizen, state, job.buildType!);
                    if (job.houseInProgress !== undefined) {
                        inventoryWood.counter -= woodRequired;
                        stateInfo.state = "buildHouse";
                    }
                } else if (citizen.moveTo === undefined) {
                    stateInfo.state = undefined;
                    job.buildPosition = undefined;
                }
            } else {
                stateInfo.state = "buyWood";
            }
        }
    }
    if (stateInfo.state === "carryWoodToSetupLocation") {
        if (citizen.moveTo === undefined) {
            if (job.buildPosition && isCitizenInInteractDistance(citizen, job.buildPosition)) {
                const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
                const woodRequired = BUILDING_DATA[job.buildType!].woodAmount;
                if (inventoryWood && inventoryWood.counter >= woodRequired) {
                    job.houseInProgress = createBuildingOnRandomTile(citizen, state, job.buildType!);
                    if (job.houseInProgress !== undefined) {
                        inventoryWood.counter -= woodRequired;
                        stateInfo.state = "buildHouse";
                    }
                } else {
                    stateInfo.state = undefined;
                    job.buildPosition = undefined;
                }
            } else {
                stateInfo.state = undefined;
                job.buildPosition = undefined;
            }
        }
    }
    if (stateInfo.state === "buildHouse") {
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
            stateInfo.state = undefined;
        }
    }
    if (stateInfo.state === "buyWoodFromMarket") {
        if (citizen.moveTo === undefined) {
            if (job.marketToBuyFrom && isCitizenInInteractDistance(citizen, job.marketToBuyFrom.position)) {
                let woodRequired = BUILDING_DATA[job.buildType!].woodAmount;
                const wood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
                if (wood && wood.counter > 0) {
                    woodRequired = Math.max(0, woodRequired - wood.counter);
                }
                buyItem(job.marketToBuyFrom, citizen, INVENTORY_WOOD, woodRequired, state);
                stateInfo.state = "searchBuildLocation";
            }
        }
    }
    if (stateInfo.state === "buyWood") {
        if (getAvaiableInventoryCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
            if (citizen.money > 2) {
                const woodMarket = findAWoodMarketWhichHasWood(citizen, state.map.citizens);
                if (woodMarket) {
                    citizen.moveTo = {
                        x: woodMarket.position.x,
                        y: woodMarket.position.y,
                    }
                    job.marketToBuyFrom = woodMarket;
                    stateInfo.state = "buyWoodFromMarket";
                    stateInfo.actionStartTime = state.time;
                    stateInfo.thoughts = [
                        `I need more ${INVENTORY_WOOD}. I go buy from ${woodMarket.name}.`
                    ]
                } else {
                    const reason = [
                        `I need ${INVENTORY_WOOD} to build a building.`,
                        `There is no ${CITIZEN_JOB_WOOD_MARKET} to buy ${INVENTORY_WOOD} from.`,
                        `I become a ${CITIZEN_JOB_LUMBERJACK} to gather ${INVENTORY_WOOD} myself.`,
                    ];
                    citizenChangeJob(citizen, CITIZEN_JOB_LUMBERJACK, state, reason);
                }
            } else {
                const reason = [
                    `I need ${INVENTORY_WOOD} to build a building.`,
                    `I do not have enough money.`,
                    `I become a ${CITIZEN_JOB_LUMBERJACK} to gather ${INVENTORY_WOOD} myself.`,
                ];
                citizenChangeJob(citizen, CITIZEN_JOB_LUMBERJACK, state, reason);
            }
        } else {
            const wood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
            const requiredWood = BUILDING_DATA[job.buildType!].woodAmount;
            if (wood && wood.counter >= requiredWood) {
                stateInfo.state = "searchBuildLocation";
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

function findAWoodMarketWhichHasWood(searcher: Citizen, citizens: Citizen[]): Citizen | undefined {
    let closest: Citizen | undefined;
    let distance = 0;
    for (let citizen of citizens) {
        if (citizen.job && citizen.job.name === CITIZEN_JOB_WOOD_MARKET) {
            let inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
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

