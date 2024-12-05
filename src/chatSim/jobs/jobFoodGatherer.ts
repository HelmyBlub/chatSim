import { ChatSimState } from "../chatSimModels.js";
import { addCitizenThought, Citizen, setCitizenThought } from "../citizen.js";
import { citizenChangeJob, CitizenJob } from "./job.js";
import { CITIZEN_JOB_FOOD_MARKET } from "./jobFoodMarket.js";
import { INVENTORY_MUSHROOM } from "../inventory.js";
import { inventoryGetAvaiableCapacity } from "../inventory.js";
import { setCitizenStateGatherMushroom } from "../citizenState/citizenStateGatherMushroom.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { setCitizenStateSellItem } from "../citizenState/citizenStateSellItem.js";
import { setCitizenStateTransportItemToBuilding } from "../citizenState/citizenStateGetItem.js";


export type CitizenJobFoodGatherer = CitizenJob & {
}

export const CITIZEN_JOB_FOOD_GATHERER = "Food Gatherer";

export function loadCitizenJobFoodGatherer(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FOOD_GATHERER] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobFoodGatherer {
    return {
        name: CITIZEN_JOB_FOOD_GATHERER,
    }
}

function tick(citizen: Citizen, job: CitizenJobFoodGatherer, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        const available = inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_MUSHROOM);
        if (available > 0) {
            setCitizenStateGatherMushroom(citizen);
        } else {
            if (citizen.home && inventoryGetAvaiableCapacity(citizen.home.inventory, INVENTORY_MUSHROOM) > 0) {
                setCitizenThought(citizen, [
                    `I can not carry more ${INVENTORY_MUSHROOM}.`,
                    `I will store them at home.`
                ], state);
                setCitizenStateTransportItemToBuilding(citizen, citizen.home, INVENTORY_MUSHROOM);
            } else {
                if (!citizen.stateInfo.previousTaskFailed) {
                    addCitizenThought(citizen, `I can not carry more. I need to sell.`, state);
                    setCitizenStateSellItem(citizen, INVENTORY_MUSHROOM);
                    return;
                } else {
                    const reason = [
                        `I can not carry more ${INVENTORY_MUSHROOM}.`,
                        `There is no ${CITIZEN_JOB_FOOD_MARKET} to sell to.`,
                        `I become a ${CITIZEN_JOB_FOOD_MARKET} myself,`,
                        `so i can sell my ${INVENTORY_MUSHROOM}.`
                    ];
                    citizenChangeJob(citizen, CITIZEN_JOB_FOOD_MARKET, state, reason);
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
