import { ChatSimState, ChatterData, RandomSeed } from "../chatSimModels.js";
import { Citizen } from "../citizen.js";
import { nextRandom } from "../main.js";

export type CitizenTraits = {
    traits: string[],
    maxTraits: number,
}

type CitizenTrait = {
    name: string,
    opposite?: string,
}

type CitizenTraitFunction = {
    trait: CitizenTrait,
    apply(citizen: Citizen, state: ChatSimState): void,
}

export const CITIZEN_TRAIT_FUNCTIONS: { [key: string]: CitizenTraitFunction } = {
}

const TRAIT_EARLY_BIRD = "Early Bird";
const TRAIT_NIGHT_OWL = "Night Owl";
export const CITIZEN_TRAIT_ROBOT = "Robot";

export function loadTraits() {
    CITIZEN_TRAIT_FUNCTIONS[TRAIT_EARLY_BIRD] = { apply: applyEarlyBird, trait: { name: TRAIT_EARLY_BIRD, opposite: TRAIT_NIGHT_OWL } };
    CITIZEN_TRAIT_FUNCTIONS[TRAIT_NIGHT_OWL] = { apply: applyNightOwl, trait: { name: TRAIT_NIGHT_OWL, opposite: TRAIT_EARLY_BIRD } };
    CITIZEN_TRAIT_FUNCTIONS[CITIZEN_TRAIT_ROBOT] = { apply: applyRobot, trait: { name: CITIZEN_TRAIT_ROBOT } };
}

export function handleChatterAddTraitMessage(chatter: ChatterData, citizen: Citizen, trait: string, state: ChatSimState) {
    saveTraitInChatter(chatter, trait);
    addCitizenTrait(citizen, trait, state);
}

function saveTraitInChatter(chatter: ChatterData, trait: string) {
    const maxChatterTraits = 5;
    if (!chatter.traits) chatter.traits = [];
    chatter.traits.push(trait);
    const traitFunctions = CITIZEN_TRAIT_FUNCTIONS[trait];
    if (traitFunctions) {
        if (traitFunctions.trait.opposite) {
            const oppositeIndex = chatter.traits.findIndex(t => t === traitFunctions.trait.opposite);
            if (oppositeIndex > -1) {
                chatter.traits.splice(oppositeIndex, 1);
            }
        }
    }
    if (maxChatterTraits < chatter.traits.length) {
        chatter.traits.shift();
    }
}

export function addCitizenTrait(citizen: Citizen, trait: string, state: ChatSimState) {
    citizen.traitsData.traits.push(trait);
    const traitFunctions = CITIZEN_TRAIT_FUNCTIONS[trait];
    if (traitFunctions) {
        traitFunctions.apply(citizen, state);
        if (traitFunctions.trait.opposite) {
            const oppositeIndex = citizen.traitsData.traits.findIndex(t => t === traitFunctions.trait.opposite);
            if (oppositeIndex > -1) {
                citizen.traitsData.traits.splice(oppositeIndex, 1);
            }
        }
    }
    if (citizen.traitsData.maxTraits < citizen.traitsData.traits.length) {
        citizen.traitsData.traits.shift();
    }
}

function applyEarlyBird(citizen: Citizen, state: ChatSimState) {
    citizen.goToBedTime = (0.9 * (nextRandom(state.randomSeed) * 0.2 + 0.7)) % 1;
}

function applyRobot(citizen: Citizen, state: ChatSimState) {
    citizen.speed = citizen.speed * 0.5;
}

function applyNightOwl(citizen: Citizen, state: ChatSimState) {
    citizen.goToBedTime = (0.9 * (nextRandom(state.randomSeed) * 0.2 + 1.1)) % 1;
}