import { Position } from "../chatSimModels.js";
import { Rectangle } from "../rectangle.js";
import { Graph, GRAPHS_FUNCTIONS } from "./graph.js";

export type ColumnChartBar = {
    label: string,
    value: number;
}

export type ColumnChart = Graph & {
    name: string;
    bars: ColumnChartBar[],
    xLabel: string;
    yLabel: string;
    maxY: number;
};

export const GRAPH_COLUMN_CHART = "ColumnChart";

export function loadGraphColumnChart() {
    GRAPHS_FUNCTIONS[GRAPH_COLUMN_CHART] = {
        paint: paintColumnChart,
    }
}

export function columnChartCreate(name: string, xLabel: string, yLabel: string): ColumnChart {
    return {
        type: GRAPH_COLUMN_CHART,
        name,
        xLabel,
        yLabel,
        maxY: 0,
        bars: [],
    };
}

export function columnChartSetData(bars: ColumnChartBar[], columnChart: ColumnChart) {
    columnChart.bars = bars;
    columnChart.maxY = 0;
    for (let bar of bars) {
        if (bar.value > columnChart.maxY) columnChart.maxY = bar.value;
    }
}

function paintColumnChart(ctx: CanvasRenderingContext2D, columnChart: ColumnChart, rect: Rectangle) {
    const padding = 20;
    let yOffset = 0;
    yOffset += paintHeading(ctx, columnChart, rect);
    const paintRectWithLabelingSpace: Rectangle = {
        topLeft: {
            x: rect.topLeft.x + padding,
            y: rect.topLeft.y + yOffset + padding + 5,
        },
        width: rect.width - padding * 2,
        height: rect.height - padding * 2 - yOffset,
    }
    paintXAxis(ctx, paintRectWithLabelingSpace, columnChart);
    paintYAxis(ctx, paintRectWithLabelingSpace, columnChart);
    paintBars(ctx, paintRectWithLabelingSpace, columnChart);
}

function paintHeading(ctx: CanvasRenderingContext2D, columnChart: ColumnChart, rect: Rectangle): number {
    const padding = 5;
    const fontSize = 20;
    ctx.font = `${fontSize}px Arial`;
    const text = columnChart.name;
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, rect.topLeft.x + rect.width / 2 - textWidth / 2, rect.topLeft.y + fontSize);
    return fontSize + padding;
}

function paintBars(ctx: CanvasRenderingContext2D, paintRect: Rectangle, columnChart: ColumnChart) {
    const fontSize = 16;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    ctx.strokeStyle = "black";
    ctx.beginPath();
    const barWidth = paintRect.width / columnChart.bars.length / 2;
    let barX = paintRect.topLeft.x + barWidth / 2;
    for (let i = 0; i < columnChart.bars.length; i++) {
        const bar = columnChart.bars[i];
        const paintX = barX + barWidth * i * 2;
        const barHeight = paintRect.topLeft.y + paintRect.height - barValueToPaintY(paintRect, bar.value, columnChart.maxY);
        ctx.fillRect(paintX, paintRect.topLeft.y + paintRect.height, barWidth, -barHeight);
        ctx.fillText(bar.label, paintX, paintRect.topLeft.y + paintRect.height + fontSize + 5);
    }
    ctx.stroke();
}

function paintXAxis(ctx: CanvasRenderingContext2D, paintRect: Rectangle, columnChart: ColumnChart) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(paintRect.topLeft.x, paintRect.topLeft.y + paintRect.height);
    ctx.lineTo(paintRect.topLeft.x + paintRect.width, paintRect.topLeft.y + paintRect.height);
    ctx.stroke();

    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(columnChart.xLabel, paintRect.topLeft.x + paintRect.width, paintRect.topLeft.y + paintRect.height + fontSize / 2);
}

function paintYAxis(ctx: CanvasRenderingContext2D, paintRect: Rectangle, columnChart: ColumnChart) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(paintRect.topLeft.x, paintRect.topLeft.y);
    ctx.lineTo(paintRect.topLeft.x, paintRect.topLeft.y + paintRect.height);
    ctx.stroke();

    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    const text = columnChart.yLabel;
    const textWidth = ctx.measureText(text).width;
    const textOffsetX = Math.min(textWidth / 2, 20);
    ctx.fillText(columnChart.yLabel, paintRect.topLeft.x - textOffsetX, paintRect.topLeft.y - 5);

    if (columnChart.maxY <= 0) return;
    for (let i = 0; i <= columnChart.maxY; i += columnChart.maxY / 5) {
        const x = paintRect.topLeft.x;
        const y = barValueToPaintY(paintRect, i, columnChart.maxY);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - 10, y);
        ctx.stroke();
        const text = i.toFixed();
        const textWidht = ctx.measureText(text).width;
        ctx.fillText(text, x - textWidht - 10, y + fontSize / 2 - 1);
    }
}


function barValueToPaintY(paintRect: Rectangle, barValue: number, max: number): number {
    let paintY = paintRect.topLeft.y + paintRect.height;
    paintY -= barValue / max * paintRect.height;
    return paintY;
}

