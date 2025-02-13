import { ChatSimState, Position } from "../chatSimModels.js";
import { Citizen } from "./citizen.js";
import { getTimeAndDayString } from "../main.js";
import { UiRectangle, Rectangle } from "../rectangle.js";

export function citizenCreateSelectionData(state: ChatSimState): UiRectangle {
    const width = 500;
    const citizenName = (state.inputData.selected?.object as Citizen).name;
    const citizenUiRectangle: UiRectangle = {
        mainRect: {
            topLeft: { x: state.canvas!.width - width, y: 0 },
            height: 100,
            width: width,
        },
        tabs: [
            {
                name: "Generell",
                paint: paintCitizenSelectionDataGenerell,
            },
            {
                name: "Data",
                paint: paintCitizenSelectionData,
            },
            {
                name: "State",
                paint: paintCitizenSelectionDataState,
            },
            {
                name: "Inventory",
                paint: paintCitizenSelectionDataInventory,
            },
            {
                name: "Action Log",
                paint: paintCitizenSelectionDataLog,
            }
        ],
        heading: `Citizen ${citizenName}:`,
    }
    return citizenUiRectangle;
}

function paintCitizenSelectionDataGenerell(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const citizen: Citizen = state.inputData.selected?.object as Citizen;
    if (!citizen) return;
    const padding = 5;
    const fontSize = 18;
    let offsetX = rect.topLeft.x + padding;
    let offsetY = rect.topLeft.y + padding;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;

    paintBar(ctx, { x: offsetX, y: offsetY + lineSpacing * lineCounter++ }, citizen.foodPerCent, "Food: ", fontSize, 200);
    paintBar(ctx, { x: offsetX, y: offsetY + lineSpacing * lineCounter++ }, citizen.energyPerCent, "Energy: ", fontSize, 200);
    paintBar(ctx, { x: offsetX, y: offsetY + lineSpacing * lineCounter++ }, citizen.happinessData.happiness, "Happiness: ", fontSize, 200, true);
    paintBar(ctx, { x: offsetX, y: offsetY + lineSpacing * lineCounter++ }, citizen.happinessData.socialBattery, "Social Battery: ", fontSize, 200);
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    ctx.fillText(`Money: $${(citizen.money).toFixed()}`, offsetX, offsetY + fontSize + lineSpacing * lineCounter++);
    ctx.fillText(`Fatness: ${(citizen.fatness).toFixed(2)}`, offsetX, offsetY + fontSize + lineSpacing * lineCounter++);
    rect.height = lineSpacing * lineCounter + padding * 2;
}

function paintBar(ctx: CanvasRenderingContext2D, topLeft: Position, fillAmount: number, label: string, fontSize: number, barWidth: number, canBeNegative: boolean = false) {
    const labelWidth = ctx.measureText(label).width;
    ctx.strokeStyle = "black";
    ctx.font = `${fontSize}px Arial`;
    if (canBeNegative) {
        const barCenter = topLeft.x + labelWidth + barWidth / 2;
        if (fillAmount >= 0) {
            ctx.fillStyle = "green";
        } else {
            ctx.fillStyle = "darkRed";
        }
        ctx.fillRect(barCenter, topLeft.y, (barWidth / 2) * fillAmount, fontSize);
    } else {
        ctx.fillStyle = "green";
        ctx.fillRect(topLeft.x + labelWidth, topLeft.y, barWidth * fillAmount, fontSize);
    }
    ctx.beginPath();
    ctx.fillStyle = "black";
    ctx.rect(topLeft.x + labelWidth, topLeft.y, barWidth, fontSize);
    ctx.stroke();
    ctx.fillText(`${label}`, topLeft.x, topLeft.y + fontSize - 1);
}

function paintCitizenSelectionDataLog(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const citizen: Citizen = state.inputData.selected?.object as Citizen;
    if (!citizen) return;
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetX = rect.topLeft.x;
    let offsetY = rect.topLeft.y + fontSize;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;
    if (citizen.log.length > 0) {
        for (let i = 0; i < Math.min(30, citizen.log.length); i++) {
            const logEntry = citizen.log[i];
            const time = getTimeAndDayString(logEntry.time, state);
            ctx.fillText(`${time}, ${logEntry.message}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
    }
    rect.height = lineSpacing * lineCounter;
}

function paintCitizenSelectionDataInventory(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const citizen: Citizen = state.inputData.selected?.object as Citizen;
    if (!citizen) return;
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetX = rect.topLeft.x;
    let offsetY = rect.topLeft.y + fontSize;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;

    ctx.fillText(`    Inventory:`, offsetX, offsetY + lineSpacing * lineCounter++);
    for (let item of citizen.inventory.items) {
        ctx.fillText(`        ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
    }
    if (citizen.home) {
        ctx.fillText(`    Home Inventory:`, offsetX, offsetY + lineSpacing * lineCounter++);
        for (let item of citizen.home.inventory.items) {
            ctx.fillText(`        ${item.name}: ${item.counter}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
    }
    rect.height = lineSpacing * lineCounter;
}

function paintCitizenSelectionDataState(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const citizen: Citizen = state.inputData.selected?.object as Citizen;
    if (!citizen) return;
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetX = rect.topLeft.x;
    let offsetY = rect.topLeft.y + fontSize;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;
    ctx.fillText(`    State: ${citizen.stateInfo.type}`, offsetX, offsetY + lineSpacing * lineCounter++);
    if (citizen.stateInfo.tags.size > 0) {
        let tagsString = "";
        citizen.stateInfo.tags.forEach(t => tagsString += t + ",");
        ctx.fillText(`       Tags: ${tagsString}`, offsetX, offsetY + lineSpacing * lineCounter++);
    }
    if (citizen.stateInfo.stack.length > 0) {
        const citizenState = citizen.stateInfo.stack[0];
        ctx.fillText(`        ${citizenState.state}`, offsetX, offsetY + lineSpacing * lineCounter++);
        if (citizenState.subState) ctx.fillText(`            ${citizenState.subState}`, offsetX, offsetY + lineSpacing * lineCounter++);
        if (citizenState.tags) {
            let tagsString = "";
            citizenState.tags.forEach(t => tagsString += t + ",");
            ctx.fillText(`       Tags: ${tagsString}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
    }
    if (citizen.memory.todosData.todos.length > 0) {
        ctx.fillText(`    Memory Todos:`, offsetX, offsetY + lineSpacing * lineCounter++);
        for (let todo of citizen.memory.todosData.todos) {
            ctx.fillText(`        ${todo.stateType}: ${todo.reasonThought}`, offsetX, offsetY + lineSpacing * lineCounter++);
        }
    }
    rect.height = lineSpacing * lineCounter;
}


function paintCitizenSelectionData(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const citizen: Citizen = state.inputData.selected?.object as Citizen;
    if (!citizen) return;
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    let offsetX = rect.topLeft.x;
    let offsetY = rect.topLeft.y + fontSize;
    const lineSpacing = fontSize + 5;
    let lineCounter = 0;
    if (citizen.isDead) {
        ctx.fillText(`    Death Reason: ${citizen.isDead.reason}`, offsetX, offsetY + lineSpacing * lineCounter++);
    }
    if (citizen.dreamJob) {
        ctx.fillText(`    Dream Job: ${citizen.dreamJob}`, offsetX, offsetY + lineSpacing * lineCounter++);
    }
    ctx.fillText(`    Job: ${citizen.job.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
    ctx.fillText(`    ${citizen.happinessData.isExtrovert ? "Extrovert" : "Introvert"}(${citizen.happinessData.socialBatteryFactor.toFixed(2)})`, offsetX, offsetY + lineSpacing * lineCounter++);
    if (citizen.traitsData.traits.length > 0) {
        let traitsText = `    Traits:`;
        for (let trait of citizen.traitsData.traits) {
            traitsText += ` ${trait},`;
        }
        ctx.fillText(traitsText, offsetX, offsetY + lineSpacing * lineCounter++);
    }
    if (citizen.happinessData.happinessTagFactors.size > 0) {
        let happinessText = `    HappinessTags:`;
        for (let tag of citizen.happinessData.happinessTagFactors) {
            happinessText += ` ${tag[0]}(${tag[1].toFixed(1)}),`;
        }
        ctx.fillText(happinessText, offsetX, offsetY + lineSpacing * lineCounter++);
    }
    if (citizen.happinessData.unhappinessTagFactors.size > 0) {
        let happinessText = `    unhappinessTags:`;
        for (let tag of citizen.happinessData.unhappinessTagFactors) {
            happinessText += ` ${tag[0]}(${tag[1].toFixed(1)}),`;
        }
        ctx.fillText(happinessText, offsetX, offsetY + lineSpacing * lineCounter++);
    }
    ctx.fillText(`steal: ${citizen.stats.stealCounter}`, offsetX, offsetY + lineSpacing * lineCounter++)
    ctx.fillText(`gifted Food: ${citizen.stats.giftedFoodCounter}`, offsetX, offsetY + lineSpacing * lineCounter++)
    rect.height = lineSpacing * lineCounter;
}
