import { Rectangle } from "../rectangle.js";
import { Graph, graphPaintHeading, graphPaintYAxis, GRAPHS_FUNCTIONS } from "./graph.js";

export type ColumnChartBar = {
    label: string,
    value: number;
}

export type ColumnChart = Graph & {
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
        heading: name,
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
    yOffset += graphPaintHeading(ctx, columnChart, rect);
    const paintRectWithLabelingSpace: Rectangle = {
        topLeft: {
            x: rect.topLeft.x + padding,
            y: rect.topLeft.y + yOffset + padding + 5,
        },
        width: rect.width - padding * 2,
        height: rect.height - padding * 2 - yOffset,
    }
    paintXAxis(ctx, paintRectWithLabelingSpace, columnChart);
    graphPaintYAxis(ctx, paintRectWithLabelingSpace, columnChart.yLabel, 0, columnChart.maxY);
    paintBars(ctx, paintRectWithLabelingSpace, columnChart);
}

function paintBars(ctx: CanvasRenderingContext2D, paintRect: Rectangle, columnChart: ColumnChart) {
    const fontSize = 16;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    ctx.strokeStyle = "black";
    ctx.beginPath();
    const barWidth = paintRect.width / columnChart.bars.length / 2;
    const maxBarLabelWidth = barWidth * 1.2;
    let barX = paintRect.topLeft.x + barWidth / 2;
    for (let i = 0; i < columnChart.bars.length; i++) {
        const bar = columnChart.bars[i];
        const paintX = barX + barWidth * i * 2;
        const barHeight = paintRect.topLeft.y + paintRect.height - barValueToPaintY(paintRect, bar.value, columnChart.maxY);
        ctx.fillRect(paintX, paintRect.topLeft.y + paintRect.height, barWidth, -barHeight);

        let tempFontSize = fontSize;
        ctx.font = `${fontSize}px Arial`;
        let labelWidth = ctx.measureText(bar.label).width;
        if (labelWidth > maxBarLabelWidth) {
            tempFontSize = fontSize * maxBarLabelWidth / labelWidth;
            ctx.font = `${tempFontSize}px Arial`;
        }
        ctx.fillText(bar.label, paintX, paintRect.topLeft.y + paintRect.height + tempFontSize + 5);
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

function barValueToPaintY(paintRect: Rectangle, barValue: number, max: number): number {
    let paintY = paintRect.topLeft.y + paintRect.height;
    paintY -= barValue / max * paintRect.height;
    return paintY;
}

