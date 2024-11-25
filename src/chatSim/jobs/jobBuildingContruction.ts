import { Building, ChatSimState, BuildingType } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, CitizenStateInfo, setCitizenThought } from "../citizen.js";
import { buyItem, citizenChangeJob, CitizenJob, isCitizenInInteractDistance } from "./job.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { calculateDistance, INVENTORY_WOOD } from "../main.js";
import { createBuildingOnRandomTile } from "../map.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { IMAGE_PATH_HELMET } from "../../drawHelper.js";
import { inventoryGetAvaiableCapacity, inventoryMoveItemBetween } from "../inventory.js";

type JobContructionStateInfo = {
    state: "buyWood" | "buildHouse" | "searchBuildLocation" | "buyWoodFromMarket" | "carryWoodToSetupLocation",
}

export type CitizenJobBuildingConstruction = CitizenJob & {
    buildingInProgress?: Building,
    buildType?: BuildingType,
    marketToBuyFrom?: Citizen,
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
        if (!citizen.home) {
            job.buildType = "House";
        } else {
            job.buildType = Math.random() < 0.5 ? "House" : "Market";
        }
        const citizenState: JobContructionStateInfo = { state: "searchBuildLocation" };
        citizen.stateInfo.stack.unshift(citizenState);
    }
    const stateInfo = citizen.stateInfo.stack[0] as JobContructionStateInfo;
    if (stateInfo.state === "searchBuildLocation") {
        let doIHaveAHouseBuildInProgress = false;
        for (let building of state.map.buildings) {
            if (building.owner === citizen && building.buildProgress !== undefined) {
                stateInfo.state = "buildHouse";
                setCitizenThought(citizen, [
                    `I have a unfinished building. Let's go there.`
                ], state);
                citizen.moveTo = {
                    x: building.position.x,
                    y: building.position.y,
                };
                job.buildingInProgress = building;

                doIHaveAHouseBuildInProgress = true;
                break;
            }
        }

        if (!doIHaveAHouseBuildInProgress) {
            const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
            const woodRequired = BUILDING_DATA[job.buildType!].woodAmount;
            if (inventoryWood && inventoryWood.counter >= woodRequired) {
                job.buildingInProgress = createBuildingOnRandomTile(citizen, state, job.buildType!);
                if (job.buildingInProgress) {
                    addCitizenLogEntry(citizen, `start a new building`, state);
                    citizen.moveTo = {
                        x: job.buildingInProgress.position.x,
                        y: job.buildingInProgress.position.y,
                    }
                    stateInfo.state = "carryWoodToSetupLocation";
                }
            } else {
                stateInfo.state = "buyWood";
            }
        }
    }
    if (stateInfo.state === "carryWoodToSetupLocation") {
        if (citizen.moveTo === undefined) {
            if (job.buildingInProgress && job.buildingInProgress.position && isCitizenInInteractDistance(citizen, job.buildingInProgress.position)) {
                const inventoryWood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
                const woodRequired = BUILDING_DATA[job.buildingInProgress.type].woodAmount;
                if (inventoryWood && inventoryWood.counter >= woodRequired) {
                    inventoryMoveItemBetween(INVENTORY_WOOD, citizen.inventory, job.buildingInProgress.inventory, woodRequired);
                    stateInfo.state = "buildHouse";
                } else {
                    addCitizenLogEntry(citizen, `not enough wood. Buy some.`, state);
                    stateInfo.state = "buyWood";
                    job.buildingInProgress = undefined;
                }
            } else {
                addCitizenLogEntry(citizen, `no building in progress. But i should have? `, state);
                debugger;
                citizen.stateInfo.stack.shift();
                job.buildingInProgress = undefined;
            }
        }
    }
    if (stateInfo.state === "buildHouse") {
        if (citizen.moveTo === undefined) {
            if (job.buildingInProgress && job.buildingInProgress.buildProgress !== undefined
                && isCitizenInInteractDistance(citizen, job.buildingInProgress.position)
            ) {
                const woodRequired = BUILDING_DATA[job.buildType!].woodAmount;
                const progressPerTick = 0.008 / woodRequired;
                if ((job.buildingInProgress.buildProgress * woodRequired) % 1 < progressPerTick * woodRequired) {
                    const wood = job.buildingInProgress.inventory.items.find(i => i.name === INVENTORY_WOOD);
                    addCitizenLogEntry(citizen, `building in Progress ${job.buildingInProgress.buildProgress} `, state);
                    if (!wood) {
                        stateInfo.state = "carryWoodToSetupLocation";
                        return;
                    }
                    if (wood.counter > 0) wood.counter--;
                }
                job.buildingInProgress.buildProgress += progressPerTick;
                if (job.buildingInProgress.buildProgress >= 1) {
                    addCitizenLogEntry(citizen, `building finished`, state);
                    if (!citizen.home) {
                        citizen.home = job.buildingInProgress;
                        job.buildingInProgress.inhabitedBy = citizen;
                    }
                    job.buildingInProgress.buildProgress = undefined;
                    job.buildingInProgress = undefined;
                    job.buildType = undefined;
                }
            } else {
                citizen.stateInfo.stack.shift();
            }
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
            } else {
                stateInfo.state = "buyWood";
            }
        }
    }
    if (stateInfo.state === "buyWood") {
        if (inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
            if (citizen.money > 2) {
                const woodMarket = findAWoodMarketWhichHasWood(citizen, state.map.citizens);
                if (woodMarket) {
                    citizen.moveTo = {
                        x: woodMarket.position.x,
                        y: woodMarket.position.y,
                    }
                    job.marketToBuyFrom = woodMarket;
                    stateInfo.state = "buyWoodFromMarket";
                    setCitizenThought(citizen, [
                        `I need more ${INVENTORY_WOOD}. I go buy from ${woodMarket.name}.`
                    ], state);
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

