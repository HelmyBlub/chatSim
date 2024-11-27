import { IMAGE_PATH_TREE, IMAGE_PATH_TREE_LOG } from "../drawHelper.js";
import { ChatSimState, PaintDataMap, Position } from "./chatSimModels.js";
import { IMAGES } from "./images.js";
import { mapPositionToPaintPosition } from "./paint.js";

export type Tree = {
    woodValue: number,
    position: Position,
    trunkDamagePerCent: number,
    fallTime?: number,
}

export function paintTrees(ctx: CanvasRenderingContext2D, paintDataMap: PaintDataMap, state: ChatSimState) {
    const treePaintSize = 60;
    for (let tree of state.map.trees) {
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
}

export function createTree(position: Position) {
    const newTree: Tree = {
        woodValue: 10,
        trunkDamagePerCent: 0,
        position: {
            x: position.x,
            y: position.y,
        }
    }
    return newTree;
}

