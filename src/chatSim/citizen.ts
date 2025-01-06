import { drawTextWithOutline, IMAGE_PATH_CITIZEN, IMAGE_PATH_CITIZEN_DEAD, IMAGE_PATH_CITIZEN_EAT, IMAGE_PATH_CITIZEN_SLEEPING, IMAGE_PATH_MUSHROOM } from "../drawHelper.js";
import { Chat, paintChatBubbles } from "./chatBubble.js";
import { ChatSimState, Position, Mushroom, TAG_DOING_NOTHING, TAG_WALKING_AROUND, TAG_OUTSIDE, TAG_AT_HOME } from "./chatSimModels.js";
import { PaintDataMap } from "./map.js";
import { Building } from "./building.js";
import { checkCitizenNeeds } from "./citizenNeeds/citizenNeed.js";
import { CITIZEN_NEED_SLEEP, CITIZEN_NEED_STATE_SLEEPING, citizenNeedTickSleep } from "./citizenNeeds/citizenNeedSleep.js";
import { IMAGES } from "./images.js";
import { inventoryGetUsedCapacity, Inventory, paintInventoryMoney, InventoryItem, paintInventoryItem } from "./inventory.js";
import { CITIZEN_STATE_TYPE_CHANGE_JOB, citizenChangeJob, CitizenJob, createJob, tickCitizenJob } from "./jobs/job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobs/jobFoodGatherer.js";
import { calculateDirection, nextRandom } from "./main.js";
import { INVENTORY_MUSHROOM, INVENTORY_WOOD } from "./inventory.js";
import { mapPositionToPaintPosition, PAINT_LAYER_CITIZEN_AFTER_HOUSES, PAINT_LAYER_CITIZEN_BEFORE_HOUSES } from "./paint.js";
import { CitizenEquipmentData, paintCitizenEquipments } from "./paintCitizenEquipment.js";
import { Tree } from "./tree.js";
import { CITIZEN_STATE_EAT } from "./citizenState/citizenStateEat.js";
import { CitizenTraits } from "./traits/trait.js";
import { CITIZEN_NEED_FOOD, citizenNeedTickFood } from "./citizenNeeds/citizenNeedFood.js";
import { CITIZEN_NEED_HOME, citizenNeedTickHome } from "./citizenNeeds/citizenNeedHome.js";
import { CITIZEN_NEED_STARVING, citizenNeedTickStarving } from "./citizenNeeds/citizenNeedStarving.js";
import { CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS } from "./tick.js";
import { CITIZEN_NEED_HAPPINESS, citizenNeedTickHappiness } from "./citizenNeeds/citizenNeedHappiness.js";

export type CitizenStateInfo = {
    type: string,
    stack: CitizenState[],
    previousTaskFailed?: boolean,
    actionStartTime?: number,
    thoughts?: string[],
    tags: Set<string>,
}

export type CitizenState = {
    state: string,
    data?: any,
    returnedData?: CitizenStateSuccessData,
    subState?: string,
    subStateStartTime?: number,
    tags?: string[],
}

export type CitizenStateSuccessData = {
    type: string,
}

export type CitizenNeeds = {
    needsData: { [key: string]: any };
    lastFailingNeed?: string,
    nextCompleteNeedCheckStartTime?: number,
}

export type CitizenTodos = {
    todos: CitizenTodo[],
    maxLength: number,
}

export type CitizenTodo = {
    priority: number,
    stateType: string,
    reasonThought: string,
}

export type CitizenHappiness = {
    happiness: number,
    happinessTags: string[],
    unhappinessTags: string[],
}

export type Citizen = {
    job: CitizenJob,
    happinessData: CitizenHappiness,
    tradePaw?: {
        item?: InventoryItem,
        moveFrom: Position,
        moveTo: Position,
        startTime: number,
        duration: number,
        money: number,
    }
    isDead?: {
        reason: string,
        time: number,
    },
    memory: {
        todosData: CitizenTodos,
    },
    dreamJob?: string,
    traitsData: CitizenTraits,
    goToBedTime: number;
    sleepDuration: number;
    birthTime: number,
    name: string,
    stateInfo: CitizenStateInfo,
    speed: number,
    position: Position,
    moveTo?: Position,
    foodPerCent: number,
    energyPerCent: number,
    inventory: Inventory,
    home?: Building,
    money: number,
    skills: { [key: string]: number },
    needs: CitizenNeeds,
    log: LogEntry[];
    lastChat?: Chat,
    maxLogLength: number,
    displayedEquipments: CitizenEquipmentData[],
    paintBehindBuildings?: boolean,
}

export type LogEntry = {
    time: number,
    message: string,
}

const CITIZEN_STATE_TYPE_TICK_FUNCTIONS: { [key: string]: (citizen: Citizen, state: ChatSimState) => void } = {
};

export const CITIZEN_STATE_TYPE_WORKING_JOB = "workingJob";
export const CITIZEN_STATE_THINKING = "thinking";
export const CITIZEN_TIME_PER_THOUGHT_LINE = 2000;
const CITIZEN_PAINT_SIZE = 40;

export function loadCitizenStateTypeFunctions() {
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_STATE_TYPE_WORKING_JOB] = tickCitizenJob;
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_SLEEP] = citizenNeedTickSleep;
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_FOOD] = citizenNeedTickFood;
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_HOME] = citizenNeedTickHome;
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_STARVING] = citizenNeedTickStarving;
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_NEED_HAPPINESS] = citizenNeedTickHappiness;
    CITIZEN_STATE_TYPE_TICK_FUNCTIONS[CITIZEN_STATE_TYPE_CHANGE_JOB] = tickCitizenTypeChangeJob;
}

export function citizenMoveTo(citizen: Citizen, moveTo: Position) {
    citizen.moveTo = {
        x: moveTo.x,
        y: moveTo.y,
    };
    citizen.stateInfo.tags.add(TAG_WALKING_AROUND);
}

export function citizenStopMoving(citizen: Citizen) {
    citizen.moveTo = undefined;
    citizen.stateInfo.tags.delete(TAG_WALKING_AROUND);
}

export function addCitizen(user: string, state: ChatSimState): Citizen | undefined {
    if (state.map.citizens.find(c => c.name === user)) return;
    const citizen = citizenCreateDefault(user, state);
    state.map.citizens.push(citizen);
    return citizen;
}

export function citizenCreateDefault(citizenName: string, state: ChatSimState): Citizen {
    const citizen: Citizen = {
        name: citizenName,
        goToBedTime: (0.9 * (nextRandom(state.randomSeed) * 0.4 - 0.2 + 1)) % 1,
        sleepDuration: 0.36 * (nextRandom(state.randomSeed) * 0.4 - 0.2 + 1),
        traitsData: {
            traits: [],
            maxTraits: 5,
        },
        happinessData: {
            happiness: 0,
            happinessTags: [],
            unhappinessTags: [],
        },
        birthTime: state.time,
        speed: 2,
        foodPerCent: 1,
        energyPerCent: 1,
        position: { x: 0, y: 0 },
        displayedEquipments: [],
        stateInfo: {
            type: CITIZEN_STATE_TYPE_WORKING_JOB,
            stack: [],
            tags: new Set<string>(),
        },
        needs: {
            needsData: {},
        },
        memory: {
            todosData: {
                maxLength: 4,
                todos: [],
            },
        },
        inventory: {
            items: [],
            reservedSpace: [
                {
                    counter: 5,
                    name: INVENTORY_MUSHROOM
                },
                {
                    counter: 2,
                    name: INVENTORY_WOOD
                },
            ],
            size: 10,
        },
        money: 10,
        skills: {},
        job: createJob(CITIZEN_JOB_FOOD_GATHERER, state)!,
        log: [],
        maxLogLength: 100,
    };
    setUpHappinessTags(citizen, state);
    const jobs = Object.keys(state.functionsCitizenJobs);
    citizen.dreamJob = jobs[Math.floor(nextRandom(state.randomSeed) * jobs.length)];
    return citizen;
}

export function citizenRemoveTodo(citizen: Citizen, stateType: string) {
    const todoData = citizen.memory.todosData;
    const existingIndex = todoData.todos.findIndex(t => t.stateType === stateType);
    if (existingIndex > -1) {
        todoData.todos.splice(existingIndex, 1);
    }
}

export function citizenAddTodo(citizen: Citizen, priority: number, stateType: string, reasonThought: string, state: ChatSimState) {
    const todoData = citizen.memory.todosData;
    if (citizen.stateInfo.type === stateType) return;
    const existing = todoData.todos.find(t => t.stateType === stateType);
    if (existing) {
        existing.priority = priority;
        return;
    }
    if (todoData.maxLength < todoData.todos.length + 1) {
        todoData.todos.pop();
    }
    const newTodo: CitizenTodo = {
        priority: priority,
        stateType: stateType,
        reasonThought: reasonThought,
    }
    citizenAddThought(citizen, reasonThought, state);
    todoData.todos.push(newTodo);
    todoData.todos.sort((a, b) => b.priority - a.priority);
}

export function citizenSetDreamJob(citizen: Citizen, dreamJob: string | undefined, state: ChatSimState) {
    if (!dreamJob) return;
    citizen.dreamJob = dreamJob;
    citizenChangeJob(citizen, dreamJob, state, [`My dream job is ${dreamJob}`]);
}

export function citizenResetStateTo(citizen: Citizen, type: string) {
    citizen.stateInfo = { type: type, stack: [], tags: citizen.stateInfo.tags };
    citizenStopMoving(citizen);
    citizen.paintBehindBuildings = undefined;
    citizen.displayedEquipments = [];
}

export function citizenStateStackTaskSuccess(citizen: Citizen) {
    citizen.stateInfo.stack.shift();
    citizen.stateInfo.previousTaskFailed = undefined;
    if (citizen.stateInfo.stack.length > 0) citizen.stateInfo.stack[0].returnedData = undefined;
}

export function citizenStateStackTaskSuccessWithData(citizen: Citizen, data: CitizenStateSuccessData) {
    citizen.stateInfo.stack.shift();
    if (citizen.stateInfo.stack.length > 0) citizen.stateInfo.stack[0].returnedData = data;
    citizen.stateInfo.previousTaskFailed = undefined;
}

export function citizenStateStackTaskFailed(citizen: Citizen) {
    citizen.stateInfo.stack.shift();
    citizen.stateInfo.previousTaskFailed = true;
}

export function citizenAddLogEntry(citizen: Citizen, message: string, state: ChatSimState) {
    citizen.log.unshift({
        time: state.time,
        message: message,
    });
    if (citizen.log.length > citizen.maxLogLength) {
        citizen.log.pop();
    }
}

export function citizenAddThought(citizen: Citizen, thought: string, state: ChatSimState) {
    if (citizenIsThinking(citizen, state) && citizen.stateInfo.thoughts) {
        citizenAddLogEntry(citizen, thought, state);
        citizen.stateInfo.thoughts.push(thought);
        if (citizen.stateInfo.thoughts.length > 4) {
            citizen.stateInfo.actionStartTime = Math.min(CITIZEN_TIME_PER_THOUGHT_LINE + citizen.stateInfo.actionStartTime!, state.time);
            citizen.stateInfo.thoughts.shift();
        }
    } else {
        citizenSetThought(citizen, [thought], state);
    }
}

export function citizenSetThought(citizen: Citizen, thoughts: string[], state: ChatSimState) {
    citizen.stateInfo.thoughts = thoughts;
    citizen.stateInfo.actionStartTime = state.time;
    citizenAddLogEntry(citizen, thoughts.join(""), state);
}

export function citizenCanCarryMore(citizen: Citizen): boolean {
    return inventoryGetUsedCapacity(citizen.inventory) < citizen.inventory.size;
}

export function tickCitizens(state: ChatSimState) {
    for (let citizen of state.map.citizens) {
        tickCitizen(citizen, state);
    }
    deleteCitizens(state);
}

export function citizenCheckTodoList(citizen: Citizen, state: ChatSimState, conditionStackLength: number = 0): boolean {
    if (citizen.stateInfo.stack.length <= conditionStackLength) {
        if (citizen.memory.todosData.todos.length > 0) {
            const todo = citizen.memory.todosData.todos[0];
            if (todo && todo.stateType !== citizen.stateInfo.type) {
                citizenAddThought(citizen, `Let's do next todo.`, state);
                citizenResetStateTo(citizen, todo.stateType);
                return true;
            }
        }
    }
    return false;
}

export function paintSelectionBox(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    if (state.inputData.selected) {
        let position: Position | undefined;
        let size = 0;
        switch (state.inputData.selected.type) {
            case "citizen":
                const citizen: Citizen = state.inputData.selected.object;
                position = citizen.position;
                size = CITIZEN_PAINT_SIZE;
                break;
            case "building":
                const building: Building = state.inputData.selected.object;
                position = building.position;
                size = 60;
                break;
            case "tree":
                const tree: Tree = state.inputData.selected.object;
                position = tree.position;
                size = 60;
                break;
            case "mushroom":
                const mushroom: Mushroom = state.inputData.selected.object;
                position = mushroom.position;
                size = 20;
                break;
        }
        if (position) {
            const paintPos = mapPositionToPaintPosition(position, state.paintData.map);
            ctx.strokeStyle = "black";
            ctx.lineWidth = 3;
            ctx.beginPath();
            ctx.rect(Math.floor(paintPos.x - size / 2), Math.floor(paintPos.y - size / 2), size, size);
            ctx.stroke();
        }
    }
}

export function citizenIsThinking(citizen: Citizen, state: ChatSimState) {
    return citizen.stateInfo.actionStartTime !== undefined
        && citizen.stateInfo.thoughts
        && citizen.stateInfo.actionStartTime + citizen.stateInfo.thoughts.length * CITIZEN_TIME_PER_THOUGHT_LINE >= state.time;
}

export function paintCitizens(ctx: CanvasRenderingContext2D, state: ChatSimState, layer: number) {
    const paintDataMap = state.paintData.map;
    let nameFontSize = 16 / state.paintData.map.zoom;
    let nameLineWidth = 2 / state.paintData.map.zoom;
    let sortedForPaintCitizens = state.map.citizens.toSorted((a, b) => a.position.y - b.position.y);
    for (let citizen of sortedForPaintCitizens) {
        paintCitizen(ctx, citizen, layer, paintDataMap, nameFontSize, nameLineWidth, state);
    }
}

export function paintCititzenSpeechBubbles(ctx: CanvasRenderingContext2D, state: ChatSimState) {
    let sortedForPaintCitizens = state.map.citizens.toSorted((a, b) => a.position.y - b.position.y);
    for (let citizen of sortedForPaintCitizens) {
        const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
        paintChatBubbles(ctx, citizen, citizen.lastChat, { x: paintPos.x, y: paintPos.y - CITIZEN_PAINT_SIZE / 2 - 4 }, state);
    }
}

export function citizenGetVisionDistance(citizen: Citizen, state: ChatSimState): number {
    return 180;
}

export function paintCitizenComplete(ctx: CanvasRenderingContext2D, citizen: Citizen, state: ChatSimState) {
    let nameFontSize = 16 / state.paintData.map.zoom;
    let nameLineWidth = 2 / state.paintData.map.zoom;
    paintCitizen(ctx, citizen, PAINT_LAYER_CITIZEN_BEFORE_HOUSES, state.paintData.map, nameFontSize, nameLineWidth, state);
    paintCitizen(ctx, citizen, PAINT_LAYER_CITIZEN_AFTER_HOUSES, state.paintData.map, nameFontSize, nameLineWidth, state);
    const paintPos = mapPositionToPaintPosition(citizen.position, state.paintData.map);
    paintChatBubbles(ctx, citizen, citizen.lastChat, { x: paintPos.x, y: paintPos.y - CITIZEN_PAINT_SIZE / 2 - 4 }, state);
}

function paintCitizen(ctx: CanvasRenderingContext2D, citizen: Citizen, layer: number, paintDataMap: PaintDataMap, nameFontSize: number, nameLineWidth: number, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, paintDataMap);
    const paintInThisLayer = (layer === PAINT_LAYER_CITIZEN_BEFORE_HOUSES && citizen.paintBehindBuildings) || (layer === PAINT_LAYER_CITIZEN_AFTER_HOUSES && !citizen.paintBehindBuildings);
    if (citizen.isDead) {
        ctx.drawImage(IMAGES[IMAGE_PATH_CITIZEN_DEAD], 0, 0, 200, 200,
            paintPos.x - CITIZEN_PAINT_SIZE / 2,
            paintPos.y - CITIZEN_PAINT_SIZE / 2,
            CITIZEN_PAINT_SIZE, CITIZEN_PAINT_SIZE
        );
        paintCitizenName(ctx, citizen, paintPos, nameFontSize, nameLineWidth);
        return;
    }
    if (paintInThisLayer) {
        if (citizen.moveTo) {
            const frames = 4;
            const frameTime = 100;
            const walkingFrameNumber = Math.floor((state.time % (frames * frameTime)) / frameTime);
            const imageIndexX = walkingFrameNumber === 3 ? 1 : walkingFrameNumber;
            const direction = calculateDirection(citizen.position, citizen.moveTo);
            const imageIndexY = Math.floor((direction + Math.PI * 2 - Math.PI / 4) % (Math.PI * 2) / (Math.PI / 2));
            ctx.drawImage(IMAGES[IMAGE_PATH_CITIZEN], imageIndexX * 200, imageIndexY * 200, 200, 200,
                paintPos.x - CITIZEN_PAINT_SIZE / 2,
                paintPos.y - CITIZEN_PAINT_SIZE / 2,
                CITIZEN_PAINT_SIZE, CITIZEN_PAINT_SIZE
            );
        } else {
            let imagePath = IMAGE_PATH_CITIZEN;
            let index = 1;
            if (citizen.stateInfo.stack.length > 0) {
                if (citizen.stateInfo.stack[0].state === CITIZEN_NEED_STATE_SLEEPING) {
                    imagePath = IMAGE_PATH_CITIZEN_SLEEPING;
                    index = 0;
                }
                if (citizen.stateInfo.stack[0].state === CITIZEN_STATE_EAT) {
                    imagePath = IMAGE_PATH_CITIZEN_EAT;
                    index = 0;
                }
            }
            ctx.drawImage(IMAGES[imagePath], 200 * index, 0, 200, 200,
                paintPos.x - CITIZEN_PAINT_SIZE / 2,
                paintPos.y - CITIZEN_PAINT_SIZE / 2,
                CITIZEN_PAINT_SIZE, CITIZEN_PAINT_SIZE
            );
            if (imagePath === IMAGE_PATH_CITIZEN_EAT) {
                const mushroomSize = 10;
                ctx.drawImage(IMAGES[IMAGE_PATH_MUSHROOM], 0, 0, 200, 200,
                    paintPos.x - mushroomSize / 2,
                    paintPos.y - 8,
                    mushroomSize, mushroomSize
                );
            }
        }
        paintCitizenEquipments(ctx, citizen, state);
    }

    if (layer === PAINT_LAYER_CITIZEN_AFTER_HOUSES) {
        paintSleeping(ctx, citizen, { x: paintPos.x, y: paintPos.y - CITIZEN_PAINT_SIZE / 2 - 10 }, state.time);
        paintThoughtBubble(ctx, citizen, paintPos, state);
        paintCitizenName(ctx, citizen, paintPos, nameFontSize, nameLineWidth);
        ctx.font = `${nameFontSize}px Arial`;
        const nameOffsetX = Math.floor(ctx.measureText(citizen.name).width / 2);
        const nameYSpacing = 5;
        drawTextWithOutline(ctx, citizen.name, paintPos.x - nameOffsetX, paintPos.y - CITIZEN_PAINT_SIZE / 2 - nameYSpacing, "white", "black", nameLineWidth);
    }
    if (citizen.tradePaw && citizen.tradePaw.startTime + citizen.tradePaw.duration >= state.time) {
        const timePerCent = (state.time - citizen.tradePaw.startTime) / citizen.tradePaw.duration;
        const startingPaintPos = mapPositionToPaintPosition(citizen.tradePaw.moveFrom, paintDataMap);
        const animationStartPaintPosition = {
            x: startingPaintPos.x,
            y: startingPaintPos.y,
        }
        const animationEndOffset = {
            x: citizen.tradePaw.moveTo.x - citizen.tradePaw.moveFrom.x,
            y: citizen.tradePaw.moveTo.y - citizen.tradePaw.moveFrom.y,
        }
        if (citizen.tradePaw.money > 0) {
            paintInventoryMoney(ctx, citizen.tradePaw.money, {
                x: animationStartPaintPosition.x + animationEndOffset.x * timePerCent,
                y: animationStartPaintPosition.y + animationEndOffset.y * timePerCent,
            });
        }
        if (citizen.tradePaw.item) {
            paintInventoryItem(ctx, citizen.tradePaw.item, {
                x: animationStartPaintPosition.x + animationEndOffset.x * timePerCent,
                y: animationStartPaintPosition.y + animationEndOffset.y * timePerCent,
            });
        }
    }
}

function setUpHappinessTags(citizen: Citizen, state: ChatSimState) {
    const testTags = [TAG_DOING_NOTHING, TAG_WALKING_AROUND, TAG_OUTSIDE, TAG_AT_HOME];
    let randomIndex = Math.floor(nextRandom(state.randomSeed) * testTags.length);
    citizen.happinessData.happinessTags.push(testTags.splice(randomIndex, 1)[0]);
    randomIndex = Math.floor(nextRandom(state.randomSeed) * testTags.length);
    citizen.happinessData.happinessTags.push(testTags.splice(randomIndex, 1)[0]);
    randomIndex = Math.floor(nextRandom(state.randomSeed) * testTags.length);
    citizen.happinessData.unhappinessTags.push(testTags.splice(randomIndex, 1)[0]);
}

function paintCitizenName(ctx: CanvasRenderingContext2D, citizen: Citizen, paintPos: Position, nameFontSize: number, nameLineWidth: number) {
    ctx.font = `${nameFontSize}px Arial`;
    const nameOffsetX = Math.floor(ctx.measureText(citizen.name).width / 2);
    const nameYSpacing = 5;
    drawTextWithOutline(ctx, citizen.name, paintPos.x - nameOffsetX, paintPos.y - CITIZEN_PAINT_SIZE / 2 - nameYSpacing, "white", "black", nameLineWidth);
}

function paintThoughtBubble(ctx: CanvasRenderingContext2D, citizen: Citizen, paintPos: Position, state: ChatSimState) {
    if (!citizenIsThinking(citizen, state)) return;
    const stateInfo = citizen.stateInfo;
    if (stateInfo.actionStartTime === undefined || stateInfo.thoughts === undefined) return;
    const fontSize = 8;
    ctx.font = `${fontSize}px Arial`;
    const textLinesAmount = Math.ceil((state.time - stateInfo.actionStartTime) / CITIZEN_TIME_PER_THOUGHT_LINE);
    const texts = stateInfo.thoughts.slice(0, textLinesAmount);
    const margin = 5;
    let maxTextWidth = 0;
    for (let text of stateInfo.thoughts) {
        const currentWidth = ctx.measureText(text).width;
        if (currentWidth > maxTextWidth) maxTextWidth = currentWidth;
    }
    const thoughtBubbleHeight = fontSize * texts.length + margin * 2;
    const thoughtBubbleWidth = maxTextWidth + margin * 2;
    const thoughtBubbleCenterX = paintPos.x;
    const thoughtBubbleBottomY = paintPos.y - CITIZEN_PAINT_SIZE / 2;
    const thoughtBubbleLeftX = thoughtBubbleCenterX - thoughtBubbleWidth / 2;
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.fillStyle = "white";
    ctx.beginPath();
    ctx.arc(thoughtBubbleCenterX - 5, thoughtBubbleBottomY - 2, 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(thoughtBubbleCenterX, thoughtBubbleBottomY - 10, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillRect(thoughtBubbleLeftX, thoughtBubbleBottomY - thoughtBubbleHeight - 20, thoughtBubbleWidth, thoughtBubbleHeight);
    const topY = thoughtBubbleBottomY - thoughtBubbleHeight - 20;
    const bottomY = topY + thoughtBubbleHeight;
    const leftX = thoughtBubbleLeftX;
    const rightX = leftX + thoughtBubbleWidth;
    const cloudPartTargetSize = 15;
    ctx.beginPath();
    ctx.moveTo(leftX, topY);
    const partCounterX = Math.round(thoughtBubbleWidth / cloudPartTargetSize);
    const sizeX = thoughtBubbleWidth / partCounterX;
    const partCounterY = Math.round(thoughtBubbleHeight / cloudPartTargetSize);
    const sizeY = thoughtBubbleHeight / partCounterY;
    let currentX = leftX;
    let currentY = topY;
    for (let x = 0; x < partCounterX; x++) {
        ctx.quadraticCurveTo(currentX + sizeX / 2, currentY - sizeX * 0.7, currentX + sizeX, currentY);
        currentX += sizeX;
    }
    for (let y = 0; y < partCounterY; y++) {
        ctx.quadraticCurveTo(currentX + sizeY * 0.7, currentY + sizeY / 2, currentX, currentY + sizeY);
        currentY += sizeY;
    }
    for (let x = 0; x < partCounterX; x++) {
        ctx.quadraticCurveTo(currentX - sizeX / 2, currentY + sizeX * 0.7, currentX - sizeX, currentY);
        currentX -= sizeX;
    }
    for (let y = 0; y < partCounterY; y++) {
        ctx.quadraticCurveTo(currentX - sizeY * 0.7, currentY - sizeY / 2, currentX, currentY - sizeY);
        currentY -= sizeY;
    }
    ctx.fill();
    ctx.stroke();

    const textBottom = thoughtBubbleBottomY - margin - 20;
    for (let i = 0; i < texts.length; i++) {
        const offsetY = -(texts.length - i - 1) * fontSize;
        drawTextWithOutline(ctx, texts[i], thoughtBubbleLeftX + margin, textBottom + offsetY, "white", "black", 1);
    }
}

function paintSleeping(ctx: CanvasRenderingContext2D, citizen: Citizen, paintPosition: Position, time: number) {
    if (citizen.stateInfo.type !== CITIZEN_NEED_SLEEP) return;
    if (citizen.stateInfo.stack.length === 0 || citizen.stateInfo.stack[0].state !== CITIZEN_NEED_STATE_SLEEPING) return;
    const timer = time / 300;
    const swingRadius = 10;
    const fontSize = 14;
    const offsetY = -fontSize * ((Math.sin(timer) + 1) / 2);
    ctx.font = `${fontSize}px Arial`;
    drawTextWithOutline(ctx, "z", paintPosition.x + Math.floor(Math.sin(timer) * swingRadius), paintPosition.y + offsetY);
    drawTextWithOutline(ctx, "Z", paintPosition.x + 5 + Math.floor(Math.sin(timer + 1) * swingRadius), paintPosition.y + offsetY - fontSize);
    drawTextWithOutline(ctx, "Z", paintPosition.x + 10 + Math.floor(Math.sin(timer + 2) * swingRadius), paintPosition.y + offsetY - fontSize * 2);
}

function tickCitizen(citizen: Citizen, state: ChatSimState) {
    if (citizen.isDead) return;
    citizen.foodPerCent -= state.tickInterval / state.timPerDay * 0.75;
    citizen.energyPerCent -= state.tickInterval / state.timPerDay;
    checkCitizenNeeds(citizen, state);
    tickCitizenState(citizen, state);
    citizenMoveToTick(citizen);
    citizenHappinessTick(citizen);
}

function citizenHappinessTick(citizen: Citizen) {
    if (citizen.stateInfo.stack.length === 0) return;
    const citizenState = citizen.stateInfo.stack[0];
    if (!citizenState.tags) return;

    for (let tag of citizenState.tags) {
        if (citizen.happinessData.happinessTags.findIndex(t => t === tag) > -1) {
            const changeBy = Math.max((1 - citizen.happinessData.happiness) / 1000, 0.0000000001);
            citizen.happinessData.happiness += changeBy;
            if (citizen.happinessData.happiness > 1) citizen.happinessData.happiness = 1;
        }
        if (citizen.happinessData.unhappinessTags.findIndex(t => t === tag) > -1) {
            const changeBy = Math.max((1 + citizen.happinessData.happiness) / 1000, 0.0000000001);
            citizen.happinessData.happiness -= changeBy;
            if (citizen.happinessData.happiness < -1) citizen.happinessData.happiness = -1;
        }
    }
}

function tickCitizenState(citizen: Citizen, state: ChatSimState) {
    const typeTickFunction = CITIZEN_STATE_TYPE_TICK_FUNCTIONS[citizen.stateInfo.type];
    typeTickFunction(citizen, state);
}

function tickCitizenTypeChangeJob(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.stack.length > 0 && citizen.stateInfo.stack[0].state === CITIZEN_STATE_THINKING) {
        const stateInfo = citizen.stateInfo;
        if (stateInfo.actionStartTime === undefined || stateInfo.actionStartTime + CITIZEN_TIME_PER_THOUGHT_LINE * stateInfo.thoughts!.length < state.time) {
            citizenResetStateTo(citizen, CITIZEN_STATE_TYPE_WORKING_JOB);
            return;
        }
    }
    if (citizen.stateInfo.stack.length > 0) {
        const tickFunction = CITIZEN_STATE_DEFAULT_TICK_FUNCTIONS[citizen.stateInfo.stack[0].state];
        if (tickFunction) {
            tickFunction(citizen, state);
            return;
        }
    }
}

function deleteCitizens(state: ChatSimState) {
    for (let i = state.map.citizens.length - 1; i >= 0; i--) {
        const starved = state.map.citizens[i].foodPerCent < 0;
        const outOfEngergy = state.map.citizens[i].energyPerCent < 0;
        const suicide = state.map.citizens[i].happinessData.happiness <= -1;
        if (starved || outOfEngergy || suicide) {
            let deceased = state.map.citizens[i];
            if (!deceased.isDead) {
                citizenStopMoving(deceased);
                if (starved) {
                    if (state.logger) state.logger.log(`${deceased.name} died by starving`, deceased);
                    citizenAddLogEntry(deceased, "starved to death", state);
                    deceased.isDead = { reason: "starved to death", time: state.time };
                }
                if (outOfEngergy) {
                    if (state.logger) state.logger.log(`${deceased.name} died by over working`, deceased);
                    citizenAddLogEntry(deceased, "overworked to death", state);
                    deceased.isDead = { reason: "overworked to death", time: state.time };
                };
                if (suicide) {
                    if (state.logger) state.logger.log(`${deceased.name} commited suicide`, deceased);
                    citizenAddLogEntry(deceased, "commited suicide", state);
                    deceased.isDead = { reason: "commited suicide", time: state.time };
                };
                if (deceased.home) {
                    if (deceased.home.owner === deceased && state.map.citizens.length > 0) {
                        const randomNewOwnerIndex = Math.floor(Math.random() * state.map.citizens.length);
                        const randomNewOwner = state.map.citizens[randomNewOwnerIndex];
                        deceased.home.owner = randomNewOwner;
                        if (!randomNewOwner.home) {
                            randomNewOwner.home = deceased.home;
                        }
                    }
                    if (deceased.home.inhabitedBy === deceased) {
                        deceased.home.inhabitedBy = undefined;
                    }
                }
            } else {
                if (deceased.isDead.time + 30000 < state.time) {
                    state.map.citizens.splice(i, 1);
                }
            }
        }
    }
}

function citizenMoveToTick(citizen: Citizen) {
    if (citizen.moveTo) {
        const diffX = citizen.moveTo.x - citizen.position.x;
        const diffY = citizen.moveTo.y - citizen.position.y;
        const distance = Math.sqrt(diffX * diffX + diffY * diffY);
        if (citizen.speed - distance > 0) {
            citizen.position.x = citizen.moveTo.x;
            citizen.position.y = citizen.moveTo.y;
            citizenStopMoving(citizen);
        } else {
            const factor = citizen.speed / distance;
            citizen.position.x += diffX * factor;
            citizen.position.y += diffY * factor;
        }
    }
}

