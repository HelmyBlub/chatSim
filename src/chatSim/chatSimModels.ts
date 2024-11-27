import { Citizen } from "./citizen.js"
import { CitizenNeedsFunctions } from "./citizenNeeds/citizenNeed.js"
import { Inventory } from "./inventory.js"
import { FunctionsCitizenJobs } from "./jobs/job.js"
import { ChatSimMap } from "./map.js"
import { TestData } from "./test/test.js"

export type Position = {
    x: number,
    y: number,
}

export type Logger = {
    log: (message: string, data?: any) => void,
}

export type RandomSeed = { seed: number };

export type Mushroom = {
    position: Position,
}

export type App = {
    state: ChatSimState,
    gameSpeed: number,
    gameSpeedRemainder?: number,
    tempState?: ChatSimState,
    runningTests?: TestData,
    didFirstTestRun?: boolean, // chrome somehow always is slower on the first run, which is bad for performance measures. So this exists to check for it
}

export type BuildingType = "Market" | "House";
export type Building = {
    type: BuildingType,
    owner: Citizen,
    inhabitedBy?: Citizen,
    position: Position,
    buildProgress?: number,
    deterioration: number,
    inventory: Inventory,
}

export type BuildingMarket = Building & {
    queue: Citizen[],
    displayedItem?: string,
}

export type PaintDataMap = {
    paintOffset: Position,
    paintHeight: number,
    paintWidth: number,
    zoom: number,
    cameraPosition: Position,
    lockCameraToSelected: boolean,
}

export type ChatSimState = {
    canvas?: HTMLCanvasElement,
    logger?: Logger,
    streamer: string,
    time: number,
    timPerDay: number,
    sunriseAt: number,
    sunsetAt: number,
    randomSeed: RandomSeed,
    map: ChatSimMap,
    paintData: {
        map: PaintDataMap,
    }
    inputData: {
        lastMouseDownTime: number,
        lastMouseDownPosition: Position,
        selected?: {
            type: string,
            object: any,
        },
        map: {
            mouseMoveMap: boolean,
            moveX: number,
            moveY: number,
        }
    }
    functionsCitizenJobs: FunctionsCitizenJobs,
    functionsCitizenNeeds: CitizenNeedsFunctions,
    chatterNames: string[],
}
