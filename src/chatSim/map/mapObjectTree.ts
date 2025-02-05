import { IMAGE_PATH_TREE, IMAGE_PATH_TREE_LOG } from "../../drawHelper.js";
import { ChatSimState, Position } from "../chatSimModels.js";
import { UiRectangle } from "../rectangle.js";
import { Rectangle } from "../rectangle.js";
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
        createSelectionData: createSelectionData,
        getVisionDistanceFactor: getVisionDistanceFactor,
        getMaxVisionDistanceFactor: getMaxVisionDistanceFactor,
        onDeleteOnTile: onDelete,
        paint: paintTree,
        tickGlobal: tickTreeSpawn,
    }
}

function createSelectionData(state: ChatSimState): UiRectangle {
    const width = 500;
    const citizenUiRectangle: UiRectangle = {
        mainRect: {
            topLeft: { x: state.canvas!.width - width, y: 0 },
            height: 100,
            width: width,
        },
        tabs: [
            {
                name: "Generell",
                paint: paintSelectionData,
            },
        ],
        heading: "Tree:",
    }
    return citizenUiRectangle;
}

function paintSelectionData(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const tree: Tree = state.inputData.selected?.object as Tree;
    if (!tree) return;
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    const padding = 5;
    let offsetX = rect.topLeft.x + padding;
    let offsetY = rect.topLeft.y + fontSize + padding;
    const lineSpacing = fontSize + padding;
    let lineCounter = 0;
    ctx.fillText(`wood: ${tree.woodValue}`, offsetX, offsetY + lineSpacing * lineCounter++);
    ctx.fillText(`trunkDamage: ${(tree.trunkDamagePerCent * 100).toFixed()}%`, offsetX, offsetY + lineSpacing * lineCounter++);

    rect.height = lineSpacing * lineCounter + padding * 2;
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

