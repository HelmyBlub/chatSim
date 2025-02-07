import { ChatSimState, Position } from "../chatSimModels.js";
import { Rectangle, rectangleClickedInside, rectanglePaint, UiRectangle } from "../rectangle.js";
import { Graph, GRAPHS_FUNCTIONS } from "./graph.js";

const POINT_LIMIT = 100;

export type LineChart = Graph & {
    name: string;
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
        name,
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
    yOffset += paintHeading(ctx, lineChart, rect);
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
    paintXAxis(ctx, paintRectWithLabelingSpace, lineChart, points);
    paintYAxis(ctx, paintRectWithLabelingSpace, lineChart);
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

function paintHeading(ctx: CanvasRenderingContext2D, lineChart: LineChart, rect: Rectangle): number {
    const padding = 5;
    const fontSize = 20;
    ctx.font = `${fontSize}px Arial`;
    const text = lineChart.name;
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, rect.topLeft.x + rect.width / 2 - textWidth / 2, rect.topLeft.y + fontSize);
    return fontSize + padding;
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

function paintXAxis(ctx: CanvasRenderingContext2D, paintRect: Rectangle, lineChart: LineChart, points: Position[]) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(paintRect.topLeft.x, paintRect.topLeft.y + paintRect.height);
    ctx.lineTo(paintRect.topLeft.x + paintRect.width, paintRect.topLeft.y + paintRect.height);
    ctx.stroke();

    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(lineChart.xLabel, paintRect.topLeft.x + paintRect.width, paintRect.topLeft.y + paintRect.height + fontSize / 2);
    if (points.length < 2) return;

    const firstPointX = points[0].x;
    const lastPointX = points[points.length - 1].x;
    const firstLastDifference = lastPointX - firstPointX;
    let stepSizeX = Math.pow(10, Math.floor(Math.log10(firstLastDifference)));
    const toFixed = Math.max(0, - Math.log10(firstLastDifference) + 1);
    const startX = Math.ceil(firstPointX / stepSizeX) * stepSizeX;
    for (let i = startX; i <= lastPointX; i += stepSizeX) {
        const x = pointXToPaintX(paintRect, points, i);
        const y = paintRect.topLeft.y + paintRect.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
        ctx.fillText(i.toFixed(toFixed), x - fontSize / 2, y + fontSize + 10);
    }
}

function paintYAxis(ctx: CanvasRenderingContext2D, paintRect: Rectangle, lineChart: LineChart) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(paintRect.topLeft.x, paintRect.topLeft.y);
    ctx.lineTo(paintRect.topLeft.x, paintRect.topLeft.y + paintRect.height);
    ctx.stroke();

    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    const text = lineChart.yLabel;
    const textWidth = ctx.measureText(text).width;
    const textOffsetX = Math.min(textWidth / 2, 20);
    ctx.fillText(lineChart.yLabel, paintRect.topLeft.x - textOffsetX, paintRect.topLeft.y - 5);
    //if (lineChart.points.length < 2) return;

    for (let i = 0; i <= 1; i += 0.2) {
        const x = paintRect.topLeft.x;
        const y = pointYToPaintY(paintRect, i);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10, y);
        ctx.stroke();
        const text = i.toFixed(1);
        const textWidht = ctx.measureText(text).width;
        ctx.fillText(i.toFixed(1), x - textWidht - 10, y + fontSize / 2 - 1);
    }
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

