import { App, ChatSimState, Logger } from "../chatSimModels.js";
import { Citizen, citizenCreateDefault } from "../map/citizen.js";
import { CITIZEN_NEED_FOOD_AT_HOME, CITIZEN_NEED_FOOD_IN_INVENTORY } from "../citizenNeeds/citizenNeedFood.js";
import { CITIZEN_STARVING_FOOD_PER_CENT } from "../citizenNeeds/citizenNeedStarving.js";
import { createJob } from "../jobs/job.js";
import { CITIZEN_JOB_FOOD_MARKET } from "../jobs/jobFoodMarket.js";
import { CITIZEN_JOB_LUMBERJACK } from "../jobs/jobLumberjack.js";
import { createJobMarket } from "../jobs/jobMarket.js";
import { createDefaultChatSimState, getDay } from "../main.js";
import { INVENTORY_MUSHROOM, InventoryItemMushroom } from "../inventory.js";
import { ChatSimMap, createMap } from "../map/map.js";
import { chatSimTick } from "../tick.js";
import { createBuildingOnRandomTile } from "../map/mapObjectBuilding.js";

export type TestData = {
    currentTest?: Test,
    openTests: Test[],
}

type Test = {
    name: string,
    description: string,
    initTest: () => ChatSimState,
    checkFinishCondition: (state: ChatSimState) => boolean,
    checkSucceded: (state: ChatSimState) => boolean,
}

type PerformanceEntry = { testName: string, pastRuntimes: number[] };
type PastPerformanceMetrics = {
    maxRuntimesKeepPerTest: number,
    data: PerformanceEntry[],
}

const LOCALSTORAGE_PERFORMANCE_METRICS = "Test Performance Metrics";
const activeTests: Test[] = [];

function initTests() {
    activeTests.push(testCitizenShouldNotStarve());
    activeTests.push(testCitizenShouldBuildHome());
    activeTests.push(testPerformance10Citizens());
    activeTests.push(testPerformance100Citizens());
    activeTests.push(testPerformance10000Citizens());
    activeTests.push(testMarketQueue());
}

export function stopTests(app: App) {
    if (!app.runningTests) return;
    app.runningTests = undefined;
    app.state = app.tempState!;
    app.tempState = undefined;
}

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
        const logs: string[] = [];
        const testLogger: Logger = { log: (message) => logs.push(message) };
        const metrics = loadMetrics();

        for (let test of activeTests) {
            const currentTestStartTime = performance.now();
            const state = test.initTest();
            //            state.logger = testLogger;
            testLogger.log(`--- Started test ${test.description} ---`);
            const maxNumberIterations = 1000000;
            let counter = 0;
            while (!test.checkFinishCondition(state) && counter < maxNumberIterations) {
                chatSimTick(state);
                counter++;
            }
            const result = test.checkSucceded(state);
            const currentTestTimeMS = performance.now() - currentTestStartTime;
            let timeString = `time: ${currentTestTimeMS.toFixed(2)}`;
            if (app.didFirstTestRun) {
                const timeDiffernce = addMetricData(metrics, test.name, currentTestTimeMS);
                if (timeDiffernce !== undefined) {
                    timeString += `, time change: ${(timeDiffernce * 100).toFixed(2)}%`;
                }
            }
            console.log(`success: ${result}, testcase: ${test.description}, ${timeString}, endCitizenCounter: ${state.map.citizens.length}`);
        }
        if (!app.didFirstTestRun) {
            app.didFirstTestRun = true;
        } else {
            saveMetrics(metrics);
        }
        const testTimeMS = performance.now() - testStartTime;
        console.log(`totalTime: ${testTimeMS.toFixed(2)}ms`, metrics);
    }
}

export function testRunner(app: App) {
    if (!app.runningTests) return;
    if (!app.runningTests.currentTest) {
        if (app.runningTests.openTests.length > 0) {
            const firstTest: Test = app.runningTests.openTests.pop()!;
            app.runningTests.currentTest = firstTest;
            app.state = firstTest.initTest();
            app.state.canvas = app.tempState!.canvas;
        } else {
            stopTests(app);
            return;
        }
    }
    const currentTest = app.runningTests.currentTest;
    const state = app.state;
    if (currentTest.checkFinishCondition(state)) {
        const result = currentTest.checkSucceded(state);
        console.log(`success: ${result}, testcase: ${currentTest.description}, endCitizenCounter: ${state.map.citizens.length}`);
        app.runningTests.currentTest = undefined;
    }
}

function testMarketQueue(): Test {
    const test: Test = {
        name: "testMarketQueue",
        description: "market queue",
        initTest: () => {
            const state = createDefaultChatSimState("testStreamer", 0);
            state.time = 20000;
            state.map = createTestMapSmall();
            const marketOwner = createCitizenWithFullfiledNeeds("testCitizenMarket", state);
            state.map.citizens.push(marketOwner);
            marketOwner.job = createJobMarket(state, CITIZEN_JOB_FOOD_MARKET, [INVENTORY_MUSHROOM]);
            const marketBuilding = createBuildingOnRandomTile(marketOwner, state, "Market", marketOwner.position)!;
            marketBuilding.buildProgress = undefined;
            marketBuilding.inhabitedBy = marketOwner;
            const marketMushrooms: InventoryItemMushroom = { name: INVENTORY_MUSHROOM, counter: 30, data: [] };
            for (let i = 0; i < marketMushrooms.counter; i++)marketMushrooms.data!.push(0.15);
            marketBuilding.inventory.items.push(marketMushrooms);
            for (let i = 0; i < 5; i++) {
                const citizen = citizenCreateDefault("testBuyingCustomer" + i, state);
                if (i % 3 === 0) citizen.energyPerCent = 0.94;
                citizen.foodPerCent = 0.87;
                citizen.job = createJob(CITIZEN_JOB_LUMBERJACK, state)!;
                const citizenMushrooms: InventoryItemMushroom = { name: INVENTORY_MUSHROOM, counter: CITIZEN_NEED_FOOD_IN_INVENTORY, data: [] };
                for (let i = 0; i < citizenMushrooms.counter; i++)citizenMushrooms.data!.push(0.15);
                citizen.inventory.items.push();
                state.map.citizens.push(citizen);
            }
            for (let i = 0; i < 2; i++) {
                const citizen = createCitizenWithFullfiledNeeds("testSellingCustomer", state);
                const homeMushrooms = citizen.home!.inventory.items.find(i => i.name === INVENTORY_MUSHROOM)!;
                homeMushrooms.counter = 50;
                for (let i = 0; i < homeMushrooms.counter; i++)homeMushrooms.data!.push(0.15);
                citizen.foodPerCent = 0.887
                citizen.inventory.items.push({ name: INVENTORY_MUSHROOM, counter: 8, data: [0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15, 0.15] });
                state.map.citizens.push(citizen);
            }
            return state;
        },
        checkFinishCondition: (state) => {
            return state.time > 500000;
        },
        checkSucceded: (state) => {
            return false;
        }
    }
    return test;
}

function testCitizenShouldNotStarve(): Test {
    const test: Test = {
        name: "testCitizenShouldNotStarve",
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
            return citizen.foodPerCent > CITIZEN_STARVING_FOOD_PER_CENT || state.time > 30000;
        },
        checkSucceded: (state) => {
            const citizen = state.map.citizens[0];
            return citizen.foodPerCent > CITIZEN_STARVING_FOOD_PER_CENT;
        }
    }
    return test;
}

function testCitizenShouldBuildHome(): Test {
    const test: Test = {
        name: "testCitizenShouldBuildHome",
        description: "citizen should build home",
        initTest: () => {
            const state = createDefaultChatSimState("testStreamer", 0);
            state.map = createTestMapSmall();
            const citizen = createStarvingCitizen("testCitizen1", state);
            state.map.citizens.push(citizen);
            return state;
        },
        checkFinishCondition: (state) => {
            const citizen = state.map.citizens[0];
            return citizen.home !== undefined || state.time > 75000;
        },
        checkSucceded: (state) => {
            const citizen = state.map.citizens[0];
            return citizen.home !== undefined;
        }
    }
    return test;
}


function testPerformance10Citizens(): Test {
    const untilDay = 25;
    const test: Test = {
        name: "testPerformance10Citizens",
        description: "performance 10 citizens",
        initTest: () => {
            const state = createDefaultChatSimState("testStreamer", 0);
            state.map = createTestMapMiddle();
            for (let i = 0; i < 10; i++) {
                const citizen = citizenCreateDefault(`testCitizen${i + 1} `, state);
                state.map.citizens.push(citizen);
            }
            return state;
        },
        checkFinishCondition: (state) => {
            return getDay(state) > untilDay;
        },
        checkSucceded: (state) => {
            if (getDay(state) <= untilDay) console.log(`reached day ${getDay(state)} `);
            return getDay(state) > untilDay;
        }
    }
    return test;
}

function testPerformance100Citizens(): Test {
    const test: Test = {
        name: "testPerformance100Citizens",
        description: "performance 100 citizens",
        initTest: () => {
            const state = createDefaultChatSimState("testStreamer", 0);
            state.map = createTestMapBig();
            for (let i = 0; i < 100; i++) {
                const citizen = citizenCreateDefault(`testCitizen${i + 1} `, state);
                state.map.citizens.push(citizen);
            }
            return state;
        },
        checkFinishCondition: (state) => {
            return getDay(state) > 5;
        },
        checkSucceded: (state) => {
            return true;
        }
    }
    return test;
}

function testPerformance10000Citizens(): Test {
    const untilTime = 10000;
    const test: Test = {
        name: "testPerformance10000Citizens",
        description: "performance 10000 citizens",
        initTest: () => {
            const state = createDefaultChatSimState("testStreamer", 0);
            state.map = createTestMapBig();
            for (let i = 0; i < 10000; i++) {
                const citizen = citizenCreateDefault(`testCitizen${i + 1} `, state);
                state.map.citizens.push(citizen);
            }
            return state;
        },
        checkFinishCondition: (state) => {
            return state.time > untilTime;
        },
        checkSucceded: (state) => {
            if (state.time <= untilTime) console.log(`reached time ${state.time} `);
            return state.time > untilTime;
        }
    }
    return test;
}


function createStarvingCitizen(citizenName: string, testState: ChatSimState): Citizen {
    const citizen = citizenCreateDefault(citizenName, testState);
    citizen.foodPerCent = CITIZEN_STARVING_FOOD_PER_CENT;
    return citizen;
}

function createCitizenWithFullfiledNeeds(citizenName: string, testState: ChatSimState): Citizen {
    const citizen = citizenCreateDefault(citizenName, testState);
    const home = createBuildingOnRandomTile(citizen, testState, "House", citizen.position)!;
    home.buildProgress = undefined;
    home.inhabitedBy = citizen;
    citizen.home = home;
    home.inventory.items.push({ name: INVENTORY_MUSHROOM, counter: CITIZEN_NEED_FOOD_AT_HOME, data: [] });
    return citizen;
}

function createTestMapSmall(): ChatSimMap {
    return createMap(5, 5, 3, 1);
}

function createTestMapMiddle(): ChatSimMap {
    return createMap(16, 9, 6, 3);
}

function createTestMapBig(): ChatSimMap {
    return createMap(100, 100, 600, 300);
}

/**
 * @returns time difference to last run or undefined when not previous time exists
 */
function addMetricData(metrics: PastPerformanceMetrics, testName: string, time: number): number | undefined {
    let data: PerformanceEntry | undefined = metrics.data.find(e => e.testName === testName);
    if (!data) {
        data = { testName: testName, pastRuntimes: [] };
        metrics.data.push(data);
    }
    data.pastRuntimes.push(time);
    if (data.pastRuntimes.length > metrics.maxRuntimesKeepPerTest) {
        data.pastRuntimes.shift();
    }
    if (data.pastRuntimes.length > 1) {
        const lastTime = data.pastRuntimes[data.pastRuntimes.length - 2];
        return (time - lastTime) / lastTime;
    }
    return undefined;
}

function loadMetrics(): PastPerformanceMetrics {
    const storage = localStorage.getItem(LOCALSTORAGE_PERFORMANCE_METRICS);
    let metrics: PastPerformanceMetrics;
    if (storage === null) {
        metrics = {
            maxRuntimesKeepPerTest: 10,
            data: [],
        }
    } else {
        metrics = JSON.parse(storage);
    }
    return metrics;
}

function saveMetrics(metrics: PastPerformanceMetrics) {
    const data = JSON.stringify(metrics);
    localStorage.setItem(LOCALSTORAGE_PERFORMANCE_METRICS, data);
}