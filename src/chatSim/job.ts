import { CITIZEN_JOB_FOOD_GATHERER, loadCitizenJobFoodGatherer } from "./jobFoodGatherer.js";
import { loadCitizenJobFoodMarket } from "./jobFoodMarket.js";
import { ChatSimState, Citizen } from "./main.js"

export type CitizenJob = {
    name: string,
    state: string,
}

export type FunctionsCitizenJob = {
    create(state: ChatSimState): CitizenJob,
    tick(citizen: Citizen, job: CitizenJob, state: ChatSimState): void,
}

export type FunctionsCitizenJobs = { [key: string]: FunctionsCitizenJob };

export function loadCitizenJobs(state: ChatSimState) {
    loadCitizenJobFoodGatherer(state);
    loadCitizenJobFoodMarket(state);
}

export function createJob(jobname: string, state: ChatSimState): CitizenJob {
    const jobFunctions = state.functionsCitizenJobs[jobname];
    return jobFunctions.create(state);
}

export function tickCitizenJob(citizen: Citizen, state: ChatSimState) {
    if (!citizen.job) return;
    const jobFunctions = state.functionsCitizenJobs[citizen.job.name];
    if (jobFunctions === undefined) {
        console.log("job functions missing for job " + citizen.job);
        return;
    }
    jobFunctions.tick(citizen, citizen.job, state);
}
