import { ChatSimState, Position } from "../chatSimModels.js";
import { Citizen, citizenMoveTo, citizenStateStackTaskSuccess, isCitizenInInteractionDistance } from "../map/citizen.js";
import { CitizenJob } from "./job.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { FarmTile, MAP_OBJECT_FARM_TILE } from "../map/mapObjectFarmTile.js";
import { MAP_OBJECTS_FUNCTIONS, mapAddObject } from "../map/mapObject.js";
import { mapAddTickQueueEntry, mapGetChunkAndTileForPosition } from "../map/map.js";
import { MAP_OBJECT_MUSHROOM, Mushroom } from "../map/mapObjectMushroom.js";
import { INVENTORY_MUSHROOM, inventoryGetAvailableCapacity } from "../inventory.js";
import { setCitizenStateSellItem } from "../citizenState/citizenStateSellItem.js";
import { setCitizenStateGatherMushroom } from "../citizenState/citizenStateGatherMushroom.js";
import { jobCitizenGathererSell } from "./jobFoodGatherer.js";


export type CitizenJobFarmer = CitizenJob & {
    farmTiles: FarmTile[],
}

export const CITIZEN_JOB_FARMER = "Farmer";

const STRING_TO_STATE_MAPPING: { [key: string]: (citizen: Citizen, job: CitizenJobFarmer, state: ChatSimState) => void } = {
    "plant": tickPlant,
}

export function loadCitizenJobFarmer(state: ChatSimState) {
    state.functionsCitizenJobs[CITIZEN_JOB_FARMER] = {
        create: create,
        tick: tick,
    };
}

function create(state: ChatSimState): CitizenJobFarmer {
    return {
        name: CITIZEN_JOB_FARMER,
        farmTiles: [],
    }
}

function tick(citizen: Citizen, job: CitizenJobFarmer, state: ChatSimState) {
    if (citizen.stateInfo.stack.length === 0) {
        const job = citizen.job as CitizenJobFarmer;
        const availableCapacity = inventoryGetAvailableCapacity(citizen.inventory, INVENTORY_MUSHROOM);
        if (availableCapacity === 0) {
            jobCitizenGathererSell(citizen, INVENTORY_MUSHROOM, state);
            return;
        }
        for (let farmTile of job.farmTiles) {
            for (let planted of farmTile.growSlots) {
                if (planted === undefined) continue;
                const mushroom = planted as Mushroom;
                if (mushroom.foodValue >= 0.15) {
                    setCitizenStateGatherMushroom(citizen, mushroom.position);
                    return;
                }
            }
        }

        const notFullfyFilled = findNotFullyFilledFarmTile(job);
        if (notFullfyFilled) {
            citizen.stateInfo.stack.unshift({ state: "plant", tags: new Set(), data: notFullfyFilled });
            return;
        }
        const pos = findNextTileForFarm(citizen, state, job);
        if (!pos) return;
        const farmTile = MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_FARM_TILE].create!(pos, state) as FarmTile;
        if (mapAddObject(farmTile, state)) {
            job.farmTiles.push(farmTile);
        }
        return;
    }
    if (citizen.stateInfo.stack.length > 0) {
        const internalTick = STRING_TO_STATE_MAPPING[citizen.stateInfo.stack[0].state];
        if (internalTick) {
            internalTick(citizen, job, state);
        } else {
            const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
            if (tickFunction) {
                tickFunction(citizen, state);
                return;
            }
        }
    }
}

function findNotFullyFilledFarmTile(job: CitizenJobFarmer) {
    for (let farmTile of job.farmTiles) {
        const size = farmTile.growSlotSize;
        if (farmTile.growSlots.length < size * size) {
            return farmTile;
        }
    }
}

function tickPlant(citizen: Citizen, job: CitizenJobFarmer, state: ChatSimState) {
    const farmTile = citizen.stateInfo.stack[0].data as FarmTile;
    const size = farmTile.growSlotSize;
    if (farmTile.growSlots.length >= size * size) {
        citizenStateStackTaskSuccess(citizen);
        return;
    }
    if (!citizen.moveTo) {
        if (isCitizenInInteractionDistance(citizen, farmTile.position)) {
            for (let i = 0; i < size * size; i++) {
                const tileSize = state.map.tileSize;
                const pos = {
                    x: farmTile.position.x + (i % size) * tileSize / size - tileSize / 3,
                    y: farmTile.position.y + Math.floor(i / size) * tileSize / size - tileSize / 3,
                }
                const mushroom = MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_MUSHROOM].create!(pos, state) as Mushroom;
                mushroom.foodValue = 0;
                mapAddTickQueueEntry({ mapObject: mushroom, time: state.time }, state);
                farmTile.growSlots.push(mushroom);
            }
        } else {
            citizenMoveTo(citizen, farmTile.position);
        }
        return;
    }
}

function findNextTileForFarm(citizen: Citizen, state: ChatSimState, job: CitizenJobFarmer): Position | undefined {
    if (!citizen.home) return undefined;
    const tileSize = state.map.tileSize;
    if (job.farmTiles.length === 0) {
        //find tile adjacent to home
        const positionsToCheck: Position[] = [
            { x: citizen.home.position.x + tileSize, y: citizen.home.position.y },
            { x: citizen.home.position.x - tileSize, y: citizen.home.position.y },
            { x: citizen.home.position.x, y: citizen.home.position.y + tileSize },
            { x: citizen.home.position.x, y: citizen.home.position.y - tileSize },
        ]
        for (let position of positionsToCheck) {
            const chunkAndTile = mapGetChunkAndTileForPosition(position, state.map);
            if (!chunkAndTile) continue;
            const emptyIndex = chunkAndTile.chunk.emptyTiles.findIndex(t => t.tileX === chunkAndTile.tileX && t.tileY === chunkAndTile.tileY);
            if (emptyIndex !== -1) {
                return position;
            }
        }
    } else {
        //find tile adjacent to existing farm tile
        for (let tile of job.farmTiles) {
            const adjacent: Position[] = [
                { x: tile.position.x + tileSize, y: tile.position.y },
                { x: tile.position.x - tileSize, y: tile.position.y },
                { x: tile.position.x, y: tile.position.y + tileSize },
                { x: tile.position.x, y: tile.position.y - tileSize },
            ];
            for (let position of adjacent) {
                const chunkAndTile = mapGetChunkAndTileForPosition(position, state.map);
                if (!chunkAndTile) continue;
                const emptyIndex = chunkAndTile.chunk.emptyTiles.findIndex(t => t.tileX === chunkAndTile.tileX && t.tileY === chunkAndTile.tileY);
                if (emptyIndex !== -1) {
                    return position;
                }
            }
        }
    }
    return undefined;
}

