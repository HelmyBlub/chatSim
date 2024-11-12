import { CitizenNeedsFunctions } from "./citizenNeeds.js"
import { CitizenJob, FunctionsCitizenJobs } from "./job.js"

export type Position = {
    x: number,
    y: number,
}

export type Citizen = {
    job: CitizenJob,
    name: string,
    state: "buyFoodFromMarket" | "workingJob",
    speed: number,
    position: Position,
    moveTo?: Position,
    foodPerCent: number,
    inventory: InventoryStuff[],
    maxInventory: number,
    home?: House,
    money: number,
    skills: { [key: string]: number },
    lastCheckedNeedsTime?: number,
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
}

export type ChatSimMap = {
    paintOffset: Position,
    mapHeight: number,
    mapWidth: number,
    citizens: Citizen[],
    mushrooms: Mushroom[],
    maxMushrooms: number,
    trees: Tree[],
    houses: House[],
    maxTrees: number,
}

export type ChatSimState = {
    canvas: HTMLCanvasElement,
    time: number,
    gameSpeed: number,
    map: ChatSimMap,
    functionsCitizenJobs: FunctionsCitizenJobs,
    functionsCitizenNeeds: CitizenNeedsFunctions,
    chatterNames: string[],
}
