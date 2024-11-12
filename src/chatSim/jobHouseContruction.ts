import { Position, House, ChatSimState } from "./chatSimModels.js";
import { addCitizenLogEntry, canCitizenCarryMore, Citizen } from "./citizen.js";
import { CitizenJob, createJob, isCitizenInInteractDistance, sellItem } from "./job.js";
import { CITIZEN_JOB_LUMBERJACK } from "./jobLumberjack.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { calculateDistance, INVENTORY_WOOD } from "./main.js";

export type CitizenJobHouseConstruction = CitizenJob & {
    state: "buyWood" | "buildHouse" | "searchBuildLocation" | "moveToOldLocation",
    buildPosition?: Position,
    houseInProgress?: House,
}

export const CITIZEN_JOB_HOUSE_CONSTRUCTION = "House Construction";
const WOOD_REQUIRED_FOR_HOUSE = 5;

export function loadCitizenJobHouseConstruction(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_HOUSE_CONSTRUCTION] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobHouseConstruction {
    return {
        name: CITIZEN_JOB_HOUSE_CONSTRUCTION,
        state: "searchBuildLocation",
    }
}

function tick(citizen: Citizen, job: CitizenJobHouseConstruction, state: ChatSimState) {
    if (job.state === "moveToOldLocation") {
        if (job.buildPosition && calculateDistance(job.buildPosition, citizen.position) < 10) {
            job.state = "buildHouse";
            for (let house of state.map.houses) {
                if (house.owner === citizen && house.buildProgress !== undefined) {
                    job.houseInProgress = house;
                    break;
                }
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
            if (inventoryWood && inventoryWood.counter >= WOOD_REQUIRED_FOR_HOUSE) {
                moveToBuildLocation(citizen, job, state);
                if (job.buildPosition && calculateDistance(job.buildPosition, citizen.position) < 10) {
                    job.state = "buildHouse";
                    job.houseInProgress = {
                        owner: citizen,
                        position: {
                            x: job.buildPosition.x,
                            y: job.buildPosition.y,
                        },
                        buildProgress: 0,
                        deterioration: 0,
                    }
                    state.map.houses.push(job.houseInProgress);
                    inventoryWood.counter -= WOOD_REQUIRED_FOR_HOUSE;
                    job.state = "buildHouse";
                }
            } else {
                job.state = "buyWood";
            }
        }
    }
    if (job.state === "buildHouse") {
        if (job.houseInProgress && job.houseInProgress.buildProgress !== undefined) {
            job.houseInProgress.buildProgress += 0.0016;
            if (job.houseInProgress.buildProgress >= 1) {
                if (!citizen.home) {
                    citizen.home = job.houseInProgress;
                    job.houseInProgress.inhabitedBy = citizen;
                }
                job.houseInProgress.buildProgress = undefined;
                job.houseInProgress = undefined;
            }
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
        }
    }
}

function moveToBuildLocation(citizen: Citizen, job: CitizenJobHouseConstruction, state: ChatSimState) {
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
            if (inventoryWood !== undefined && inventoryWood.counter > 0) {
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

