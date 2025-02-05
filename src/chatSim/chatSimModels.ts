import { Citizen, LogEntry } from "./citizen.js"
import { FunctionsCitizenJobs } from "./jobs/job.js"
import { ChatSimMap, PaintDataMap } from "./map/map.js"
import { UiButton, UiRectangle } from "./rectangle.js"
import { TestData } from "./test/test.js"
import { LineChart } from "./window/windowStatistics.js"

export type Position = {
    x: number,
    y: number,
}

export type Logger = {
    log: (message: string, data?: any) => void,
}

export type RandomSeed = { seed: number };

export type App = {
    state: ChatSimState,
    gameSpeedRemainder?: number,
    tempState?: ChatSimState,
    runningTests?: TestData,
    didFirstTestRun?: boolean, // chrome somehow always is slower on the first run, which is bad for performance measures. So this exists to check for it
}

export type SelectedObject = {
    type: string,
    object: any,
}

export type ChatterData = {
    name: string,
    dreamJob?: string,
    traits?: string[],
}

export type ChatterChangeLog = {
    maxLength: number,
    currentIndex: number,
    log: LogEntry[],
}

export type ChatSimState = {
    canvas?: HTMLCanvasElement,
    logger?: Logger,
    tickInterval: number,
    soundVolume?: number,
    gameSpeed: number,
    gameSpeedLimited?: number,
    streamer: string,
    time: number,
    timPerDay: number,
    sunriseAt: number,
    sunsetAt: number,
    randomSeed: RandomSeed,
    map: ChatSimMap,
    deceasedCitizens: Citizen[],
    paintData: {
        displaySelected?: UiRectangle,
        map: PaintDataMap,
        buttons: UiButton[],
    }
    statistics: {
        lineCharts: LineChart[],
        stealCounter: number,
        giftedCounter: number,
    }
    inputData: {
        mousePosition: Position,
        lastMouseDownTime: number,
        lastMouseDownPosition: Position,
        selected?: SelectedObject,
        map: {
            mouseMoveMap: boolean,
            moveX: number,
            moveY: number,
        },
        chatterChangeLog: ChatterChangeLog,
    }
    functionsCitizenJobs: FunctionsCitizenJobs,
    chatterData: ChatterData[],
}

