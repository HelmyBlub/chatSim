import { ChatSimState, Position } from "../chatSimModels.js";
import { getDay } from "../main.js";
import { UiButton, UiRectangle } from "../rectangle.js";
import { Rectangle } from "../rectangle.js";

export type LineChart = {
    name: string,
    points: Position[],
    xLabel: string,
    yLabel: string,
    currentMaxY: number,
    currentMinY: number,
}

export function createButtonWindowStatistics(): UiButton {
    return {
        clicked: clickedButton,
        paintIcon: paintIcon,
    }
}

export function statisticsCreateHappinessLineChart(): LineChart {
    return { name: "Happiness", points: [], xLabel: "Day", yLabel: "Happiness", currentMaxY: 0, currentMinY: 0 };
}

export function statisticsHappinessTick(state: ChatSimState) {
    if (state.time % (state.tickInterval * 500) !== 0) return;
    const lineChart = state.statistics.lineCharts.find(l => l.name === "Happiness");
    if (!lineChart) return;
    const lineChartDayXValue = state.time / state.timPerDay;
    let lineChartHappinessYValue = 0;
    for (let citizen of state.map.citizens) {
        lineChartHappinessYValue += citizen.happinessData.happiness / state.map.citizens.length;
    }
    if (lineChart.points.length === 0) {
        lineChart.currentMaxY = lineChartHappinessYValue;
        lineChart.currentMinY = lineChartHappinessYValue;
    } else {
        if (lineChart.currentMaxY < lineChartHappinessYValue) lineChart.currentMaxY = lineChartHappinessYValue;
        if (lineChart.currentMinY > lineChartHappinessYValue) lineChart.currentMinY = lineChartHappinessYValue;
    }
    lineChart.points.push({ x: lineChartDayXValue, y: lineChartHappinessYValue });
    if (lineChart.points.length > 100) {
        lineChart.points.shift();
    }
}

function paintIcon(ctx: CanvasRenderingContext2D, rect: Rectangle) {
    ctx.font = "14px Arial";
    ctx.fillStyle = "black";
    const centerX = rect.topLeft.x + rect.width / 2;
    const text = "STATS";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, centerX - textWidth / 2, rect.topLeft.y + rect.height / 2 + 5);
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
                name: "Graph1",
                paint: paintCommands,
            },
        ],
        heading: "Statistics:",
    }
    state.paintData.displaySelected = citizenUiRectangle;
}


function paintCommands(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const fontSize = 20;
    ctx.font = `${fontSize}px Arial`;
    let lineCounter = 0;
    ctx.fillText(`steal: ${state.statistics.stealCounter}`, rect.topLeft.x, rect.topLeft.y + fontSize + lineCounter++ * fontSize);
    ctx.fillText(`gifted food: ${state.statistics.giftedCounter}`, rect.topLeft.x, rect.topLeft.y + fontSize + lineCounter++ * fontSize);
    if (state.statistics.lineCharts.length > 0) paintLineChart(ctx, state.statistics.lineCharts[0], rect.topLeft);

    rect.height = lineCounter * fontSize;
}

function paintLineChart(ctx: CanvasRenderingContext2D, lineChart: LineChart, topLeft: Position) {
    const height = 200;
    const width = 200;

    ctx.strokeStyle = "black";
    ctx.beginPath();
    ctx.moveTo(topLeft.x, topLeft.y);
    ctx.lineTo(topLeft.x, topLeft.y + height);
    ctx.lineTo(topLeft.x + width, topLeft.y + height);
    ctx.stroke();

    if (lineChart.points.length < 2) return;
    ctx.beginPath();
    const offsetX = lineChart.points[0].x;
    const firstLastDifference = lineChart.points[lineChart.points.length - 1].x - offsetX;
    for (let i = 0; i < lineChart.points.length; i++) {
        const point = lineChart.points[i];
        const paintX = topLeft.x + (point.x - offsetX) * (width / firstLastDifference);
        const paintY = topLeft.y + height - point.y * height;
        if (i === 0) {
            ctx.moveTo(paintX, paintY);
        } else {
            ctx.lineTo(paintX, paintY);
        }
    }
    ctx.stroke();
}