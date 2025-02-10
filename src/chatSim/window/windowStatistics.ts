import { ChatSimState, Position } from "../chatSimModels.js";
import { UiButton, UiRectangle } from "../rectangle.js";
import { Rectangle } from "../rectangle.js";
import { createLineChart, LineChart, lineChartAddPoint, lineChartClickedInside } from "../graph/lineChart.js";
import { Graph, graphPaint } from "../graph/graph.js";
import { ColumnChart, ColumnChartBar, columnChartCreate, columnChartSetData, GRAPH_COLUMN_CHART } from "../graph/columnChart.js";
import { AreaGraph, areaGraphAddPointSet, areaGraphClickedInside, createAreaGraph, GRAPH_AREA_GRAPH } from "../graph/areaGraph.js";

export function createButtonWindowStatistics(): UiButton {
    return {
        clicked: clickedButton,
        paintIcon: paintIcon,
    }
}

const GRAPH_HAPPINESS = "Average Citizen Happiness";
const GRAPH_MONEY = "Current Money Distribution";
const GRAPH_AREA_MONEY = "Money Distribution Over Time";
const GRAPH_DEATH = "Death Reasons";

export function statisticsCreateGraphs(): Graph[] {
    const graphs: Graph[] = [];
    graphs.push(createLineChart(GRAPH_HAPPINESS, "Day", "Happiness", 5, 2, statisticsHappinessTick));
    graphs.push(columnChartCreate(GRAPH_MONEY, "Citizen Bracket", "Money", statisticsCurrentMoneyTick));
    graphs.push(createAreaGraph(GRAPH_AREA_MONEY, "Day", "Money", 5, 2, statisticsOverTimeMoneyTick));
    graphs.push(columnChartCreate(GRAPH_DEATH, "Death Reason", "Count", statisticsDeath));
    return graphs;
}

function clickedButton(state: ChatSimState) {
    const width = 500;
    const citizenUiRectangle: UiRectangle = {
        mainRect: {
            topLeft: { x: state.canvas!.width - width, y: 0 },
            height: 100,
            width: width,
        },
        tabs: [
            {
                name: "Data",
                paint: paintSimpleData,
            },
            {
                name: "Happiness",
                paint: (ctx, rect, state) => paintSelectedGraph(ctx, GRAPH_HAPPINESS, rect, state),
                click: lineChartClickedInside,
            },
            {
                name: "Money",
                paint: (ctx, rect, state) => paintSelectedGraph(ctx, GRAPH_MONEY, rect, state),
            },
            {
                name: "Money 2",
                paint: (ctx, rect, state) => paintSelectedGraph(ctx, GRAPH_AREA_MONEY, rect, state),
                click: areaGraphClickedInside,
            },
            {
                name: "Death",
                paint: (ctx, rect, state) => paintSelectedGraph(ctx, GRAPH_DEATH, rect, state),
            },
        ],
        data: state.statistics.graphs[0],
        heading: "Statistics:",
    }
    state.paintData.displaySelected = citizenUiRectangle;
}

function statisticsHappinessTick(graph: Graph, state: ChatSimState) {
    if (state.time % (state.tickInterval * 500) !== 0) return;
    const lineChart = graph as LineChart;
    if (!lineChart) return;
    const lineChartDayXValue = state.time / state.timPerDay + 1;
    let lineChartHappinessYValue = 0;
    for (let citizen of state.map.citizens) {
        lineChartHappinessYValue += citizen.happinessData.happiness / state.map.citizens.length;
    }
    lineChartAddPoint({ x: lineChartDayXValue, y: lineChartHappinessYValue }, lineChart);
}

function statisticsDeath(graph: Graph, state: ChatSimState) {
    const columnChart = graph as ColumnChart;
    const deadCitizens = state.deceasedCitizens;
    const bars: ColumnChartBar[] = [];
    for (let i = 0; i < deadCitizens.length; i++) {
        const citizen = deadCitizens[i];
        let bar = bars.find(b => b.label === citizen.isDead?.reason);
        if (!bar) {
            bar = { label: citizen.isDead!.reason, value: 0 };
            bars.push(bar);
        }
        bar.value++;
    }
    columnChartSetData(bars, columnChart);
}


function statisticsCurrentMoneyTick(graph: Graph, state: ChatSimState) {
    const columnChart = graph as ColumnChart;
    const sortedCitizensByMoney = state.map.citizens.toSorted((a, b) => a.money - b.money);
    const bracketsCount = Math.min(10, sortedCitizensByMoney.length);
    let currentIndex = 0;
    const indexsPerBracket = sortedCitizensByMoney.length / bracketsCount;
    const bars: ColumnChartBar[] = [];
    for (let i = 0; i < bracketsCount; i++) {
        let bracketMoney = 0;
        let counter = 0;
        for (let j = currentIndex; j < (i + 1) * indexsPerBracket; j++) {
            currentIndex++;
            counter++;
            bracketMoney += sortedCitizensByMoney[j].money;
        }
        bracketMoney /= counter;
        bars.push({ label: `${((i) * 100 / bracketsCount).toFixed()}%`, value: bracketMoney });
    }
    columnChartSetData(bars, columnChart);
}

function statisticsOverTimeMoneyTick(graph: Graph, state: ChatSimState) {
    if (state.time % (state.tickInterval * 500) !== 0) return;
    const columnChart = state.statistics.graphs.find(l => {
        if (l.type !== GRAPH_COLUMN_CHART) return false;
        const lineChart = l as ColumnChart;
        return lineChart.heading === GRAPH_MONEY;
    }) as ColumnChart;
    if (!columnChart) return;
    const sortedCitizensByMoney = state.map.citizens.toSorted((a, b) => a.money - b.money);
    const bracketsCount = Math.min(10, sortedCitizensByMoney.length);
    let currentIndex = 0;
    const indexsPerBracket = sortedCitizensByMoney.length / bracketsCount;
    const bars: ColumnChartBar[] = [];
    for (let i = 0; i < bracketsCount; i++) {
        let bracketMoney = 0;
        let counter = 0;
        for (let j = currentIndex; j < (i + 1) * indexsPerBracket; j++) {
            currentIndex++;
            counter++;
            bracketMoney += sortedCitizensByMoney[j].money;
        }
        bracketMoney /= counter;
        bars.push({ label: `${((i) * 100 / bracketsCount).toFixed()}%`, value: bracketMoney });
    }

    const perCentMoney: number[] = [];
    let totalMoney = 0;
    for (let bar of bars) {
        totalMoney += bar.value;
    }
    for (let bar of bars) {
        perCentMoney.push(bar.value / totalMoney);
    }

    const areaGraph = state.statistics.graphs.find(l => {
        if (l.type !== GRAPH_AREA_GRAPH) return false;
        const lineChart = l as ColumnChart;
        return lineChart.heading === GRAPH_AREA_MONEY;
    }) as AreaGraph;
    const areaGraphPointSet: Position[] = [];
    for (let entry of perCentMoney) {
        areaGraphPointSet.push({
            x: state.time / state.timPerDay + 1,
            y: entry,
        });
    }
    if (areaGraphPointSet.length === 0) {
        areaGraphPointSet.push({
            x: state.time / state.timPerDay + 1,
            y: 0,
        });
    }
    areaGraphAddPointSet(areaGraphPointSet, areaGraph);
}

function paintIcon(ctx: CanvasRenderingContext2D, rect: Rectangle) {
    ctx.font = "14px Arial";
    ctx.fillStyle = "black";
    const centerX = rect.topLeft.x + rect.width / 2;
    const text = "STATS";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, centerX - textWidth / 2, rect.topLeft.y + rect.height / 2 + 5);
}

function paintSelectedGraph(ctx: CanvasRenderingContext2D, graphHeading: string, rect: Rectangle, state: ChatSimState) {
    const padding = 10;
    const chartRect: Rectangle = { topLeft: { x: rect.topLeft.x + padding, y: rect.topLeft.y + padding }, width: 400, height: 300 };
    const graph = state.statistics.graphs.find(g => g.heading === graphHeading);
    if (!graph) return;
    graphPaint(ctx, graph, chartRect, state);
    rect.height = chartRect.height + padding * 2;
}

function paintSimpleData(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const fontSize = 20;
    ctx.font = `${fontSize}px Arial`;
    const padding = 10;
    let lineCounter = 0;
    ctx.fillText(`steal: ${state.statistics.stealCounter}`, rect.topLeft.x, rect.topLeft.y + fontSize + lineCounter++ * fontSize);
    ctx.fillText(`gifted food: ${state.statistics.giftedCounter}`, rect.topLeft.x, rect.topLeft.y + fontSize + lineCounter++ * fontSize);
    rect.height = lineCounter * fontSize + padding;
}
