import { ChatSimState, Position } from "../chatSimModels.js";
import { Rectangle, rectangleClickedInside, rectanglePaint, UiRectangle } from "../rectangle.js";
import { Graph, graphPaintHeading, graphPaintXAxis, graphPaintYAxis, GRAPHS_FUNCTIONS } from "./graph.js";

const POINT_LIMIT = 100;

export type LineChart = Graph & {
    pointSetIndex: number,
    pointSets: {
        label?: string,
        points: Position[];
        pointsAveragedCounter?: number,
    }[],
    chooseLevelButtons: Rectangle[],
    buttonsLabelPrefix: number,
    xLabel: string;
    yLabel: string;
    currentMaxY: number;
    currentMinY: number;
};

export const GRAPH_LINE_CHART = "LineChart";

export function loadGraphLineChart() {
    GRAPHS_FUNCTIONS[GRAPH_LINE_CHART] = {
        paint: paintLineChart,
    }
}

export function createLineChart(name: string, xLabel: string, yLabel: string, buttonsLabelPrefix: number, levels: number = 2): LineChart {
    const pointSets = [];
    for (let i = 0; i < levels; i++) {
        pointSets.push({ points: [], pointsAveragedCounter: i === 0 ? undefined : 0 });
    }
    return {
        type: GRAPH_LINE_CHART,
        heading: name,
        pointSetIndex: 0,
        pointSets: pointSets,
        xLabel,
        yLabel,
        currentMaxY: 0,
        currentMinY: 0,
        chooseLevelButtons: [],
        buttonsLabelPrefix: buttonsLabelPrefix
    };

}

export function lineChartAddPoint(point: Position, lineChart: LineChart) {
    let currentPointSetIndex = 0;
    let currentPointSet = lineChart.pointSets[currentPointSetIndex];
    if (currentPointSet.points.length === 0) {
        lineChart.currentMaxY = point.y;
        lineChart.currentMinY = point.y;
    } else {
        if (lineChart.currentMaxY < point.y) lineChart.currentMaxY = point.y;
        if (lineChart.currentMinY > point.y) lineChart.currentMinY = point.y;
    }
    currentPointSet.points.push({ x: point.x, y: point.y });
    do {
        if (currentPointSet.points.length > POINT_LIMIT) {
            const oldPoint = currentPointSet.points.shift()!;
            const nextPointsSet = lineChart.pointSets[currentPointSetIndex + 1];
            if (nextPointsSet === undefined) break;
            if (nextPointsSet.pointsAveragedCounter === 0) {
                nextPointsSet.points.push({ x: oldPoint.x, y: oldPoint.y });
            } else {
                const point2 = nextPointsSet.points[nextPointsSet.points.length - 1];
                point2.y += (oldPoint.y - point2.y) / (nextPointsSet.pointsAveragedCounter! + 1);
            }
            nextPointsSet.pointsAveragedCounter = (nextPointsSet.pointsAveragedCounter! + 1) % POINT_LIMIT;
            currentPointSet = nextPointsSet;
        } else {
            break;
        }
    } while (currentPointSet !== undefined);
}

function paintLineChart(ctx: CanvasRenderingContext2D, lineChart: LineChart, rect: Rectangle) {
    const padding = 20;
    let yOffset = rect.topLeft.y;
    yOffset += graphPaintHeading(ctx, lineChart, rect);
    yOffset += paintSelectButtons(ctx, lineChart, rect, yOffset);
    const buttonHeight = lineChart.chooseLevelButtons.length > 1 ? lineChart.chooseLevelButtons[0].height : 0;

    const paintRectWithLabelingSpace: Rectangle = {
        topLeft: {
            x: rect.topLeft.x + padding,
            y: yOffset + padding + 5,
        },
        width: rect.width - padding * 2,
        height: rect.height - buttonHeight - padding * 3,
    }
    const points = lineChart.pointSets[lineChart.pointSetIndex].points;
    let firstPointX = 0;
    let lastPointX = 0;
    if (points.length >= 2) {
        firstPointX = points[0].x;
        lastPointX = points[points.length - 1].x;
    }
    graphPaintXAxis(ctx, paintRectWithLabelingSpace, lineChart.xLabel, firstPointX, lastPointX);
    graphPaintYAxis(ctx, paintRectWithLabelingSpace, lineChart.yLabel, 0, 1);
    paintPoints(ctx, paintRectWithLabelingSpace, lineChart, points);
}

export function lineChartClickedInside(relativeMouseToCanvas: Position, rect: Rectangle, state: ChatSimState) {
    const uiRect = state.paintData.displaySelected as UiRectangle;
    if (!uiRect) return;
    const lineChart = uiRect.data as LineChart;

    for (let i = 0; i < lineChart.chooseLevelButtons.length; i++) {
        if (rectangleClickedInside(relativeMouseToCanvas, lineChart.chooseLevelButtons[i])) {
            lineChart.pointSetIndex = i;
            break;
        }
    }
}

function paintSelectButtons(ctx: CanvasRenderingContext2D, lineChart: LineChart, rect: Rectangle, offsetY: number): number {
    if (lineChart.pointSets.length < 2) return 0;
    const padding = 5;
    const fontSize = 16;
    setupLevelSelectButtons(lineChart, fontSize + padding * 2, offsetY);
    ctx.font = `${fontSize}px Arial`;
    let offsetX = rect.topLeft.x + padding;
    for (let i = 0; i < lineChart.pointSets.length; i++) {
        const fillColor = i === lineChart.pointSetIndex ? "lightblue" : undefined;
        const rectangle = lineChart.chooseLevelButtons[i];
        const text = lineChart.buttonsLabelPrefix * Math.pow(POINT_LIMIT, i) + " " + lineChart.xLabel + "s";
        rectangle.topLeft.x = offsetX;
        rectangle.width = ctx.measureText(text).width + padding * 2;
        offsetX += rectangle.width + padding;
        rectanglePaint(ctx, rectangle, fillColor, { text, fontSize, padding });
    }
    return fontSize + padding;
}

function setupLevelSelectButtons(lineChart: LineChart, buttonHeight: number, buttonY: number) {
    if (lineChart.chooseLevelButtons.length > 0 || lineChart.pointSets.length < 2) return;
    for (let i = 0; i < lineChart.pointSets.length; i++) {
        lineChart.chooseLevelButtons.push({
            topLeft: { x: 0, y: buttonY },
            height: buttonHeight,
            width: 2,
        });
    }
}

function paintPoints(ctx: CanvasRenderingContext2D, paintRect: Rectangle, lineChart: LineChart, points: Position[]) {
    if (points.length < 2) return;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const paintX = pointXToPaintX(paintRect, points, point.x);
        const paintY = pointYToPaintY(paintRect, point.y);
        if (i === 0) {
            ctx.moveTo(paintX, paintY);
        } else {
            ctx.lineTo(paintX, paintY);
        }
    }
    ctx.stroke();
}

function pointXToPaintX(paintRect: Rectangle, points: Position[], pointX: number): number {
    const firstPointX = points[0].x;
    const firstLastDifference = points[points.length - 1].x - firstPointX;
    const pointDiffX = pointX - firstPointX;
    const factor = paintRect.width / firstLastDifference;
    let paintX = paintRect.topLeft.x;
    paintX += pointDiffX * factor;
    return paintX;
}

function pointYToPaintY(paintRect: Rectangle, pointY: number): number {
    return paintRect.topLeft.y + paintRect.height - pointY * paintRect.height;
}

