import { ChatSimState } from "../chatSimModels.js";
import { Rectangle } from "../rectangle.js";
import { loadGraphColumnChart } from "./columnChart.js";
import { loadGraphLineChart } from "./lineChart.js";

export type Graph = {
    type: string;
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
}

export function graphPaint(ctx: CanvasRenderingContext2D, graph: Graph, rect: Rectangle) {
    GRAPHS_FUNCTIONS[graph.type].paint(ctx, graph, rect);
}
