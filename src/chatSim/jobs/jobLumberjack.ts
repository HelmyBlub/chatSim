import { ChatSimState } from "../chatSimModels.js";
import { Citizen, setCitizenThought } from "../citizen.js";
import { citizenChangeJob, CitizenJob } from "./job.js";
import { CITIZEN_JOB_WOOD_MARKET } from "./jobWoodMarket.js";
import { INVENTORY_WOOD } from "../main.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { IMAGE_PATH_AXE } from "../../drawHelper.js";
import { Tree } from "../tree.js";
import { inventoryGetAvaiableCapacity } from "../inventory.js";
import { setCitizenStateGatherWood } from "./citizenStateGatherWood.js";
import { setCitizenStateTransportItemToBuilding } from "./citizenStateGetItem.js";
import { setCitizenStateSellItem } from "./citizenStateSellItem.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";

export type CitizenJobLuberjack = CitizenJob & {
    actionEndTime?: number,
    tree?: Tree,
    sellToWoodMarket?: Citizen,
}

export const CITIZEN_JOB_LUMBERJACK = "Lumberjack";

export function loadCitizenJobLumberjack(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_LUMBERJACK] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobLuberjack {
    return {
        name: CITIZEN_JOB_LUMBERJACK,
    }
}

function tick(citizen: Citizen, job: CitizenJobLuberjack, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        const available = inventoryGetAvaiableCapacity(citizen.inventory, INVENTORY_WOOD);
        if (available > 0) {
            setCitizenStateGatherWood(citizen);
        } else {
            if (citizen.home && inventoryGetAvaiableCapacity(citizen.home.inventory, INVENTORY_WOOD) > 0) {
                setCitizenThought(citizen, [
                    `I can not carry more ${INVENTORY_WOOD}.`,
                    `I will store them at home.`
                ], state);
                setCitizenStateTransportItemToBuilding(citizen, citizen.home, INVENTORY_WOOD);
            } else {
                if (!citizen.stateInfo.previousTaskFailed) {
                    setCitizenStateSellItem(citizen, INVENTORY_WOOD);
                    return;
                } else {
                    const reason = [
                        `I can not carry more ${INVENTORY_WOOD}.`,
                        `There is no ${CITIZEN_JOB_WOOD_MARKET} to sell to.`,
                        `I become a ${CITIZEN_JOB_WOOD_MARKET} myself,`,
                        `so i can sell my ${INVENTORY_WOOD}.`
                    ];
                    citizenChangeJob(citizen, CITIZEN_JOB_WOOD_MARKET, state, reason);
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
