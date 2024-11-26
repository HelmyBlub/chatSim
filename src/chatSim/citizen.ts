import { drawTextWithOutline, IMAGE_PATH_CITIZEN } from "../drawHelper.js";
import { Chat, paintChatBubbles } from "./chatBubble.js";
import { ChatSimState, Building, Position, Mushroom, PaintDataMap } from "./chatSimModels.js";
import { tickCitizenNeeds } from "./citizenNeeds/citizenNeed.js";
import { CITIZEN_NEED_SLEEP, CITIZEN_NEED_STATE_SLEEPING } from "./citizenNeeds/citizenNeedSleep.js";
import { inventoryGetUsedCapacity, Inventory } from "./inventory.js";
import { CitizenJob, createJob, isCitizenInInteractDistance, paintCitizenJobTool, tickCitizenJob } from "./jobs/job.js";
import { CITIZEN_JOB_FOOD_GATHERER } from "./jobs/jobFoodGatherer.js";
import { calculateDirection, INVENTORY_MUSHROOM, INVENTORY_WOOD } from "./main.js";
import { mapPositionToPaintPosition, PAINT_LAYER_CITIZEN_AFTER_HOUSES, PAINT_LAYER_CITIZEN_BEFORE_HOUSES } from "./paint.js";
import { Tree } from "./tree.js";

export type CitizenStateInfo = {
    type: string,
    stack: {
        state: string,
        data?: any,
    }[],
    previousTaskFailed?: boolean,
    actionStartTime?: number,
    thoughts?: string[],
}

export type CitizenNeeds = {
    needsData: { [key: string]: any };
    lastSuccededCheckedNeedsTime?: number,
}

export type Citizen = {
    job: CitizenJob,
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
    log: CitizenLogEntry[];
    lastChat?: Chat,
    maxLogLength: number,
    paintBehindBuildings?: boolean,
}

export type CitizenLogEntry = {
    time: number,
    message: string,
}

export const CITIZEN_STATE_TYPE_WORKING_JOB = "workingJob";
export const CITIZEN_STATE_THINKING = "thinking";
export const CITIZEN_TIME_PER_THOUGHT_LINE = 2000;
const CITIZEN_PAINT_SIZE = 40;

export function addCitizen(user: string, state: ChatSimState) {
    if (state.map.citizens.find(c => c.name === user)) return;
    state.map.citizens.push({
        name: user,
        birthTime: state.time,
        speed: 2,
        foodPerCent: 1,
        energyPerCent: 1,
        position: { x: 0, y: 0 },
        stateInfo: {
            type: CITIZEN_STATE_TYPE_WORKING_JOB,
            stack: [],
        },
        needs: {
            needsData: {},
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
        job: createJob(CITIZEN_JOB_FOOD_GATHERER, state),
        log: [],
        maxLogLength: 100,
    })
}

export function citizenStateStackTaskSuccess(citizen: Citizen) {
    citizen.stateInfo.stack.shift();
    citizen.stateInfo.previousTaskFailed = undefined;
}

export function citizenStateStackTaskFailed(citizen: Citizen) {
    citizen.stateInfo.stack.shift();
    citizen.stateInfo.previousTaskFailed = true;
}

export function addCitizenLogEntry(citizen: Citizen, message: string, state: ChatSimState) {
    citizen.log.unshift({
        time: state.time,
        message: message,
    });
    if (citizen.log.length > citizen.maxLogLength) {
        citizen.log.pop();
    }
}

export function addCitizenThought(citizen: Citizen, thought: string, state: ChatSimState) {
    if (isCitizenThinking(citizen, state) && citizen.stateInfo.thoughts) {
        addCitizenLogEntry(citizen, thought, state);
        citizen.stateInfo.thoughts.push(thought);
        if (citizen.stateInfo.thoughts.length > 4) {
            citizen.stateInfo.actionStartTime = Math.min(CITIZEN_TIME_PER_THOUGHT_LINE + citizen.stateInfo.actionStartTime!, state.time);
            citizen.stateInfo.thoughts.shift();
        }
    } else {
        setCitizenThought(citizen, [thought], state);
    }
}

export function setCitizenThought(citizen: Citizen, thoughts: string[], state: ChatSimState) {
    citizen.stateInfo.thoughts = thoughts;
    citizen.stateInfo.actionStartTime = state.time;
    addCitizenLogEntry(citizen, thoughts.join(""), state);
}

export function canCitizenCarryMore(citizen: Citizen): boolean {
    return inventoryGetUsedCapacity(citizen.inventory) < citizen.inventory.size;
}

export function tickCitizens(state: ChatSimState) {
    for (let citizen of state.map.citizens) {
        tickCitizen(citizen, state);
    }
    deleteCitizens(state);
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

export function isCitizenThinking(citizen: Citizen, state: ChatSimState) {
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
    if (state.inputData.selected && state.inputData.selected.type === "citizen") {
        const citizen = state.inputData.selected.object as Citizen;
        paintCitizen(ctx, citizen, layer, paintDataMap, nameFontSize, nameLineWidth, state);
    }
}

function paintCitizen(ctx: CanvasRenderingContext2D, citizen: Citizen, layer: number, paintDataMap: PaintDataMap, nameFontSize: number, nameLineWidth: number, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, paintDataMap);
    const isAtHomeSleeping = citizen.home && citizen.stateInfo.type === CITIZEN_NEED_SLEEP && isCitizenInInteractDistance(citizen, citizen.home.position);
    const paintInThisLayer = (layer === PAINT_LAYER_CITIZEN_BEFORE_HOUSES && citizen.paintBehindBuildings) || (layer === PAINT_LAYER_CITIZEN_AFTER_HOUSES && !citizen.paintBehindBuildings);
    if (!isAtHomeSleeping && paintInThisLayer) {
        if (citizen.moveTo) {
            const frames = 4;
            const frameTime = 100;
            const walkingFrameNumber = Math.floor((state.time % (frames * frameTime)) / frameTime);
            const imageIndexX = walkingFrameNumber === 3 ? 1 : walkingFrameNumber;
            const direction = calculateDirection(citizen.position, citizen.moveTo);
            const imageIndexY = Math.floor((direction + Math.PI * 2 - Math.PI / 4) % (Math.PI * 2) / (Math.PI / 2));
            ctx.drawImage(state.images[IMAGE_PATH_CITIZEN], imageIndexX * 200, imageIndexY * 200, 200, 200,
                paintPos.x - CITIZEN_PAINT_SIZE / 2,
                paintPos.y - CITIZEN_PAINT_SIZE / 2,
                CITIZEN_PAINT_SIZE, CITIZEN_PAINT_SIZE
            );
        } else {
            ctx.drawImage(state.images[IMAGE_PATH_CITIZEN], 200, 0, 200, 200,
                paintPos.x - CITIZEN_PAINT_SIZE / 2,
                paintPos.y - CITIZEN_PAINT_SIZE / 2,
                CITIZEN_PAINT_SIZE, CITIZEN_PAINT_SIZE
            );
        }
        paintCitizenJobTool(ctx, citizen, state);
    }

    if (layer === PAINT_LAYER_CITIZEN_AFTER_HOUSES) {
        paintSleeping(ctx, citizen, { x: paintPos.x, y: paintPos.y - CITIZEN_PAINT_SIZE / 2 - 10 }, state.time);
        paintThoughtBubble(ctx, citizen, paintPos, state);
        paintChatBubbles(ctx, citizen, citizen.lastChat, { x: paintPos.x, y: paintPos.y - CITIZEN_PAINT_SIZE / 2 - 4 }, state);

        ctx.font = `${nameFontSize}px Arial`;
        const nameOffsetX = Math.floor(ctx.measureText(citizen.name).width / 2);
        const nameYSpacing = 5;
        drawTextWithOutline(ctx, citizen.name, paintPos.x - nameOffsetX, paintPos.y - CITIZEN_PAINT_SIZE / 2 - nameYSpacing, "white", "black", nameLineWidth);
    }
}

function paintThoughtBubble(ctx: CanvasRenderingContext2D, citizen: Citizen, paintPos: Position, state: ChatSimState) {
    if (!isCitizenThinking(citizen, state)) return;
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
    if (citizen.stateInfo.stack[0].state !== CITIZEN_NEED_STATE_SLEEPING) return;
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
    citizen.foodPerCent -= 0.0002;
    citizen.energyPerCent -= 16 / state.timPerDay;
    tickCitizenNeeds(citizen, state);
    tickCitizenState(citizen, state);
    citizenMoveToTick(citizen);
    if (citizen.inventory.items.length > 2) {
        debugger;
    }
}

function tickCitizenState(citizen: Citizen, state: ChatSimState) {
    if (citizen.stateInfo.type === CITIZEN_STATE_TYPE_WORKING_JOB) {
        tickCitizenJob(citizen, state);
    }
    if (citizen.stateInfo.stack.length > 0 && citizen.stateInfo.stack[0].state === CITIZEN_STATE_THINKING) {
        const stateInfo = citizen.stateInfo;
        if (stateInfo.actionStartTime === undefined || stateInfo.actionStartTime + CITIZEN_TIME_PER_THOUGHT_LINE * stateInfo.thoughts!.length < state.time) {
            citizen.stateInfo = { type: CITIZEN_STATE_TYPE_WORKING_JOB, stack: [] };
        }
    }
}

function deleteCitizens(state: ChatSimState) {
    for (let i = state.map.citizens.length - 1; i >= 0; i--) {
        const starved = state.map.citizens[i].foodPerCent < 0;
        const outOfEngergy = state.map.citizens[i].energyPerCent < 0;
        if (starved || outOfEngergy) {
            let deceased = state.map.citizens.splice(i, 1)[0];
            if (starved) {
                console.log(`${deceased.name} died by starving`, deceased);
                addCitizenLogEntry(deceased, "starved to death", state);
            }
            if (outOfEngergy) {
                console.log(`${deceased.name} died by over working`, deceased);
                addCitizenLogEntry(deceased, "overworked to death", state);
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
            citizen.moveTo = undefined;
        } else {
            const factor = citizen.speed / distance;
            citizen.position.x += diffX * factor;
            citizen.position.y += diffY * factor;
        }
    }
}

