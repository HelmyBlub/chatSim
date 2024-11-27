import { App, ChatSimState } from "../chatSimModels.js";
import { Citizen, createDefaultCitizen } from "../citizen.js";
import { CITIZEN_STARVING_FOOD_PER_CENT } from "../citizenNeeds/citizenNeedStarving.js";
import { createDefaultChatSimState } from "../main.js";
import { ChatSimMap, createMap, tickChatSimMap } from "../map.js";
import { chatSimTick } from "../tick.js";

export type TestData = {
    currentTest?: Test,
    openTests: Test[],
}

type Test = {
    description: string,
    initTest: () => ChatSimState,
    checkFinishCondition: (state: ChatSimState) => boolean,
    checkSucceded: (state: ChatSimState) => boolean,
}

const activeTests: Test[] = [];

export function startTests(app: App, visualizeTests: boolean = false) {
    if (activeTests.length === 0) initTests();
    if (app.runningTests) return;
    if (visualizeTests) {
        app.tempState = app.state;
        app.runningTests = {
            openTests: [...activeTests],
        }
    } else {
        const testStartTime = performance.now();
        for (let test of activeTests) {
            const currentTestStartTime = performance.now();
            const state = test.initTest();
            const maxNumberIterations = 100000;
            let counter = 0;
            while (!test.checkFinishCondition(state) && counter < maxNumberIterations) {
                chatSimTick(state);
                counter++;
            }
            const result = test.checkSucceded(state);
            const currentTestTimeMS = performance.now() - currentTestStartTime;
            console.log(`success: ${result}, testcase: ${test.description}, time: ${currentTestTimeMS.toFixed(2)}ms`);
        }
        const testTimeMS = performance.now() - testStartTime;
        console.log(`totalTime: ${testTimeMS.toFixed(2)}ms`);
    }
}

export function testRunner(app: App) {
    if (!app.runningTests) return;
    if (!app.runningTests.currentTest) {
        if (app.runningTests.openTests.length > 0) {
            const firstTest: Test = app.runningTests.openTests.shift()!;
            app.runningTests.currentTest = firstTest;
            app.state = firstTest.initTest();
            app.state.canvas = app.tempState!.canvas;
        } else {
            app.runningTests = undefined;
            app.state = app.tempState!;
            app.tempState = undefined;
            return;
        }
    }
    const currentTest = app.runningTests.currentTest;
    const state = app.state;
    if (currentTest.checkFinishCondition(state)) {
        const result = currentTest.checkSucceded(state);
        console.log(`success: ${result}, testcase: ${currentTest.description}`);
        app.runningTests.currentTest = undefined;
    }
}

function initTests() {
    activeTests.push(testCitizenShouldNotStarve());
}

function testCitizenShouldNotStarve(): Test {
    const test: Test = {
        description: "citizen should not starve",
        initTest: () => {
            const state = createDefaultChatSimState("testStreamer", 0);
            state.map = createTestMapSmall();
            const citizen = createStarvingCitizen("testCitizen1", state);
            state.map.citizens.push(citizen);
            return state;
        },
        checkFinishCondition: (state) => {
            const citizen = state.map.citizens[0];
            return citizen.foodPerCent > CITIZEN_STARVING_FOOD_PER_CENT || state.time > 10000;
        },
        checkSucceded: (state) => {
            const citizen = state.map.citizens[0];
            return citizen.foodPerCent > CITIZEN_STARVING_FOOD_PER_CENT;
        }
    }
    return test;
}

function createStarvingCitizen(citizenName: string, testState: ChatSimState): Citizen {
    const citizen = createDefaultCitizen(citizenName, testState);
    citizen.foodPerCent = CITIZEN_STARVING_FOOD_PER_CENT;
    return citizen;
}

function createTestMapSmall(): ChatSimMap {
    return createMap(5, 5, 1, 1);
}