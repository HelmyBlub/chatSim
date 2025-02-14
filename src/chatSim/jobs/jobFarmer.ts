import { ChatSimState, Position } from "../chatSimModels.js";
import { Citizen, citizenAddThought } from "../map/citizen.js";
import { CitizenJob } from "./job.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "../tick.js";
import { FarmTile, MAP_OBJECT_FARM_TILE } from "../map/mapObjectFarmTile.js";
import { MAP_OBJECTS_FUNCTIONS, mapAddObject } from "../map/mapObject.js";
import { mapGetChunkAndTileForPosition } from "../map/map.js";
import { MAP_OBJECT_MUSHROOM } from "../map/mapObjectMushroom.js";


export type CitizenJobFarmer = CitizenJob & {
    farmTiles: FarmTile[],
}

export const CITIZEN_JOB_FARMER = "Farmer";

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
        if (job.farmTiles.length < 5) {
            //create farm tile
            const pos = findNextTileForFarm(citizen, state, job);
            if (!pos) return;
            const farmTile = MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_FARM_TILE].create!(pos, state) as FarmTile;
            if (mapAddObject(farmTile, state)) {
                job.farmTiles.push(farmTile);
            }
        } else {
            //plant seeds
            if (job.farmTiles[0].growSlots.length === 0) {
                const size = job.farmTiles[0].growSlotSize;
                for (let i = 0; i < size * size; i++) {
                    const tileSize = state.map.tileSize;
                    const pos = {
                        x: job.farmTiles[0].position.x + (i % size) * tileSize / size,
                        y: job.farmTiles[0].position.y + Math.floor(i / size) * tileSize / size,
                    }
                    const mushroom = MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_MUSHROOM].create!(pos, state);
                    job.farmTiles[0].growSlots.push(mushroom);
                }
            }
        }
    }
    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        if (tickFunction) {
            tickFunction(citizen, state);
            return;
        }
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

