import { drawTextWithOutline, loadImage } from "../drawHelper.js";
import { commandDrawPaw } from "./commands/commands.js";
import { playSoundRandomClapping, localStorageStoreChatters } from "./main.js";
import { Chatter, State } from "./mainModels.js";
import { drawOutfit } from "./outfits.js";

export const CHATTER_IMAGE_WIDTH = 200;
const CHATTER_IMAGE_HEIGHT = 200;
const BLINK_DURATION = 250;
const IMAGE_PATH_CHATTER = "images/chatter.png";
const IMAGE_PATH_CHATTER_HEAD = "images/chatterDogHead.png";
const IMAGE_PATH_CHATTER_BODY = "images/chatterDogBody.png";
const IMAGE_PATH_EYES = "images/eyes.png";
const IMAGE_PATH_PUPILS = "images/pupils.png";
const IMAGE_PATH_DOG_PAWS = "images/dogPaws.png";
const IMAGE_PATH_CHEF_HEAD = "images/chefHead.png";
const IMAGE_PATH_OVEN = "images/oven.png";


export type ChatterDogPaintValues = {
    pawDogOffsetX: number;
    pawDogOffsetY: number;
    pawsTopY: number;
    pawsMiddleX: number;
    pawOffsetX: number;
    pawWidth: number;
    rotatePawRightX: number;
    rotatePawLeftX: number;
    rotatePawY: number,
}

export function loadChatterDogImages(state: State) {
    state.images[IMAGE_PATH_CHATTER] = loadImage(IMAGE_PATH_CHATTER);
    state.images[IMAGE_PATH_CHATTER_HEAD] = loadImage(IMAGE_PATH_CHATTER_HEAD);
    state.images[IMAGE_PATH_CHATTER_BODY] = loadImage(IMAGE_PATH_CHATTER_BODY);
    state.images[IMAGE_PATH_EYES] = loadImage(IMAGE_PATH_EYES);
    state.images[IMAGE_PATH_PUPILS] = loadImage(IMAGE_PATH_PUPILS);
    state.images[IMAGE_PATH_DOG_PAWS] = loadImage(IMAGE_PATH_DOG_PAWS);
    state.images[IMAGE_PATH_CHEF_HEAD] = loadImage(IMAGE_PATH_CHEF_HEAD);
    state.images[IMAGE_PATH_OVEN] = loadImage(IMAGE_PATH_OVEN);
}

export function drawChatterDogAndMessages(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State) {
    drawChatterDog(ctx, chatter, state);
    drawDogChatMessages(ctx, chatter, state);
}

function drawDogChatMessages(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State) {
    const fontSize = state.config.fontSize;
    ctx.font = `bold ${fontSize}px Arial`;
    if (chatter.chatMessages.length === 0 || chatter.state !== "sitting") return;
    drawChatBubble(ctx, chatter, state);
    const charPerSeconds = 10;
    for (let i = chatter.chatMessages.length - 1; i >= 0; i--) {
        const message = chatter.chatMessages[i];
        const timePassed = performance.now() - message.receiveTime;
        const charCounter = Math.ceil(timePassed / 1000 * charPerSeconds);
        let text = message.message;
        if (message.message.length > charCounter) text = text.substring(0, charCounter);
        drawTextWithOutline(ctx, text, chatter.posX, ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT - (chatter.chatMessages.length - i) * fontSize);
    }
}

function drawChatBubble(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State) {
    const fontSize = state.config.fontSize;
    let maxWidthChatMessage = 0;
    for (let message of chatter.chatMessages) {
        const tempWidth = ctx.measureText(message.message).width;
        if (tempWidth > maxWidthChatMessage) maxWidthChatMessage = tempWidth;
    }
    const chatBubbleWidth = maxWidthChatMessage;
    const chatBubbleHeight = chatter.chatMessages.length * fontSize;
    ctx.fillStyle = "lightgray";
    ctx.strokeStyle = "black";
    ctx.beginPath();
    const lineWidth = 2;
    ctx.lineWidth = lineWidth;
    const bottom = ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT - fontSize + lineWidth;
    const top = bottom - chatBubbleHeight - lineWidth * 2;
    const left = chatter.posX - lineWidth;
    const right = left + chatBubbleWidth + lineWidth * 2;
    const cornerSize = 5;
    const pointerSize = 25;
    ctx.moveTo(left, bottom - cornerSize);
    ctx.lineTo(left, top + cornerSize);
    ctx.quadraticCurveTo(left, top, left + cornerSize, top);
    ctx.lineTo(right - cornerSize, top);
    ctx.quadraticCurveTo(right, top, right, top + cornerSize);
    ctx.lineTo(right, bottom - cornerSize);
    ctx.quadraticCurveTo(right, bottom, right - cornerSize, bottom);
    ctx.lineTo(left + pointerSize, bottom);
    ctx.quadraticCurveTo(left + Math.floor(pointerSize / 2), bottom, left + Math.floor(pointerSize / 2), bottom + pointerSize);
    ctx.quadraticCurveTo(left, bottom, left, bottom - cornerSize);
    ctx.fill();
    ctx.stroke();
}

function drawChatterDog(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State) {
    const chatterDogHead = state.images[IMAGE_PATH_CHATTER_HEAD];
    const chatterDogBody = state.images[IMAGE_PATH_CHATTER_BODY];
    if (!chatterDogHead?.complete || !chatterDogBody?.complete) return;
    let walkingCycle = Math.floor(performance.now() / 250) % 4;
    if (walkingCycle === 3) walkingCycle = 1;
    switch (chatter.state) {
        case "sitting":
            const headX = chatter.posX + 5;
            const headY = ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT - 10;
            ctx.drawImage(chatterDogBody, 0, 0, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT, chatter.posX, ctx.canvas.height - CHATTER_IMAGE_HEIGHT + chatter.posY + 40, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT);
            ctx.drawImage(chatterDogHead, 0, 0, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT, headX, headY, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT);
            drawEyes(ctx, chatter, state);
            if (chatter.draw.pawAnimation === "bake cookies") {
                const chefHeadImage = state.images[IMAGE_PATH_CHEF_HEAD];
                ctx.drawImage(chefHeadImage, 0, 0, 100, 100, chatter.posX + 50, ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT - 25, 100, 100);
            }
            drawChatterDogMouth(ctx, chatter, state);
            drawOutfit(ctx, chatter, state, headX, headY);
            drawPaws(ctx, chatter, state);
            break;
        case "joining":
            ctx.drawImage(chatterDogBody, CHATTER_IMAGE_WIDTH * (1 + walkingCycle), 0, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT, chatter.posX, ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT + 40, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT);
            ctx.drawImage(chatterDogHead, CHATTER_IMAGE_WIDTH, 0, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT, chatter.posX + 35, ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT - 10, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT);
            break;
        case "sleeping":
            ctx.drawImage(chatterDogHead, CHATTER_IMAGE_WIDTH * 2, 0, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT, chatter.posX - 12, ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT - 10, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT);
            ctx.drawImage(chatterDogBody, CHATTER_IMAGE_WIDTH * 4, 0, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT, chatter.posX, ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT + 40, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT);
            break;
        case "leaving":
            ctx.drawImage(chatterDogBody, CHATTER_IMAGE_WIDTH * (5 + walkingCycle), 0, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT, chatter.posX, ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT + 40, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT);
            ctx.drawImage(chatterDogHead, CHATTER_IMAGE_WIDTH * 3, 0, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT, chatter.posX - 60, ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT - 10, CHATTER_IMAGE_WIDTH, CHATTER_IMAGE_HEIGHT);
            break;
    }

    const fontSize = state.config.fontSize;
    ctx.font = `bold ${fontSize}px Arial`;
    drawTextWithOutline(ctx, chatter.name, chatter.posX, ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT + 30);

    if (chatter.state === "sleeping") {
        const timer = performance.now() / 300;
        const swingRadius = 10;
        const offsetY = -fontSize * ((Math.sin(timer) + 1) / 2);
        drawTextWithOutline(ctx, "z", chatter.posX + CHATTER_IMAGE_WIDTH / 2 + Math.floor(Math.sin(timer) * swingRadius), ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT + offsetY);
        drawTextWithOutline(ctx, "Z", chatter.posX + CHATTER_IMAGE_WIDTH / 2 + 5 + Math.floor(Math.sin(timer + 1) * swingRadius), ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT + offsetY - fontSize);
        drawTextWithOutline(ctx, "Z", chatter.posX + CHATTER_IMAGE_WIDTH / 2 + 10 + Math.floor(Math.sin(timer + 2) * swingRadius), ctx.canvas.height + chatter.posY - CHATTER_IMAGE_HEIGHT + offsetY - fontSize * 2);
    }
}

function calcPaintValues(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State): ChatterDogPaintValues {
    const pawDogOffsetX = 86;
    const pawDogOffsetY = 60;
    const pawsTopY = ctx.canvas.height + chatter.posY - pawDogOffsetY;
    const pawsMiddleX = chatter.posX + pawDogOffsetX;
    const pawOffsetX = 11;
    const pawWidth = 20;
    const rotatePawRightX = pawsMiddleX + 21;
    const rotatePawLeftX = pawsMiddleX - 3;
    const rotatePawY = pawsTopY + 8;
    return {
        pawDogOffsetX, pawDogOffsetY, pawsTopY, pawsMiddleX, pawOffsetX, pawWidth, rotatePawRightX, rotatePawLeftX, rotatePawY
    };
}

function drawPaws(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State) {
    const chatterDogPaws = state.images[IMAGE_PATH_DOG_PAWS];
    const paintValues = calcPaintValues(ctx, chatter, state);
    if (chatter.draw.pawAnimation === "sit") {
        ctx.drawImage(chatterDogPaws, 0, 0, paintValues.pawWidth, 60, paintValues.pawsMiddleX - paintValues.pawOffsetX, paintValues.pawsTopY, paintValues.pawWidth, 60);
        ctx.drawImage(chatterDogPaws, paintValues.pawWidth, 0, paintValues.pawWidth, 60, paintValues.pawsMiddleX + paintValues.pawOffsetX, paintValues.pawsTopY, paintValues.pawWidth, 60);
    } else {
        if (chatter.draw.pawAnimationStart === undefined) {
            chatter.draw.pawAnimationStart = performance.now();
        }
        const timePassed = performance.now() - chatter.draw.pawAnimationStart;
        if (timePassed < 0) {
            chatter.draw.pawAnimationStart = undefined;
            return;
        }
        commandDrawPaw(ctx, chatter, state, paintValues, timePassed);
    }
}

export function chatterDogDrawClap(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number, slowClap: boolean) {
    let rotationValue = 0;
    const clapToPositionTime = 500;
    let clappingDuration = 4400;
    let clapInterval = 50;
    if (slowClap) {
        clapInterval = 400;
        clappingDuration = 6200;
    }
    if (timePassed < clapToPositionTime) {
        rotationValue = (timePassed / 250);
    } else if (timePassed < clapToPositionTime + clappingDuration) {
        const clapMiddleAngle = 2.5;
        const sin = Math.sin((timePassed - clapToPositionTime) / clapInterval);
        rotationValue = clapMiddleAngle + sin;
        if (sin > 0.8 && !chatter.draw.pawAnimationSoundPlayed) {
            chatter.draw.pawAnimationSoundPlayed = true;
            chatter.sound.lastClapIndex = playSoundRandomClapping(state, chatter.sound.lastClapIndex);
        } else if (sin < 0.2) {
            chatter.draw.pawAnimationSoundPlayed = undefined;
        }

    } else if (timePassed < clapToPositionTime * 2 + clappingDuration) {
        rotationValue = 2.5 - (timePassed - clapToPositionTime - clappingDuration) / 250;
    } else {
        rotationValue = 0;
        resetToSitting(chatter, state);
    }
    drawPawsWithAngles(ctx, paintValues, rotationValue, -rotationValue, 1, 1, state);
}

export function drawPawsWithAngles(ctx: CanvasRenderingContext2D, paintValues: ChatterDogPaintValues, rotationValueLeft: number, rotationValueRight: number, pawLengthScalingLeft: number, pawLengthScalingRight: number, state: State) {
    const chatterDogPaws = state.images[IMAGE_PATH_DOG_PAWS];
    ctx.save();
    ctx.translate(paintValues.rotatePawLeftX, paintValues.rotatePawY);
    ctx.rotate(rotationValueLeft);
    ctx.translate(-paintValues.rotatePawLeftX, -paintValues.rotatePawY);
    ctx.drawImage(chatterDogPaws, 0, 0, paintValues.pawWidth, 60, paintValues.pawsMiddleX - paintValues.pawOffsetX, paintValues.pawsTopY, paintValues.pawWidth, 60 * pawLengthScalingLeft);
    ctx.restore();

    ctx.save();
    ctx.translate(paintValues.rotatePawRightX, paintValues.rotatePawY);
    ctx.rotate(rotationValueRight);
    ctx.translate(-paintValues.rotatePawRightX, -paintValues.rotatePawY);
    ctx.drawImage(chatterDogPaws, paintValues.pawWidth, 0, paintValues.pawWidth, 60, paintValues.pawsMiddleX + paintValues.pawOffsetX, paintValues.pawsTopY, paintValues.pawWidth, 60 * pawLengthScalingRight);
    ctx.restore();

}

function drawChatterDogMouth(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State) {
    const mouthOffsetX = 101;
    const mouthOffsetY = 90;
    const mouthTopY = ctx.canvas.height + chatter.posY - mouthOffsetY;
    const mouthMiddleX = chatter.posX + mouthOffsetX;
    const mouthWidht = 30;

    ctx.strokeStyle = "black";
    ctx.lineWidth = 1;
    if (chatter.draw.mouthAnimation === "closed") {
        ctx.beginPath();
        ctx.moveTo(mouthMiddleX - mouthWidht / 2, mouthTopY);
        ctx.quadraticCurveTo(mouthMiddleX, mouthTopY + 15, mouthMiddleX + mouthWidht / 2, mouthTopY);
        ctx.stroke();
    } else if (chatter.draw.mouthAnimation === "eating") {
        ctx.beginPath();
        ctx.moveTo(mouthMiddleX - mouthWidht / 2, mouthTopY);
        let mouthOpenValue = 10 * (Math.sin(performance.now() / 100) + 1) / 2;
        ctx.quadraticCurveTo(mouthMiddleX, mouthTopY + mouthOpenValue + 2, mouthMiddleX + mouthWidht / 2, mouthTopY);
        ctx.quadraticCurveTo(mouthMiddleX, mouthTopY - mouthOpenValue + 2, mouthMiddleX - mouthWidht / 2, mouthTopY);
        ctx.stroke();
    }
}

export function resetToSitting(chatter: Chatter, state: State) {
    chatter.draw.pawAnimation = "sit";
    chatter.draw.pawAnimationStart = undefined;
    chatter.draw.pawAnimationSoundPlayed = undefined;
    chatter.draw.mouthAnimation = "closed";
    localStorageStoreChatters(state);
}

function drawEyes(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State) {
    const eyesY = ctx.canvas.height + chatter.posY - 140;
    const eyesX = chatter.posX + 90;
    const pupilsOffsetX = 10;
    const pupilsOffsetY = 5;
    const eyes = state.images[IMAGE_PATH_EYES];
    const pupils = state.images[IMAGE_PATH_PUPILS];
    if (!eyes?.complete || !pupils?.complete) return;
    let blinkingFactor = 1;
    if (chatter.draw.blinkStartedTime !== undefined) {
        const timePassedSinceBlinkStart = performance.now() - chatter.draw.blinkStartedTime;
        blinkingFactor = Math.max(Math.abs(timePassedSinceBlinkStart - BLINK_DURATION / 2) / (BLINK_DURATION / 2), 0.2);
    }
    ctx.drawImage(pupils, 0, 0, 9, 8, eyesX - 15 + pupilsOffsetX + chatter.draw.pupilX, eyesY + pupilsOffsetY + chatter.draw.pupilY * blinkingFactor, 9, 8 * blinkingFactor);
    ctx.drawImage(pupils, 9, 0, 9, 8, eyesX + 15 + pupilsOffsetX + chatter.draw.pupilX, eyesY + pupilsOffsetY + chatter.draw.pupilY * blinkingFactor, 9, 8 * blinkingFactor);
    ctx.drawImage(eyes, 0, 0, 30, 16, eyesX - 15, eyesY + 8 * (1 - blinkingFactor), 30, 16 * blinkingFactor);
    ctx.drawImage(eyes, 30, 0, 30, 16, eyesX + 15, eyesY + 8 * (1 - blinkingFactor), 30, 16 * blinkingFactor);
    if (chatter.draw.nextPupilMoveTime < performance.now()) {
        chatter.draw.nextPupilMoveTime = performance.now() + 1500;
        chatter.draw.pupilMoveToX = Math.floor(Math.random() * 16 - 8);
        chatter.draw.pupilMoveToY = Math.floor(Math.random() * 6 - 3);
    }
    if (chatter.draw.pupilMoveToX !== undefined) {
        chatter.draw.pupilX += (chatter.draw.pupilMoveToX - chatter.draw.pupilX) / 20;
        if (Math.abs(chatter.draw.pupilMoveToX - chatter.draw.pupilX) < 2) {
            chatter.draw.pupilX = chatter.draw.pupilMoveToX;
            chatter.draw.pupilMoveToX = undefined;
        }
    }
    if (chatter.draw.pupilMoveToY !== undefined) {
        chatter.draw.pupilY += (chatter.draw.pupilMoveToY - chatter.draw.pupilY) / 20;
        if (Math.abs(chatter.draw.pupilMoveToY - chatter.draw.pupilY) < 2) {
            chatter.draw.pupilY = chatter.draw.pupilMoveToY;
            chatter.draw.pupilMoveToY = undefined;
        }
    }
    if (chatter.draw.blinkStartedTime === undefined) {
        if (Math.random() < 0.005) {
            chatter.draw.blinkStartedTime = performance.now();
        }
    } else if (chatter.draw.blinkStartedTime + BLINK_DURATION < performance.now()) {
        chatter.draw.blinkStartedTime = undefined;
    }
}
