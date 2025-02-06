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
    const lineChartDayXValue = state.time / state.timPerDay + 1;
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
    const padding = 10;
    let lineCounter = 0;
    ctx.fillText(`steal: ${state.statistics.stealCounter}`, rect.topLeft.x, rect.topLeft.y + fontSize + lineCounter++ * fontSize);
    ctx.fillText(`gifted food: ${state.statistics.giftedCounter}`, rect.topLeft.x, rect.topLeft.y + fontSize + lineCounter++ * fontSize);
    const chartRect: Rectangle = { topLeft: { x: rect.topLeft.x + padding, y: rect.topLeft.y + lineCounter * fontSize + padding }, width: 200, height: 200 };
    if (state.statistics.lineCharts.length > 0) paintLineChart(ctx, state.statistics.lineCharts[0], chartRect);

    rect.height = lineCounter * fontSize + chartRect.height + padding * 2;
}

function paintLineChart(ctx: CanvasRenderingContext2D, lineChart: LineChart, rect: Rectangle) {
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
    ctx.fillText(lineChart.xLabel, topLeft.x + width, topLeft.y + height + fontSize / 2);
    ctx.fillText(lineChart.yLabel, topLeft.x, topLeft.y + fontSize / 2);
    if (lineChart.points.length < 2) return;
    const offsetX = lineChart.points[0].x;
    const firstLastDifference = lineChart.points[lineChart.points.length - 1].x - offsetX;
    //axis x
    let stepSizeX = Math.pow(10, Math.floor(Math.log10(firstLastDifference)));
    let stepsX = firstLastDifference / stepSizeX;
    const toFixed = Math.max(0, - Math.log10(firstLastDifference) + 1);
    const startX = Math.ceil(offsetX / stepSizeX);
    for (let i = startX; i < startX + stepsX - 1; i++) {
        const x = topLeft.x + (i - offsetX / stepSizeX) / stepsX * width;
        const y = topLeft.y + height;
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 10);
        ctx.stroke();
        ctx.fillText((stepSizeX * i).toFixed(toFixed), x - 5, y + fontSize + 10);
    }
    //axis y
    let stepSizeY = Math.pow(10, Math.floor(Math.log10(firstLastDifference)));
    let stepsY = firstLastDifference / stepSizeX;

    //points
    ctx.beginPath();
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