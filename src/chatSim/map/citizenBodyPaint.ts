import { IMAGE_PATH_CITIZEN_PART_BODY, IMAGE_PATH_CITIZEN_PART_EAR_LEFT, IMAGE_PATH_CITIZEN_PART_EAR_RIGHT, IMAGE_PATH_CITIZEN_PART_FOOT, IMAGE_PATH_CITIZEN_PART_HEAD, IMAGE_PATH_CITIZEN_PART_PAW, IMAGE_PATH_PUPILS } from "../../drawHelper.js";
import { ChatSimState, Position } from "../chatSimModels.js";
import { citizenIsSleeping } from "../citizenNeeds/citizenNeedSleep.js";
import { IMAGES } from "../images.js";
import { mapPositionToPaintPosition, PAINT_LAYER_CITIZEN_AFTER_HOUSES, PAINT_LAYER_CITIZEN_BEFORE_HOUSES } from "../paint.js";
import { Citizen, CITIZEN_PAINT_SIZE } from "./citizen.js";
import { PaintDataMap } from "./map.js";


type CititzenPaintPart = {
    type: "Image" | "function",
}

type CititzenPaintPartFunction = CititzenPaintPart & {
    type: "function",
    func: (ctx: CanvasRenderingContext2D, citizen: Citizen, paintPos: Position, state: ChatSimState) => void,
}

type CititzenPaintPartImage = CititzenPaintPart & {
    type: "Image",
    imagePath: string,
    width: number,
    height: number,
    offsetX: number,
    offsetY: number,
    index?: number,
    horizontalScale?: number,
    verticalScale?: number,
    rotate?: number,
}

type ImageAdditionalData = {
    horizontalFrames: number,
    verticalFrames: number,
}

const IMAGE_ADDITIONAL_DATA: { [key: string]: ImageAdditionalData } = {};
IMAGE_ADDITIONAL_DATA[IMAGE_PATH_CITIZEN_PART_EAR_LEFT] = { horizontalFrames: 3, verticalFrames: 1 };
IMAGE_ADDITIONAL_DATA[IMAGE_PATH_CITIZEN_PART_EAR_RIGHT] = { horizontalFrames: 3, verticalFrames: 1 };

export function paintCitizenBody(ctx: CanvasRenderingContext2D, citizen: Citizen, paintDataMap: PaintDataMap, layer: number, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, paintDataMap);
    const paintInThisLayer = (layer === PAINT_LAYER_CITIZEN_BEFORE_HOUSES && citizen.paintData.paintBehindBuildings) || (layer === PAINT_LAYER_CITIZEN_AFTER_HOUSES && !citizen.paintData.paintBehindBuildings);
    if (!paintInThisLayer) return;
    const cititzenFattness = citizen.foodPerCent + 0.5;
    const paintParts: CititzenPaintPart[] = [
        createScaleAnimationPaintPart(IMAGE_PATH_CITIZEN_PART_FOOT, -15, 60, 0.5, 0, 200, 0, citizen, state),
        createScaleAnimationPaintPart(IMAGE_PATH_CITIZEN_PART_FOOT, 15, 60, 0.5, 0, 200, 100, citizen, state),
        createDefaultPaintPartImage(IMAGE_PATH_CITIZEN_PART_BODY, 0, 15, cititzenFattness),
        createFlipBookPaintPart(IMAGE_PATH_CITIZEN_PART_EAR_LEFT, -45, -45, "bounce", 100, citizen, state),
        createFlipBookPaintPart(IMAGE_PATH_CITIZEN_PART_EAR_RIGHT, 45, -45, "bounce", 100, citizen, state),
        createDefaultPaintPartImage(IMAGE_PATH_CITIZEN_PART_HEAD, 0, -50),
        createScaleAnimationPaintPart(IMAGE_PATH_CITIZEN_PART_PAW, 30, 20, -0.25, 0, 200, 100, citizen, state),
        createScaleAnimationPaintPart(IMAGE_PATH_CITIZEN_PART_PAW, -30, 20, -0.25, 0, 200, 0, citizen, state),
        { type: "function", func: paintMouth } as CititzenPaintPartFunction,
        { type: "function", func: paintEyes } as CititzenPaintPartFunction,
    ];

    for (let part of paintParts) {
        paintPart(ctx, part, paintPos, citizen, state);
    }
}

function paintEyes(ctx: CanvasRenderingContext2D, citizen: Citizen, paintPos: Position, state: ChatSimState) {
    const eyesX = paintPos.x;
    const eyesY = paintPos.y - 14;
    const eyeXOffset = 1;
    const blinkDuration = 150;

    let blinkingFactor = 1;
    if (citizen.paintData.blinkStartedTime !== undefined) {
        const timePassedSinceBlinkStart = state.time - citizen.paintData.blinkStartedTime;
        blinkingFactor = Math.max(Math.abs(timePassedSinceBlinkStart - blinkDuration / 2) / (blinkDuration / 2), 0);
    }

    let sleepy = false;
    if (citizenIsSleeping(citizen)) {
        blinkingFactor = 0;
    } else if (citizen.energyPerCent < 0.5) {
        blinkingFactor *= citizen.energyPerCent * 2;
        if (citizen.energyPerCent < 0.25) sleepy = true;
    }

    const eyeWidth = 4;
    paintSingleEye(ctx, { x: eyesX + eyeXOffset + eyeWidth / 2, y: eyesY }, blinkingFactor, sleepy);
    paintSingleEye(ctx, { x: eyesX - eyeXOffset - eyeWidth / 2, y: eyesY }, blinkingFactor, sleepy);

    if (citizen.paintData.blinkStartedTime === undefined) {
        if (Math.random() < 0.005) {
            citizen.paintData.blinkStartedTime = state.time;
        }
    } else if (citizen.paintData.blinkStartedTime + blinkDuration < state.time) {
        citizen.paintData.blinkStartedTime = undefined;
    }
}

function paintSingleEye(ctx: CanvasRenderingContext2D, paintPos: Position, blinkingFactor: number, sleepy: boolean) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.25;
    const eyeWidth = 4;
    const eyeLeft = paintPos.x - eyeWidth / 2;
    const eyeCpYTop = eyeWidth * blinkingFactor - eyeWidth / 2;

    const clipPath: Path2D = new Path2D();
    clipPath.moveTo(eyeLeft, paintPos.y);
    clipPath.quadraticCurveTo(eyeLeft + eyeWidth / 2, paintPos.y - eyeCpYTop, eyeLeft + eyeWidth, paintPos.y);
    clipPath.quadraticCurveTo(eyeLeft + eyeWidth / 2, paintPos.y + eyeWidth / 2, eyeLeft, paintPos.y);
    ctx.save();
    ctx.clip(clipPath);
    const pupilSize = 1.5;
    ctx.drawImage(IMAGES[IMAGE_PATH_PUPILS], 0, 0, IMAGES[IMAGE_PATH_PUPILS].width / 2, IMAGES[IMAGE_PATH_PUPILS].height,
        eyeLeft + eyeWidth / 2 - pupilSize / 2, paintPos.y - pupilSize / 2, pupilSize, pupilSize
    );
    ctx.restore();

    ctx.beginPath();
    ctx.moveTo(eyeLeft, paintPos.y);
    ctx.quadraticCurveTo(eyeLeft + eyeWidth / 2, paintPos.y - eyeCpYTop, eyeLeft + eyeWidth, paintPos.y);
    ctx.quadraticCurveTo(eyeLeft + eyeWidth / 2, paintPos.y + eyeWidth / 2, eyeLeft, paintPos.y);
    ctx.stroke();

    if (sleepy) {
        ctx.beginPath();
        ctx.moveTo(eyeLeft + eyeWidth * 0.1, paintPos.y + eyeWidth / 4);
        ctx.quadraticCurveTo(eyeLeft + eyeWidth / 2, paintPos.y + eyeWidth * 0.5, eyeLeft + eyeWidth * 0.8, paintPos.y + eyeWidth / 4);
        ctx.stroke();
    }
}

function paintMouth(ctx: CanvasRenderingContext2D, citizen: Citizen, paintPos: Position, state: ChatSimState) {
    ctx.strokeStyle = "black";
    ctx.lineWidth = 0.25;
    ctx.beginPath();
    let mouthY = -6 - citizen.happinessData.happiness;
    const cpY = citizen.happinessData.happiness * 5;
    ctx.moveTo(paintPos.x - 3, paintPos.y + mouthY);
    ctx.quadraticCurveTo(paintPos.x, paintPos.y + cpY + mouthY, paintPos.x + 3, paintPos.y + mouthY)
    ctx.lineTo(paintPos.x + 3, paintPos.y + mouthY);
    ctx.stroke();
}

function createScaleAnimationPaintPart(imagePath: string, offsetX: number, offsetY: number, verticalScale: number, horizontalScale: number, interval: number, intervalOffset: number, citizen: Citizen, state: ChatSimState) {
    const paintPart = createDefaultPaintPartImage(imagePath, offsetX, offsetY);
    if (citizen.moveTo) {
        let factor = ((state.time + intervalOffset) % interval) / interval * 2;
        if (factor > 1) factor -= (factor - 1) * 2;
        paintPart.horizontalScale = 1 + horizontalScale * factor;
        paintPart.offsetX -= paintPart.width * (1 - paintPart.horizontalScale) / 2;
        paintPart.verticalScale = 1 + verticalScale * factor;
        paintPart.offsetY -= paintPart.height * (1 - paintPart.verticalScale) / 2;
    }
    return paintPart;
}

function createDefaultPaintPartImage(imagePath: string, offsetX: number, offsetY: number, horizontalScale?: number): CititzenPaintPartImage {
    const imagePart = IMAGES[imagePath];
    let width = imagePart.width;
    let height = imagePart.height;
    const additional = IMAGE_ADDITIONAL_DATA[imagePath];
    if (additional) {
        width = width / additional.horizontalFrames;
        height = height / additional.verticalFrames;
    }
    return {
        type: "Image",
        imagePath: imagePath,
        offsetX,
        offsetY,
        width,
        height,
        horizontalScale,
    }
}

function createFlipBookPaintPart(imagePath: string, offsetX: number, offsetY: number, flipType: "loop" | "bounce", loopInterval: number, citizen: Citizen, state: ChatSimState) {
    const paintPart = createDefaultPaintPartImage(imagePath, offsetX, offsetY);
    const additional = IMAGE_ADDITIONAL_DATA[imagePath];
    let index = 0;
    if (additional.horizontalFrames > 1) {
        const maxIndex = additional.horizontalFrames;
        if (flipType === "loop") {
            if (citizen.moveTo) {
                index = Math.floor((state.time / loopInterval) % maxIndex);
            }
        } else {
            if (citizen.moveTo) {
                index = Math.floor(state.time / loopInterval) % (2 * maxIndex - 2);
                if (index >= maxIndex) index += (maxIndex - index - 1) * 2;
            } else {
                index = Math.floor(additional.horizontalFrames / 2);
            }
        }
    }
    paintPart.index = index;
    return paintPart;
}

function paintPart(ctx: CanvasRenderingContext2D, part: CititzenPaintPart, paintPos: Position, citizen: Citizen, state: ChatSimState) {
    const scaleFactor = 40 / 200;
    if (part.type === "Image") {
        const tempPart = part as CititzenPaintPartImage;
        const imagePart = IMAGES[tempPart.imagePath];
        let scaledWidth = tempPart.width * scaleFactor;
        if (tempPart.horizontalScale !== undefined) {
            scaledWidth *= tempPart.horizontalScale;
        }
        let scaledHeight = tempPart.height * scaleFactor;
        if (tempPart.verticalScale !== undefined) {
            scaledHeight *= tempPart.verticalScale;
        }
        let index = tempPart.index ?? 0;
        ctx.drawImage(imagePart, index * tempPart.width, 0, tempPart.width, tempPart.height,
            paintPos.x - scaledWidth / 2 + tempPart.offsetX * scaleFactor,
            paintPos.y - scaledHeight / 2 + tempPart.offsetY * scaleFactor,
            scaledWidth, scaledHeight
        );
    } else {
        const tempPart = part as CititzenPaintPartFunction;
        tempPart.func(ctx, citizen, paintPos, state);
    }
}