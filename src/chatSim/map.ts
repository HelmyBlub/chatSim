import { Mushroom, Tree, House, ChatSimState, Position } from "./chatSimModels.js";
import { Citizen } from "./citizen.js";

export type TilePosition = {
    tileX: number,
    tileY: number,
}

export type Tile = {
    position: TilePosition,
    usedByType: string,
    object: any,
}

export type ChatSimMap = {
    tileSize: number,
    tileCounterHorizontal: number,
    tileCounterVertical: number,
    mapHeight: number,
    mapWidth: number,
    citizens: Citizen[],
    mushrooms: Mushroom[],
    maxMushrooms: number,
    usedTiles: Tile[],
    emptyTiles: TilePosition[],
    trees: Tree[],
    houses: House[],
    maxTrees: number,
}

export function createDefaultMap(): ChatSimMap {
    const tileSize = 60;
    const tilesHorizontal = 5;
    const tilesVertical = 5;
    const map: ChatSimMap = {
        tileSize: tileSize,
        tileCounterHorizontal: tilesHorizontal,
        tileCounterVertical: tilesVertical,
        mapHeight: tileSize * tilesVertical,
        mapWidth: tileSize * tilesHorizontal,
        citizens: [],
        mushrooms: [],
        maxMushrooms: 2,
        maxTrees: 2,
        trees: [],
        houses: [],
        emptyTiles: [],
        usedTiles: [],
    }
    fillAllTilesAtStart(map);
    return map;
}

export function createHouseOnRandomTile(owner: Citizen, state: ChatSimState): House | undefined {
    if (state.map.emptyTiles.length === 0) return undefined;
    const emptyTileIndex = getRandomEmptyTileIndex(state);
    const tilePosition = state.map.emptyTiles[emptyTileIndex];
    const mapPosition = tilePositionToMapPosition(tilePosition, state.map);
    const house = createHouse(owner, mapPosition);
    state.map.houses.push(house);
    state.map.emptyTiles.splice(emptyTileIndex, 1);
    state.map.usedTiles.push({
        position: tilePosition,
        usedByType: "House",
        object: house,
    });
    return house;
}

export function removeHouseFromMap(house: House, map: ChatSimMap) {
    const usedTileIndex = map.usedTiles.findIndex(t => t.object === house);
    if (usedTileIndex === -1) return;
    const houseIndex = map.houses.findIndex(h => h === house);
    if (houseIndex === -1) return;
    map.houses.splice(houseIndex, 1);
    const usedTile = map.usedTiles.splice(usedTileIndex, 1)[0];
    map.emptyTiles.push({
        tileX: usedTile.position.tileX,
        tileY: usedTile.position.tileY,
    });
}

export function tilePositionToMapPosition(tilePosition: TilePosition, map: ChatSimMap): Position {
    return {
        x: tilePosition.tileX * map.tileSize + map.tileSize / 2 - map.mapWidth / 2,
        y: tilePosition.tileY * map.tileSize + map.tileSize / 2 - map.mapHeight / 2,
    }
}

function getRandomEmptyTileIndex(state: ChatSimState): number {
    return Math.floor(Math.random() * state.map.emptyTiles.length);
}

function createHouse(owner: Citizen, position: Position): House {
    return {
        owner: owner,
        inventory: [],
        maxInventory: 50,
        position: {
            x: position.x,
            y: position.y,
        },
        buildProgress: 0,
        deterioration: 0,
    }
}

function fillAllTilesAtStart(map: ChatSimMap) {
    if (map.emptyTiles.length !== 0) return;
    for (let x = 0; x < map.tileCounterHorizontal; x++) {
        for (let y = 0; y < map.tileCounterVertical; y++) {
            map.emptyTiles.push({
                tileX: x,
                tileY: y,
            });
        }
    }
}