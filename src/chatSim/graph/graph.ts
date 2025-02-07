import { Rectangle } from "../rectangle.js";
import { loadGraphAreaGraph } from "./areaGraph.js";
import { loadGraphColumnChart } from "./columnChart.js";
import { loadGraphLineChart } from "./lineChart.js";

export type Graph = {
    type: string;
    heading: string,
};

export type GraphFunctions = {
    paint(ctx: CanvasRenderingContext2D, graph: Graph, rect: Rectangle): void,
    click?(): void,
}

export type GraphsFunctions = { [key: string]: GraphFunctions };
export const GRAPHS_FUNCTIONS: GraphsFunctions = {};

export function onloadGraphsFunctions() {
    loadGraphLineChart();
    loadGraphColumnChart();
    loadGraphAreaGraph();
}

export function graphPaint(ctx: CanvasRenderingContext2D, graph: Graph, rect: Rectangle) {
    GRAPHS_FUNCTIONS[graph.type].paint(ctx, graph, rect);
}

export function graphPaintHeading(ctx: CanvasRenderingContext2D, graph: Graph, rect: Rectangle): number {
    const padding = 5;
    const fontSize = 20;
    ctx.font = `${fontSize}px Arial`;
    const text = graph.heading;
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, rect.topLeft.x + rect.width / 2 - textWidth / 2, rect.topLeft.y + fontSize);
    return fontSize + padding;
}

export function graphPaintXAxis(ctx: CanvasRenderingContext2D, paintRect: Rectangle, label: string, startValue: number, endValue: number) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.beginPath();
    const graphY = paintRect.topLeft.y + paintRect.height;
    ctx.moveTo(paintRect.topLeft.x, graphY);
    ctx.lineTo(paintRect.topLeft.x + paintRect.width, graphY);
    ctx.stroke();

    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(label, paintRect.topLeft.x + paintRect.width, graphY + fontSize / 2);
    if (endValue - startValue <= 0) return;

    const firstLastDifference = endValue - startValue;
    let stepSize = Math.pow(10, Math.floor(Math.log10(firstLastDifference)));
    const toFixed = Math.max(0, - Math.log10(firstLastDifference) + 1);
    const start = Math.ceil(startValue / stepSize) * stepSize;
    const axisMarkWidth = 10;
    for (let i = start; i <= endValue; i += stepSize) {
        const x = paintRect.topLeft.x + graphValueToPaintOffset(paintRect.width, startValue, firstLastDifference, i);
        ctx.beginPath();
        ctx.moveTo(x, graphY);
        ctx.lineTo(x, graphY + axisMarkWidth);
        ctx.stroke();
        const text = i.toFixed(toFixed);
        ctx.fillText(text, x - fontSize / 2, graphY + fontSize + axisMarkWidth);
    }
}

export function graphPaintYAxis(ctx: CanvasRenderingContext2D, paintRect: Rectangle, label: string, startValue: number, endValue: number) {
    ctx.strokeStyle = "black";
    ctx.fillStyle = "black";
    ctx.beginPath();
    ctx.moveTo(paintRect.topLeft.x, paintRect.topLeft.y);
    ctx.lineTo(paintRect.topLeft.x, paintRect.topLeft.y + paintRect.height);
    ctx.stroke();

    const fontSize = 14;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillText(label, paintRect.topLeft.x - Math.min(ctx.measureText(label).width / 2, 20), paintRect.topLeft.y - 5);
    if (endValue - startValue <= 0) return;

    const firstLastDifference = endValue - startValue;
    let stepSize = Math.pow(10, Math.floor(Math.log10(firstLastDifference)));
    const toFixed = Math.max(0, - Math.log10(firstLastDifference) + 1);
    const start = Math.ceil(startValue / stepSize) * stepSize;
    const axisMarkWidth = 10;
    for (let i = start; i <= endValue; i += stepSize) {
        const x = paintRect.topLeft.x;
        const y = paintRect.topLeft.y + paintRect.height - graphValueToPaintOffset(paintRect.height, startValue, firstLastDifference, i);
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x - axisMarkWidth, y);
        ctx.stroke();
        const text = i.toFixed(toFixed);
        const textWidht = ctx.measureText(text).width;
        ctx.fillText(text, x - textWidht - axisMarkWidth, y + fontSize / 2 - 1);
    }
}

export function graphValueToPaintOffset(paintSize: number, startValue: number, firstLastDifference: number, value: number): number {
    const pointDiffX = value - startValue;
    const factor = paintSize / firstLastDifference;
    return pointDiffX * factor;
}

