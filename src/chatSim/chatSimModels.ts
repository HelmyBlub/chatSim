import { Citizen } from "./citizen.js"
import { CitizenNeedsFunctions } from "./citizenNeeds/citizenNeed.js"
import { FunctionsCitizenJobs } from "./jobs/job.js"

export type Position = {
    x: number,
    y: number,
}

export type InventoryStuff = {
    name: string,
    counter: number,
}

export type Mushroom = {
    position: Position,
}

export type Tree = {
    woodValue: 10,
    position: Position,
}

export type House = {
    owner: Citizen,
    inhabitedBy?: Citizen,
    position: Position,
    buildProgress?: number,
    deterioration: number,
    inventory: InventoryStuff[],
    maxInventory: number,
}

export type ChatSimMap = {
    mapHeight: number,
    mapWidth: number,
    citizens: Citizen[],
    mushrooms: Mushroom[],
    maxMushrooms: number,
    trees: Tree[],
    houses: House[],
    maxTrees: number,
}

export type PaintDataMap = {
    paintOffset: Position,
    paintHeight: number,
    paintWidth: number,
    zoom: number,
    cameraPosition: Position,
}

export type ChatSimState = {
    canvas: HTMLCanvasElement,
    streamer: string,
    time: number,
    timPerDay: number,
    gameSpeed: number,
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
