import { ChatSimState } from "../chatSimModels.js";
import { Citizen, CITIZEN_STATE_TYPE_TICK_FUNCTIONS, citizenAddThought, citizenAddTodo, citizenSetThought, citizenStateStackTaskSuccess, TAG_AT_HOME, TAG_DOING_NOTHING, TAG_OUTSIDE, TAG_PHYSICALLY_ACTIVE, TAG_SOCIAL_INTERACTION, TAG_WALKING_AROUND } from "../citizen.js";
import { setCitizenStateDoNothingAtHome, setCitizenStateTalkToSomebody, setCitizenStateWalkingAroundRandomly } from "../citizenState/citizenStateActivity.js";
import { nextRandom } from "../main.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { CITIZEN_NEEDS_FUNCTIONS, citizenNeedOnNeedFulfilled } from "./citizenNeed.js";

type CitizenLeisureFunction = (citizen: Citizen, state: ChatSimState) => void;
type CitizenLeisureData = {
    leisure: string,
    startingHappiness: number,
}

export const CITIZEN_NEED_HAPPINESS = "need happiness";

const CITIZEN_LEISURE_DO_NOTHING = "do nothing at home";
const CITIZEN_LEISURE_WALK_AROUND_RANDOMLY = "walk around randomly";
const CITIZEN_LEISURE_TALK_TO_SOMEBODY = "talk to somebody";
const CITIZEN_LEISURE_FUNCTIONS: { [key: string]: CitizenLeisureFunction } = {};
CITIZEN_LEISURE_FUNCTIONS[CITIZEN_LEISURE_DO_NOTHING] = setCitizenStateDoNothingAtHome;
CITIZEN_LEISURE_FUNCTIONS[CITIZEN_LEISURE_WALK_AROUND_RANDOMLY] = setCitizenStateWalkingAroundRandomly;
CITIZEN_LEISURE_FUNCTIONS[CITIZEN_LEISURE_TALK_TO_SOMEBODY] = setCitizenStateTalkToSomebody;


export const CITIZEN_DO_LEISURE_AT_HAPPINESS_PER_CENT = -0.5;
const CITIZEN_STATE_DECIDE_LEISURE = "decide leisure";

export function loadCitizenNeedsFunctionsHappiness() {
    CITIZEN_NEEDS_FUNCTIONS[CITIZEN_NEED_HAPPINESS] = {
        isFulfilled: isFulfilled,
    }
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_HAPPINESS] = citizenNeedTickHappiness;
}

export function citizenHappinessToString(citizen: Citizen): string {
    const happiness = citizen.happinessData.happiness;
    if (happiness < -0.5) return "horrible";
    if (happiness < -0.25) return "sad";
    if (happiness < 0) return "fine";
    if (happiness < 0.5) return "good";
    return "happy";
}

function isFulfilled(citizen: Citizen, state: ChatSimState): boolean {
    if (citizen.happinessData.happiness < CITIZEN_DO_LEISURE_AT_HAPPINESS_PER_CENT) {
        citizenAddTodo(citizen, Math.abs(citizen.happinessData.happiness) * 0.8, CITIZEN_NEED_HAPPINESS, `I should do something which makes me happy soon.`, state);
    }
    return true;
}

export function citizenNeedTickHappiness(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        if (citizen.happinessData.happiness < CITIZEN_DO_LEISURE_AT_HAPPINESS_PER_CENT) {
            citizenAddThought(citizen, `I am too unhappy. I need to do something.`, state);
            citizen.stateInfo.stack.unshift({ state: CITIZEN_STATE_DECIDE_LEISURE, tags: new Set() });
            return;
        } else {
            citizenAddThought(citizen, `I feel a bit better.`, state);
            citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_HAPPINESS, state);
            return;
        }
    }
    if (citizen.stateInfo.stack.length > 0) {
        const citizenStack = citizen.stateInfo.stack[0];
        if (citizenStack.state === CITIZEN_STATE_DECIDE_LEISURE) {
            let data: CitizenLeisureData = citizenStack.data;
            if (!data) {
                let decidedLeisure = undefined;
                if (citizen.happinessData.socialBattery < 0.2 && citizen.happinessData.isExtrovert) {
                    decidedLeisure = CITIZEN_LEISURE_TALK_TO_SOMEBODY;
                    citizenAddThought(citizen, `I need to ${decidedLeisure}.`, state);
                }
                if (!decidedLeisure) {
                    const didHelpKeys = Object.keys(citizen.memory.leisure.didHelp);
                    if (didHelpKeys.length > 0) {
                        decidedLeisure = didHelpKeys[0];
                        citizenAddThought(citizen, `I like to ${decidedLeisure}.`, state);
                    }
                }
                if (!decidedLeisure) {
                    const leisureOptions = Object.keys(CITIZEN_LEISURE_FUNCTIONS);
                    const didNotHelpKeys = Object.keys(citizen.memory.leisure.didNotHelp);
                    if (didNotHelpKeys.length > 0) {
                        for (let key of didNotHelpKeys) {
                            const index = leisureOptions.findIndex(o => o === key);
                            if (index > -1) leisureOptions.splice(index, 1);
                        }
                    }
                    if (leisureOptions.length > 0) {
                        const randomIndex = Math.floor(nextRandom(state.randomSeed) * leisureOptions.length);
                        decidedLeisure = leisureOptions[randomIndex];
                        citizenAddThought(citizen, `I like to try ${decidedLeisure}.`, state);
                    } else {
                        // retry activities which did not help
                        const maxTryCounter = 3;
                        let currentChoosenKey = undefined;
                        let currentChoosenCounter = 3;
                        for (let key of didNotHelpKeys) {
                            let didNotHelpData = citizen.memory.leisure.didNotHelp[key];
                            if (didNotHelpData.counter < maxTryCounter) {
                                if (currentChoosenKey === undefined || currentChoosenCounter > didNotHelpData.counter) {
                                    currentChoosenKey = key;
                                    currentChoosenCounter = didNotHelpData.counter;
                                }
                            }
                        }
                        if (currentChoosenKey !== undefined) {
                            decidedLeisure = currentChoosenKey;
                            citizenAddThought(citizen, `Let's try ${decidedLeisure} again.`, state);
                        } else {
                            citizenAddThought(citizen, `I have tried everything i know and i am still not happy.`, state);
                            citizenStateStackTaskSuccess(citizen);
                            citizenNeedOnNeedFulfilled(citizen, CITIZEN_NEED_HAPPINESS, state);
                            return;
                        }
                    }
                }
                if (decidedLeisure !== undefined) {
                    CITIZEN_LEISURE_FUNCTIONS[decidedLeisure](citizen, state);
                    data = {
                        leisure: decidedLeisure,
                        startingHappiness: citizen.happinessData.happiness,
                    };
                    citizenStack.data = data;
                    return;
                }
            } else {
                const happinessChange = citizen.happinessData.happiness - data.startingHappiness;
                if (happinessChange > 0.25) {
                    let didHelpData = citizen.memory.leisure.didHelp[data.leisure];
                    if (!didHelpData) {
                        didHelpData = {
                            counter: 1,
                            lastExecuted: state.time,
                            leisure: data.leisure
                        };
                        citizen.memory.leisure.didHelp[data.leisure] = didHelpData;
                        let didNotHelpData = citizen.memory.leisure.didNotHelp[data.leisure];
                        if (didNotHelpData) {
                            delete citizen.memory.leisure.didNotHelp[data.leisure];
                        }
                    } else {
                        didHelpData.counter++;
                        didHelpData.lastExecuted = state.time;
                    }
                } else {
                    let didNotHelpData = citizen.memory.leisure.didNotHelp[data.leisure];
                    if (!didNotHelpData) {
                        didNotHelpData = {
                            counter: 1,
                            lastExecuted: state.time,
                            leisure: data.leisure
                        };
                        citizen.memory.leisure.didNotHelp[data.leisure] = didNotHelpData;
                        let didHelpData = citizen.memory.leisure.didHelp[data.leisure];
                        if (didHelpData) {
                            delete citizen.memory.leisure.didHelp[data.leisure];
                        }
                    } else {
                        didNotHelpData.counter++;
                        didNotHelpData.lastExecuted = state.time;
                    }
                }
                citizenStateStackTaskSuccess(citizen);
            }
        }
    }
    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        tickFunction(citizen, state);
    }
}
