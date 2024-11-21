import { Building, ChatSimState } from "../chatSimModels.js";
import { Citizen, CitizenStateInfo, setCitizenThought } from "../citizen.js"
import { citizenChangeJob, CitizenJob } from "./job.js"
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobFoodGatherer.js";

export type CitizenJobMarket = CitizenJob & {
    marketBuilding: Building,
    sellItemNames: string[],
}

type JobMarketStateInfo = CitizenStateInfo & {
    state?: "check inventory" | "repair market",
}

function createMarket(state: ChatSimState, jobname: string, marketBuilding: Building, sellItemTypes: string[]): CitizenJobMarket {
    return {
        name: jobname,
        sellItemNames: sellItemTypes,
        marketBuilding: marketBuilding,
    }
}

function tickMarket(citizen: Citizen, job: CitizenJobMarket, state: ChatSimState) {
    const stateInfo = citizen.stateInfo as JobMarketStateInfo;

    if (stateInfo.state === undefined) {
        if (job.marketBuilding.deterioration >= 1) {
            citizenChangeJob(citizen, CITIZEN_JOB_FOOD_GATHERER, state, ["My Market Buidling broke down."]);
            return;
        }
        stateInfo.state = "check inventory";
        setCitizenThought(citizen, ["Go to my Market and check inventory."], state);
        citizen.moveTo = {
            x: job.marketBuilding.position.x,
            y: job.marketBuilding.position.y,
        }
    }
}
