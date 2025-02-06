import { ChatSimState, Position } from "../chatSimModels.js";
import { getDay } from "../main.js";
import { UiButton, UiRectangle } from "../rectangle.js";
import { Rectangle } from "../rectangle.js";
import { lineChartAddPoint, paintLineChart } from "./lineChart.js";

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
    lineChartAddPoint({ x: lineChartDayXValue, y: lineChartHappinessYValue }, lineChart);
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
