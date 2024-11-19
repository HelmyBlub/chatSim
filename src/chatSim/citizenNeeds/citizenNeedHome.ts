import { ChatSimState } from "../chatSimModels.js";
import { addCitizenLogEntry, Citizen, CITIZEN_STATE_TYPE_WORKING_JOB, getAvaiableInventoryCapacity } from "../citizen.js";
import { buyItem, citizenChangeJob, isCitizenInInteractDistance } from "../jobs/job.js";
import { CITIZEN_JOB_BUILDING_CONSTRUCTION } from "../jobs/jobBuildingContruction.js";
import { CITIZEN_JOB_HOUSE_MARKET } from "../jobs/jobHouseMarket.js";
import { CITIZEN_JOB_LUMBERJACK } from "../jobs/jobLumberjack.js";
import { findClosestWoodMarket, CITIZEN_JOB_WOOD_MARKET } from "../jobs/jobWoodMarket.js";
import { INVENTORY_WOOD } from "../main.js";

export const CITIZEN_NEED_HOME = "need home";

export function loadCitizenNeedsFunctionsHome(state: ChatSimState) {
    state.functionsCitizenNeeds[CITIZEN_NEED_HOME] = {
        isFulfilled: isFulfilled,
        tick: tick,
    }
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.home === undefined) return false;
    if (citizen.home.deterioration > 0.2) return false;
    return true;
}

function tick(citizen: Citizen, state: ChatSimState) {
    if (!citizen.home) {
        const availableHouse = state.map.buildings.find(h => h.inhabitedBy === undefined && h.buildProgress === undefined && h.type === "House");
        if (availableHouse) {
            addCitizenLogEntry(citizen, `moved into a house from ${availableHouse.owner}`, state);
            availableHouse.inhabitedBy = citizen;
            citizen.home = availableHouse;
        } else if (!isInHouseBuildingBusiness(citizen)) {
            citizenChangeJob(citizen, CITIZEN_JOB_BUILDING_CONSTRUCTION, state, "no available house found");
        }
    }
    if (!citizen.home || citizen.home.deterioration < 0.2) return;

    if (citizen.stateInfo.type !== CITIZEN_NEED_HOME) {
        let foundWood = false;
        const wood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
        if (wood && wood.counter > 0) {
            foundWood = true;
        } else {
            const homeWood = citizen.home.inventory.items.find(i => i.name === INVENTORY_WOOD);
            if (homeWood && homeWood.counter > 0) {
                foundWood = true;
            }
        }
        if (foundWood) {
            citizen.moveTo = {
                x: citizen.home.position.x,
                y: citizen.home.position.y,
            }
            citizen.stateInfo = {
                type: CITIZEN_NEED_HOME,
                state: `move to house to repair`,
            };
        } else {
            if (citizen.job.name !== CITIZEN_JOB_LUMBERJACK) {
                let canBuyWood = false;
                if (citizen.money > 1) {
                    const woodMarket = findClosestWoodMarket(citizen.position, state, true, false);
                    if (woodMarket) {
                        addCitizenLogEntry(citizen, `house repair required. Move to wood market from ${woodMarket.name} to buy wood.`, state);
                        citizen.stateInfo = {
                            type: CITIZEN_NEED_HOME,
                            state: `buy wood`,
                        };
                        citizen.moveTo = {
                            x: woodMarket.position.x,
                            y: woodMarket.position.y,
                        }
                        canBuyWood = true;
                    }
                }
                if (!canBuyWood) {
                    citizenChangeJob(citizen, CITIZEN_JOB_LUMBERJACK, state, "no money or no wood market found and i need wood for house repairs");
                }
            }
        }
    } else {
        if (citizen.stateInfo.state === `buy wood`) {
            if (citizen.moveTo === undefined) {
                if (citizen.money < 2) {
                    citizenChangeJob(citizen, CITIZEN_JOB_LUMBERJACK, state, "as no money to buy wood for house repairs");
                } else {
                    const woodMarket = findClosestWoodMarket(citizen.position, state, true, false);
                    if (woodMarket && isCitizenInInteractDistance(citizen, woodMarket.position)) {
                        if (getAvaiableInventoryCapacity(citizen.inventory, INVENTORY_WOOD) > 0) {
                            buyItem(woodMarket, citizen, INVENTORY_WOOD, 2, state, 1);
                        }
                    } else {
                        addCitizenLogEntry(citizen, `${CITIZEN_JOB_WOOD_MARKET} not found at location`, state);
                    }
                    citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
                }
            }
        }
        if (citizen.stateInfo.state === `move to house to repair`) {
            if (citizen.moveTo === undefined) {
                if (isCitizenInInteractDistance(citizen, citizen.home.position)) {
                    let wood = citizen.inventory.items.find(i => i.name === INVENTORY_WOOD);
                    if (!wood || wood.counter <= 0) {
                        wood = citizen.home.inventory.items.find(i => i.name === INVENTORY_WOOD);
                    }
                    if (wood && wood.counter > 0) {
                        citizen.home.deterioration -= 0.2;
                        wood.counter--;
                        addCitizenLogEntry(citizen, `used ${INVENTORY_WOOD} to repair home. current deterioration: ${(citizen.home.deterioration * 100).toFixed()}%`, state);
                    }
                }
                citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB };
            }
        }
    }
}

function isInHouseBuildingBusiness(citizen: Citizen) {
    return (citizen.job.name === CITIZEN_JOB_HOUSE_MARKET
        || citizen.job.name === CITIZEN_JOB_BUILDING_CONSTRUCTION
        || citizen.job.name === CITIZEN_JOB_LUMBERJACK
        || citizen.job.name === CITIZEN_JOB_WOOD_MARKET
    )
}

