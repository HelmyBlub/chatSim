import { Position } from "../chatSimModels.js";
import { Rectangle } from "../rectangle.js";
import { LineChart } from "./windowStatistics.js";

export function lineChartAddPoint(point: Position, lineChart: LineChart) {
    if (lineChart.points.length === 0) {
        lineChart.currentMaxY = point.y;
        lineChart.currentMinY = point.y;
    } else {
        if (lineChart.currentMaxY < point.y) lineChart.currentMaxY = point.y;
        if (lineChart.currentMinY > point.y) lineChart.currentMinY = point.y;
    }
    lineChart.points.push({ x: point.x, y: point.y });
    if (lineChart.points.length > 100) {
        lineChart.points.shift();
    }

}

export function paintLineChart(ctx: CanvasRenderingContext2D, lineChart: LineChart, rect: Rectangle) {
    const height = rect.height;
    const width = rect.width;
    const topLeft = rect.topLeft;
    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topLeft.x, topLeft.y + height);
    ctx.lineTo(topLeft.x + width, topLeft.y + height);
    ctx.stroke();
    //axis labels
    ctx.fillStyle = "black";
    paintXAxisLabels(ctx, rect, lineChart);
    paintYAxisLabels(ctx, rect, lineChart);

    //points
    if (lineChart.points.length < 2) return;
    ctx.beginPath();
    for (let i = 0; i < lineChart.points.length; i++) {
        const point = lineChart.points[i];
        const paintX = pointXToPaintX(rect, lineChart, point.x);
        const paintY = pointXToPaintY(rect, lineChart, point.y);
        if (i === 0) {
            ctx.moveTo(paintX, paintY);
        } else {
            ctx.lineTo(paintX, paintY);
        }
    }
    ctx.stroke();
}

function paintXAxisLabels(ctx: CanvasRenderingContext2D, paintRect: Rectangle, lineChart: LineChart) {
    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.fillText(lineChart.xLabel, paintRect.topLeft.x + paintRect.width, paintRect.topLeft.y + paintRect.height + fontSize / 2);
    if (lineChart.points.length < 2) return;

    const firstPointX = lineChart.points[0].x;
    const lastPointX = lineChart.points[lineChart.points.length - 1].x;
    const firstLastDifference = lastPointX - firstPointX;
    let stepSizeX = Math.pow(10, Math.floor(Math.log10(firstLastDifference)));
    const toFixed = Math.max(0, - Math.log10(firstLastDifference) + 1);
    const startX = Math.ceil(firstPointX / stepSizeX) * stepSizeX;
    for (let i = startX; i <= lastPointX; i += stepSizeX) {
        const x = pointXToPaintX(paintRect, lineChart, i);
        const y = paintRect.topLeft.y + paintRect.height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
        ctx.fillText(i.toFixed(toFixed), x - 5, y + fontSize + 10);
    }
}

function paintYAxisLabels(ctx: CanvasRenderingContext2D, paintRect: Rectangle, lineChart: LineChart) {
    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.fillText(lineChart.yLabel, paintRect.topLeft.x, paintRect.topLeft.y + fontSize / 2);
    if (lineChart.points.length < 2) return;

    for (let i = 0; i <= 1; i += 0.2) {
        const x = paintRect.topLeft.x;
        const y = pointXToPaintY(paintRect, lineChart, i);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10, y);
        ctx.stroke();
        const text = i.toFixed(1);
        const textWidht = ctx.measureText(text).width;
        ctx.fillText(i.toFixed(1), x - textWidht - 10, y + fontSize / 2 - 1);
    }
}


function pointXToPaintX(paintRect: Rectangle, lineChart: LineChart, pointX: number): number {
    const firstPointX = lineChart.points[0].x;
    const firstLastDifference = lineChart.points[lineChart.points.length - 1].x - firstPointX;
    const pointDiffX = pointX - firstPointX;
    const factor = paintRect.width / firstLastDifference;
    let paintX = paintRect.topLeft.x;
    paintX += pointDiffX * factor;
    return paintX;
}

function pointXToPaintY(paintRect: Rectangle, lineChart: LineChart, pointY: number): number {
    return paintRect.topLeft.y + paintRect.height - pointY * paintRect.height;
}
