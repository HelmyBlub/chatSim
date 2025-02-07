import { ChatSimState, Position } from "../chatSimModels.js";
import { Rectangle, rectangleClickedInside, rectanglePaint, UiRectangle } from "../rectangle.js";
import { Graph, graphPaintHeading, graphPaintXAxis, graphPaintYAxis, GRAPHS_FUNCTIONS, graphValueToPaintOffset } from "./graph.js";

const POINT_LIMIT = 100;

export type AreaGraph = Graph & {
    pointSetIndex: number,
    pointLevelSets: {
        label?: string,
        pointSets: Position[][];
        pointsAveragedCounter?: number,
    }[],
    chooseLevelButtons: Rectangle[],
    buttonsLabelPrefix: number,
    xLabel: string;
    yLabel: string;
    currentMaxY: number;
    currentMinY: number;
};

export const GRAPH_AREA_GRAPH = "AreaGraph";

export function loadGraphAreaGraph() {
    GRAPHS_FUNCTIONS[GRAPH_AREA_GRAPH] = {
        paint: paint,
    }
}

export function createAreaGraph(name: string, xLabel: string, yLabel: string, buttonsLabelPrefix: number, levels: number = 2): AreaGraph {
    const pointSets = [];
    for (let i = 0; i < levels; i++) {
        pointSets.push({ pointSets: [], pointsAveragedCounter: i === 0 ? undefined : 0 });
    }
    return {
        type: GRAPH_AREA_GRAPH,
        heading: name,
        pointSetIndex: 0,
        pointLevelSets: pointSets,
        xLabel,
        yLabel,
        currentMaxY: 0,
        currentMinY: 0,
        chooseLevelButtons: [],
        buttonsLabelPrefix: buttonsLabelPrefix
    };
}

export function areaGraphAddPointSet(pointSet: Position[], areaGraph: AreaGraph) {
    let currentPointSetIndex = 0;
    let currentPointSet = areaGraph.pointLevelSets[currentPointSetIndex];
    let totalY = 0;
    for (let point of pointSet) {
        totalY += point.y;
    }
    if (currentPointSet.pointSets.length === 0) {
        areaGraph.currentMaxY = totalY;
        areaGraph.currentMinY = 0;
    } else {
        if (areaGraph.currentMaxY < totalY) areaGraph.currentMaxY = totalY;
        if (areaGraph.currentMinY > totalY) areaGraph.currentMinY = totalY;
    }
    currentPointSet.pointSets.push(pointSet);
    do {
        if (currentPointSet.pointSets.length > POINT_LIMIT) {
            const oldPointSet = currentPointSet.pointSets.shift()!;
            const nextPointsSet = areaGraph.pointLevelSets[currentPointSetIndex + 1];
            if (nextPointsSet === undefined) break;
            if (nextPointsSet.pointsAveragedCounter === 0) {
                nextPointsSet.pointSets.push(oldPointSet);
            } else {
                const pointSet2 = nextPointsSet.pointSets[nextPointsSet.pointSets.length - 1];
                if (pointSet2.length === oldPointSet.length) {
                    for (let i = 0; i < pointSet2.length; i++) {
                        pointSet2[i].y += (oldPointSet[i].y - pointSet2[i].y) / (nextPointsSet.pointsAveragedCounter! + 1);
                    }
                }
            }
            nextPointsSet.pointsAveragedCounter = (nextPointsSet.pointsAveragedCounter! + 1) % POINT_LIMIT;
            currentPointSet = nextPointsSet;
        } else {
            break;
        }
    } while (currentPointSet !== undefined);
}

function paint(ctx: CanvasRenderingContext2D, areaGraph: AreaGraph, rect: Rectangle) {
    const padding = 20;
    let yOffset = rect.topLeft.y;
    yOffset += graphPaintHeading(ctx, areaGraph, rect);
    yOffset += paintSelectButtons(ctx, areaGraph, rect, yOffset);
    const buttonHeight = areaGraph.chooseLevelButtons.length > 1 ? areaGraph.chooseLevelButtons[0].height : 0;

    const paintRectWithLabelingSpace: Rectangle = {
        topLeft: {
            x: rect.topLeft.x + padding,
            y: yOffset + padding + 5,
        },
        width: rect.width - padding * 2,
        height: rect.height - buttonHeight - padding * 3,
    }
    const pointSets = areaGraph.pointLevelSets[areaGraph.pointSetIndex].pointSets;
    const startValueX = pointSets.length > 1 ? pointSets[0][0].x : 0;
    const endValueX = pointSets.length > 1 ? pointSets[pointSets.length - 1][0].x : 0;
    graphPaintXAxis(ctx, paintRectWithLabelingSpace, areaGraph.xLabel, startValueX, endValueX);
    graphPaintYAxis(ctx, paintRectWithLabelingSpace, areaGraph.yLabel, 0, areaGraph.currentMaxY);
    paintPoints(ctx, paintRectWithLabelingSpace, areaGraph, pointSets);
}

export function areaGraphClickedInside(relativeMouseToCanvas: Position, rect: Rectangle, state: ChatSimState) {
    const uiRect = state.paintData.displaySelected as UiRectangle;
    if (!uiRect) return;
    state.statistics.graphs
    const areaGraph = state.statistics.graphs[2] as AreaGraph;

    for (let i = 0; i < areaGraph.chooseLevelButtons.length; i++) {
        if (rectangleClickedInside(relativeMouseToCanvas, areaGraph.chooseLevelButtons[i])) {
            areaGraph.pointSetIndex = i;
            break;
        }
    }
}

function paintSelectButtons(ctx: CanvasRenderingContext2D, areaGraph: AreaGraph, rect: Rectangle, offsetY: number): number {
    if (areaGraph.pointLevelSets.length < 2) return 0;
    const padding = 5;
    const fontSize = 16;
    setupLevelSelectButtons(areaGraph, fontSize + padding * 2, offsetY);
    ctx.font = `${fontSize}px Arial`;
    let offsetX = rect.topLeft.x + padding;
    for (let i = 0; i < areaGraph.pointLevelSets.length; i++) {
        const fillColor = i === areaGraph.pointSetIndex ? "lightblue" : undefined;
        const rectangle = areaGraph.chooseLevelButtons[i];
        const text = areaGraph.buttonsLabelPrefix * Math.pow(POINT_LIMIT, i) + " " + areaGraph.xLabel + "s";
        rectangle.topLeft.x = offsetX;
        rectangle.width = ctx.measureText(text).width + padding * 2;
        offsetX += rectangle.width + padding;
        rectanglePaint(ctx, rectangle, fillColor, { text, fontSize, padding });
    }
    return fontSize + padding;
}

function setupLevelSelectButtons(areaGraph: AreaGraph, buttonHeight: number, buttonY: number) {
    if (areaGraph.chooseLevelButtons.length > 0 || areaGraph.pointLevelSets.length < 2) return;
    for (let i = 0; i < areaGraph.pointLevelSets.length; i++) {
        areaGraph.chooseLevelButtons.push({
            topLeft: { x: 0, y: buttonY },
            height: buttonHeight,
            width: 2,
        });
    }
}

function paintPoints(ctx: CanvasRenderingContext2D, paintRect: Rectangle, areaGraph: AreaGraph, pointSets: Position[][]) {
    if (pointSets.length < 2) return;
    ctx.strokeStyle = "black";
    const startValueX = pointSets[0][0].x;
    const diffX = pointSets[pointSets.length - 1][0].x - startValueX;
    const yOffsets: number[] = [];
    for (let i = 0; i < pointSets.length; i++) {
        yOffsets.push(0);
    }

    for (let i = 0; i < pointSets[0].length; i++) {
        ctx.beginPath();
        for (let j = 0; j < pointSets.length; j++) {
            const point = pointSets[j][i];
            if (!point) break;
            const paintX = paintRect.topLeft.x + graphValueToPaintOffset(paintRect.width, startValueX, diffX, point.x);
            yOffsets[j] += point.y;
            const areaPointY = yOffsets[j];
            const paintY = paintRect.topLeft.y + paintRect.height - graphValueToPaintOffset(paintRect.height, 0, areaGraph.currentMaxY, areaPointY);
            if (j === 0) {
                ctx.moveTo(paintX, paintY);
            } else {
                ctx.lineTo(paintX, paintY);
            }
        }
        ctx.stroke();
    }
}
