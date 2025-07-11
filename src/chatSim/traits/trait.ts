import { ChatSimState, ChatterData, RandomSeed } from "../chatSimModels.js";
import { Citizen, CITIZEN_DEFAULT_NAMES_REMEMBER } from "../map/citizen.js";
import { addChatterChangeLog, nextRandom } from "../main.js";
import { checkIsTextCloseTo } from "../../obsOverlayApp/commands/commands.js";

export type CitizenTraits = {
    traits: string[],
    maxTraits: number,
}

type CitizenTrait = {
    name: string,
    opposite?: string,
    type: "positive" | "neutral" | "negative" | "shouldNotBeAppliedRandomly",
}

type CitizenTraitFunction = {
    trait: CitizenTrait,
    apply(citizen: Citizen, state: ChatSimState): void,
}

export const CITIZEN_TRAIT_FUNCTIONS: { [key: string]: CitizenTraitFunction } = {
}

const CITIZEN_TRAIT_EARLY_BIRD = "Early Bird";
const CITIZEN_TRAIT_NIGHT_OWL = "Night Owl";
const CITIZEN_TRAIT_BAD_NAME_MEMORY = "Bad Name Memory";
const CITIZEN_TRAIT_GOOD_NAME_MEMORY = "Good Name Memory";
const CITIZEN_TRAIT_GOOD_VISION = "Good Eye Vision";
const CITIZEN_TRAIT_BAD_VISION = "Bad Eye Vision";
export const CITIZEN_TRAIT_ROBOT = "Robot";

export function loadTraits() {
    CITIZEN_TRAIT_FUNCTIONS[CITIZEN_TRAIT_EARLY_BIRD] = { apply: applyEarlyBird, trait: { name: CITIZEN_TRAIT_EARLY_BIRD, opposite: CITIZEN_TRAIT_NIGHT_OWL, type: "neutral" } };
    CITIZEN_TRAIT_FUNCTIONS[CITIZEN_TRAIT_NIGHT_OWL] = { apply: applyNightOwl, trait: { name: CITIZEN_TRAIT_NIGHT_OWL, opposite: CITIZEN_TRAIT_EARLY_BIRD, type: "neutral" } };
    CITIZEN_TRAIT_FUNCTIONS[CITIZEN_TRAIT_ROBOT] = { apply: applyRobot, trait: { name: CITIZEN_TRAIT_ROBOT, type: "shouldNotBeAppliedRandomly" } };
    CITIZEN_TRAIT_FUNCTIONS[CITIZEN_TRAIT_BAD_NAME_MEMORY] = { apply: applyBadNameMemory, trait: { name: CITIZEN_TRAIT_BAD_NAME_MEMORY, opposite: CITIZEN_TRAIT_GOOD_NAME_MEMORY, type: "negative" } };
    CITIZEN_TRAIT_FUNCTIONS[CITIZEN_TRAIT_GOOD_NAME_MEMORY] = { apply: applyGoodNameMemory, trait: { name: CITIZEN_TRAIT_GOOD_NAME_MEMORY, opposite: CITIZEN_TRAIT_BAD_NAME_MEMORY, type: "positive" } };
    CITIZEN_TRAIT_FUNCTIONS[CITIZEN_TRAIT_BAD_VISION] = { apply: applyBadEyeVision, trait: { name: CITIZEN_TRAIT_BAD_VISION, opposite: CITIZEN_TRAIT_GOOD_VISION, type: "negative" } };
    CITIZEN_TRAIT_FUNCTIONS[CITIZEN_TRAIT_GOOD_VISION] = { apply: applyGoodEyeVision, trait: { name: CITIZEN_TRAIT_GOOD_VISION, opposite: CITIZEN_TRAIT_BAD_VISION, type: "positive" } };
}

export function handleChatterAddTraitMessage(chatter: ChatterData, citizen: Citizen, trait: string, state: ChatSimState) {
    let checkedTrait = trait;
    const traitList = Object.keys(CITIZEN_TRAIT_FUNCTIONS);
    for (let entry of traitList) {
        if (checkIsTextCloseTo(trait, entry)) {
            if (checkedTrait !== entry) {
                checkedTrait = entry;
            }
            break;
        }
    }
    addChatterChangeLog(`${citizen.name} added trait ${checkedTrait}`, state);
    saveTraitInChatter(chatter, checkedTrait);
    citizenAddTrait(citizen, checkedTrait, state);
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

export function citizenAddRandomTrait(citizen: Citizen, state: ChatSimState) {
    const keys = Object.keys(CITIZEN_TRAIT_FUNCTIONS);
    const randomAllowedTraits = [];
    for (let key of keys) {
        const traitFunctions = CITIZEN_TRAIT_FUNCTIONS[key];
        if (traitFunctions.trait.type !== "shouldNotBeAppliedRandomly") {
            randomAllowedTraits.push(key);
        }
    }
    const randomIndex = Math.floor(randomAllowedTraits.length * nextRandom(state.randomSeed));
    const randomTrait = randomAllowedTraits[randomIndex];
    citizenAddTrait(citizen, randomTrait, state);
}

export function citizenAddTrait(citizen: Citizen, trait: string, state: ChatSimState) {
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

function applyBadNameMemory(citizen: Citizen, state: ChatSimState) {
    citizen.memory.metCitizensData.maxNamesRemember = Math.floor(CITIZEN_DEFAULT_NAMES_REMEMBER * 0.66);
}

function applyGoodNameMemory(citizen: Citizen, state: ChatSimState) {
    citizen.memory.metCitizensData.maxNamesRemember = Math.floor(CITIZEN_DEFAULT_NAMES_REMEMBER * 1.4);
}

function applyBadEyeVision(citizen: Citizen, state: ChatSimState) {
    citizen.visionFactor = 0.5 + nextRandom(state.randomSeed) * 0.3;
}

function applyGoodEyeVision(citizen: Citizen, state: ChatSimState) {
    citizen.visionFactor = 1.2 + nextRandom(state.randomSeed) * 0.8;
}

function applyNightOwl(citizen: Citizen, state: ChatSimState) {
    citizen.goToBedTime = (0.9 * (nextRandom(state.randomSeed) * 0.2 + 1.1)) % 1;
}