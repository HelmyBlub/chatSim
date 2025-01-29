import { IMAGE_PATH_TREE, IMAGE_PATH_TREE_LOG } from "../../drawHelper.js";
import { ChatSimState, Position } from "../chatSimModels.js";
import { ChatSimMap, PaintDataMap } from "./map.js";
import { IMAGES } from "../images.js";
import { mapPositionToPaintPosition } from "../paint.js";
import { MAP_OBJECTS_FUNCTIONS, mapAddObjectRandomPosition, MapObject } from "./mapObject.js";

export type Tree = MapObject & {
    woodValue: number,
    position: Position,
    trunkDamagePerCent: number,
    fallTime?: number,
}

export const MAP_OBJECT_TREE = "tree";

export function loadMapObjectTree() {
    MAP_OBJECTS_FUNCTIONS[MAP_OBJECT_TREE] = {
        create: createTree,
        getVisionDistanceFactor: getVisionDistanceFactor,
        getMaxVisionDistanceFactor: getMaxVisionDistanceFactor,
        onDeleteOnTile: onDelete,
        paint: paintTree,
        tickGlobal: tickTreeSpawn,
    }
}

function getMaxVisionDistanceFactor() {
    return 2;
}

function getVisionDistanceFactor(tree: Tree) {
    return tree.fallTime === undefined ? 2 : 0.8;
}

function tickTreeSpawn(state: ChatSimState) {
    if (state.map.treeCounter >= state.map.maxTrees) return;
    const maxSpawn = Math.min(state.map.maxTrees - state.map.treeCounter, 1000);
    for (let i = 0; i < maxSpawn; i++) {
        const result = mapAddObjectRandomPosition(MAP_OBJECT_TREE, state);
        if (result) state.map.treeCounter++;
    }
}

function onDelete(object: MapObject, map: ChatSimMap) {
    map.treeCounter--;
}

function paintTree(ctx: CanvasRenderingContext2D, tree: Tree, paintDataMap: PaintDataMap, state: ChatSimState) {
    const treePaintSize = 60;
    const paintPos = mapPositionToPaintPosition(tree.position, paintDataMap);
    if (tree.fallTime !== undefined) {
        const fallDuration = 1000;
        if (tree.fallTime + fallDuration > state.time) {
            const rotation = ((tree.fallTime - state.time) / fallDuration) * Math.PI / 2;
            ctx.save();
            ctx.translate(paintPos.x, paintPos.y);
            ctx.rotate(rotation)
            ctx.translate(-paintPos.x, -paintPos.y);
            ctx.drawImage(IMAGES[IMAGE_PATH_TREE], 0, 0, 200, 200,
                paintPos.x - treePaintSize / 2,
                paintPos.y - treePaintSize / 2,
                treePaintSize, treePaintSize
            );
            ctx.restore();
        } else {
            const maxTreeWoodValue = 10;
            const widthFactor = tree.woodValue / maxTreeWoodValue * 0.9 + 0.1;
            ctx.drawImage(IMAGES[IMAGE_PATH_TREE_LOG], 0, 0, 200 * widthFactor, 200,
                paintPos.x - treePaintSize / 2 * widthFactor,
                paintPos.y - treePaintSize / 2,
                treePaintSize * widthFactor, treePaintSize);
        }
    } else {
        ctx.drawImage(IMAGES[IMAGE_PATH_TREE], 0, 0, 200, 200,
            paintPos.x - treePaintSize / 2,
            paintPos.y - treePaintSize / 2,
            treePaintSize, treePaintSize);
    }
}

function createTree(position: Position) {
    const newTree: Tree = {
        type: MAP_OBJECT_TREE,
        woodValue: 10,
        trunkDamagePerCent: 0,
        position: {
            x: position.x,
            y: position.y,
        }
    }
    return newTree;
}

