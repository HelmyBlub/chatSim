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
        paintTool: paintTool,
    };
}

function create(state: ChatSimState): CitizenJobLuberjack {
    return {
        name: CITIZEN_JOB_LUMBERJACK,
    }
}

function paintTool(ctx: CanvasRenderingContext2D, citizen: Citizen, job: CitizenJob, state: ChatSimState) {
    const stateInfo = citizen.stateInfo.stack.length > 0 ? citizen.stateInfo.stack[0] : undefined;
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    const axeSize = 20;
    ctx.save();
    if (citizen.moveTo === undefined && (stateInfo && (stateInfo.state === "cutDownTree" || stateInfo.state === "cutTreeLogIntoPlanks"))) {
        const rotation = (Math.sin(state.time / 100) + 1) / 2 * Math.PI / 2;
        ctx.translate(paintPos.x, paintPos.y);
        ctx.rotate(rotation)
        ctx.translate(-paintPos.x, -paintPos.y);
    }
    ctx.drawImage(state.images[IMAGE_PATH_AXE], 0, 0, 100, 100, paintPos.x, paintPos.y - 15, axeSize, axeSize);
    ctx.restore();
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
