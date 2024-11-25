import { Citizen } from "./citizen.js"
import { CitizenNeedsFunctions } from "./citizenNeeds/citizenNeed.js"
import { Inventory } from "./inventory.js"
import { FunctionsCitizenJobs } from "./jobs/job.js"
import { ChatSimMap } from "./map.js"

export type Position = {
    x: number,
    y: number,
}

export type Mushroom = {
    position: Position,
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
    canvas: HTMLCanvasElement,
    streamer: string,
    time: number,
    timPerDay: number,
    gameSpeed: number,
    gameSpeedRemainder?: number,
    sunriseAt: number,
    sunsetAt: number,
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
    images: { [key: string]: HTMLImageElement },
    chatterNames: string[],
}
