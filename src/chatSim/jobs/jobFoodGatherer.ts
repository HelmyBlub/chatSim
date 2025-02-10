import { ChatSimState } from "../chatSimModels.js";
import { citizenAddThought, Citizen, citizenSetThought, CitizenStateSuccessData } from "../map/citizen.js";
import { citizenChangeJob, CitizenJob, isCitizenAtPosition } from "./job.js";
import { CITIZEN_JOB_FOOD_MARKET } from "./jobFoodMarket.js";
import { INVENTORY_MUSHROOM } from "../inventory.js";
import { inventoryGetAvailableCapacity } from "../inventory.js";
import { setCitizenStateGatherMushroom } from "../citizenState/citizenStateGatherMushroom.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateSellItem } from "../citizenState/citizenStateSellItem.js";
import { CITIZEN_STATE_SEARCH, CitizenStateSearchData, CitizenStateSearchSuccessData, setCitizenStateSearch, setCitizenStateSearchItem, setCitizenStateTransportItemToBuilding } from "../citizenState/citizenStateGetItem.js";
import { Building, BuildingMarket, MAP_OBJECT_BUILDING } from "../map/mapObjectBuilding.js";


export type CitizenJobFoodGatherer = CitizenJob & {
}

export const CITIZEN_JOB_FOOD_GATHERER = "Food Gatherer";

export function loadCitizenJobFoodGatherer(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_GATHERER] = {
        create: create,
        tick: tick,
    };
}

export function jobCitizenGathererSell(citizen: Citizen, itemName: string, state: ChatSimState) {
    let returnedData = citizen.stateInfo.stack.length > 0 ? citizen.stateInfo.stack[0].returnedData : citizen.stateInfo.returnedData;
    if (returnedData && returnedData.type === CITIZEN_STATE_SEARCH) {
        const successData = returnedData as CitizenStateSearchSuccessData;
        const market = successData.found as BuildingMarket;
        citizen.memory.lastMarket = market;
        citizenAddThought(citizen, `I found a market i will sell to.`, state);
        setCitizenStateSellItem(citizen, itemName);
        return;
    } else {
        const data: CitizenStateSearchData = {
            searchFor: [{
                type: MAP_OBJECT_BUILDING,
                condition: (building: Building, citizen, state) => {
                    if (building.deterioration >= 1) return false;
                    if (building.buildingType !== "Market") return false;
                    if (building.inhabitedBy === undefined) return false;
                    if (building.inhabitedBy.money <= 0) return false;
                    if (inventoryGetAvailableCapacity(building.inventory, itemName) <= 0) return false;
                    if (!isCitizenAtPosition(building.inhabitedBy, building.position)) return false;
                    return true;
                }
            }],
            searchDestination: citizen.memory.lastMarket?.position,
        }
        citizenAddThought(citizen, `I search for a market.`, state);
        if (data.searchDestination) {
            citizenAddThought(citizen, `I remember a market at x:${data.searchDestination.x} y:${data.searchDestination.y}`, state);
        }
        setCitizenStateSearch(citizen, data);
        return;
    }
}

function create(state: ChatSimState): CitizenJobFoodGatherer {
    return {
        name: CITIZEN_JOB_FOOD_GATHERER,
    }
}

function tick(citizen: Citizen, job: CitizenJobFoodGatherer, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        const available = inventoryGetAvailableCapacity(citizen.inventory, INVENTORY_MUSHROOM);
        if (available > 0) {
            setCitizenStateSearchItem(citizen, INVENTORY_MUSHROOM, undefined, true);
        } else {
            if (citizen.home && inventoryGetAvailableCapacity(citizen.home.inventory, INVENTORY_MUSHROOM) > 0) {
                citizenSetThought(citizen, [
                    `I can not carry more ${INVENTORY_MUSHROOM}.`,
                    `I will store them at home.`
                ], state);
                setCitizenStateTransportItemToBuilding(citizen, citizen.home, INVENTORY_MUSHROOM);
            } else {
                if (citizen.dreamJob !== job.name) {
                    const reason = [
                        `I can not carry more ${INVENTORY_MUSHROOM}.`,
                        `There is no ${CITIZEN_JOB_FOOD_MARKET} to sell to.`,
                        `I become a ${CITIZEN_JOB_FOOD_MARKET} myself,`,
                        `so i can sell my ${INVENTORY_MUSHROOM}.`
                    ];
                    citizenChangeJob(citizen, CITIZEN_JOB_FOOD_MARKET, state, reason);
                    return;
                } else {
                    jobCitizenGathererSell(citizen, INVENTORY_MUSHROOM, state);
                    return;
                }
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

