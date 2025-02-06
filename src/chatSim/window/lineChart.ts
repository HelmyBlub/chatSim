import { Position } from "../chatSimModels.js";
import { Rectangle } from "../rectangle.js";

const POINT_LIMIT = 100;
export type LineChart = {
    name: string;
    points: Position[];
    points2: Position[];
    points2Counter: number,
    xLabel: string;
    yLabel: string;
    currentMaxY: number;
    currentMinY: number;
};

export function createLineChart(name: string, xLabel: string, yLabel: string): LineChart {
    return {
        name,
        points: [],
        points2: [],
        points2Counter: 0,
        xLabel,
        yLabel,
        currentMaxY: 0,
        currentMinY: 0,
    };

}

export function lineChartAddPoint(point: Position, lineChart: LineChart) {
    if (lineChart.points.length === 0) {
        lineChart.currentMaxY = point.y;
        lineChart.currentMinY = point.y;
    } else {
        if (lineChart.currentMaxY < point.y) lineChart.currentMaxY = point.y;
        if (lineChart.currentMinY > point.y) lineChart.currentMinY = point.y;
    }
    lineChart.points.push({ x: point.x, y: point.y });
    if (lineChart.points.length > POINT_LIMIT) {
        const oldPoint = lineChart.points.shift()!;
        if (lineChart.points2Counter === 0) {
            lineChart.points2.push({ x: oldPoint.x, y: oldPoint.y });
            if (lineChart.points2.length > POINT_LIMIT) {
                lineChart.points2.shift();
            }
        } else {
            const point2 = lineChart.points2[lineChart.points2.length - 1];
            point2.y += (oldPoint.y - point2.y) / (lineChart.points2Counter + 1);
        }
        lineChart.points2Counter = (lineChart.points2Counter + 1) % POINT_LIMIT;
    }
}

export function paintLineChart(ctx: CanvasRenderingContext2D, lineChart: LineChart, rect: Rectangle) {
    const padding = 20;
    const paintRectWithLabelingSpace: Rectangle = {
        topLeft: {
            x: rect.topLeft.x + padding,
            y: rect.topLeft.y + padding,
        },
        width: rect.width - padding * 2,
        height: rect.height - padding * 2,
    }
    const points = lineChart.points;
    paintXAxis(ctx, paintRectWithLabelingSpace, lineChart, points);
    paintYAxis(ctx, paintRectWithLabelingSpace, lineChart);
    paintPoints(ctx, paintRectWithLabelingSpace, lineChart, points);
}

function paintPoints(ctx: CanvasRenderingContext2D, paintRect: Rectangle, lineChart: LineChart, points: Position[]) {
    if (points.length < 2) return;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    for (let i = 0; i < points.length; i++) {
        const point = points[i];
        const paintX = pointXToPaintX(paintRect, points, point.x);
        const paintY = pointXToPaintY(paintRect, point.y);
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
    if (lineChart.points.length < 2) return;

    for (let i = 0; i <= 1; i += 0.2) {
        const x = paintRect.topLeft.x;
        const y = pointXToPaintY(paintRect, i);
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

function pointXToPaintY(paintRect: Rectangle, pointY: number): number {
    return paintRect.topLeft.y + paintRect.height - pointY * paintRect.height;
}

