import { drawChatterDogAndMessages, loadChatterDogImages } from "./drawChatterDog.js";
import { State } from "./mainModels.js";
import { GAME_FUNCTIONS } from "./tick.js";
import { GAME_TIC_TAC_TOE } from "./gameTicTacToe.js";
import { loadOutfitImages } from "./outfits.js";
import { drawTextWithOutline, drawTextWithBackgroundAndOutline, loadImage } from "../drawHelper.js";

export const IMAGE_PATH_COOKIE = "images/cookie.png";
export const IMAGE_PATH_OVEN = "images/oven.png";
export const IMAGE_PATH_UNBAKED_COOKIE = "images/unbakedCookie.png";
const IMAGE_PATH_UNLABLED_JAR = "images/unlabledJar.png";


export function loadImages(state: State) {
    loadChatterDogImages(state);
    loadOutfitImages(state);
    state.images[IMAGE_PATH_COOKIE] = loadImage(IMAGE_PATH_COOKIE);
    state.images[IMAGE_PATH_UNLABLED_JAR] = loadImage(IMAGE_PATH_UNLABLED_JAR);
    state.images[IMAGE_PATH_OVEN] = loadImage(IMAGE_PATH_OVEN);
    state.images[IMAGE_PATH_UNBAKED_COOKIE] = loadImage(IMAGE_PATH_UNBAKED_COOKIE);
}

export function draw(state: State) {
    let canvas = state.canvas!;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    drawCommandInfo(ctx);

    for (let chatter of state.chatters) {
        drawChatterDogAndMessages(ctx, chatter, state);
    }
    drawGames(ctx, state);
    drawCookieJar(ctx, state);
    //drawFrameRate(ctx, state);
}

function drawCookieJar(ctx: CanvasRenderingContext2D, state: State) {
    const jarImage = state.images[IMAGE_PATH_UNLABLED_JAR];
    const cookieImage = state.images[IMAGE_PATH_COOKIE];
    ctx.font = `bold ${state.config.fontSize}px Arial`;
    const cookieGame = state.gamesData.cookieGame;
    if (cookieGame.cookieJarX === undefined || cookieGame.cookieJarY === undefined) {
        cookieGame.cookieJarX = ctx.canvas.width - 550;
        cookieGame.cookieJarY = ctx.canvas.height - 169;
    }

    let cookieJarPath = new Path2D();
    cookieJarPath.moveTo(cookieGame.cookieJarX + 33, cookieGame.cookieJarY + 67);
    cookieJarPath.quadraticCurveTo(cookieGame.cookieJarX + 33, cookieGame.cookieJarY + 50, cookieGame.cookieJarX + 57, cookieGame.cookieJarY + 51);
    cookieJarPath.lineTo(cookieGame.cookieJarX + 160, cookieGame.cookieJarY + 52);
    cookieJarPath.lineTo(cookieGame.cookieJarX + 168, cookieGame.cookieJarY + 63);
    cookieJarPath.lineTo(cookieGame.cookieJarX + 162, cookieGame.cookieJarY + 162);
    cookieJarPath.quadraticCurveTo(cookieGame.cookieJarX + 100, cookieGame.cookieJarY + 170, cookieGame.cookieJarX + 35, cookieGame.cookieJarY + 161);
    cookieJarPath.lineTo(cookieGame.cookieJarX + 33, cookieGame.cookieJarY + 67)
    ctx.save();
    ctx.clip(cookieJarPath);
    for (let i = 0; i < Math.min(cookieGame.cookieCounter, 40); i++) {
        ctx.drawImage(cookieImage, 0, 0, 80, 80, cookieGame.cookieJarX + 20 + (i % 7) * 20, cookieGame.cookieJarY + 120 - (Math.floor(i / 7) * 20), 60, 60);
    }
    ctx.restore();
    ctx.drawImage(jarImage, 0, 0, 200, 200, cookieGame.cookieJarX, cookieGame.cookieJarY, 200, 200);
    ctx.font = `bold 20px Arial`;
    drawTextWithOutline(ctx, "Cookie Jar", cookieGame.cookieJarX + 45, cookieGame.cookieJarY + 115);
    if (cookieGame.cookieCounter > 30) {
        ctx.font = `bold ${state.config.fontSize}px Arial`;
        drawTextWithBackgroundAndOutline(ctx, cookieGame.cookieCounter.toString(), cookieGame.cookieJarX + 75, cookieGame.cookieJarY + 25, 0.7);
    }
}

function drawGames(ctx: CanvasRenderingContext2D, state: State) {
    for (let i = 0; i < state.gamesData.games.length; i++) {
        const game = state.gamesData.games[i];
        GAME_FUNCTIONS[game.name].draw(ctx, game, 20 + i * 400, 120, state);
    }
}

function drawFrameRate(ctx: CanvasRenderingContext2D, state: State) {
    if (state.frameRateCounter === undefined) return;
    ctx.font = "bold 26px Arial";
    const text = `FPS: ${state.frameRateCounter.length}`;
    drawTextWithOutline(ctx, text, 20, 30);
}

function drawCommandInfo(ctx: CanvasRenderingContext2D) {
    const cornerOffset = 10;
    const fontSize = 26;
    const headingText = "Chat Chatter Commands:";
    const textList: string[] = [
        "clap",
        "leave",
        "sleep",
        "NotLikeThis",
        "Kappa",
        "HeyGuys",
        GAME_TIC_TAC_TOE,
        "eatCookie",
        "bake cookies",
        "sunglasses"
    ];

    ctx.font = `bold ${fontSize}px Arial`;
    drawTextWithOutline(ctx, headingText, ctx.canvas.width - 340 - cornerOffset, cornerOffset + fontSize);
    ctx.font = `${fontSize}px Arial`;
    let maxWidth = 0;
    for (let text of textList) {
        const tempWidth = ctx.measureText(text).width;
        if (tempWidth > maxWidth) maxWidth = tempWidth;
    }
    const left = ctx.canvas.width - 250 - cornerOffset;
    const top = cornerOffset + fontSize + 5;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "white";
    ctx.fillRect(left - 5, top, maxWidth + 10, textList.length * fontSize + 5);
    ctx.beginPath();
    ctx.rect(left - 5, top, maxWidth + 10, textList.length * fontSize + 5);
    ctx.strokeStyle = "black";
    ctx.stroke();
    ctx.globalAlpha = 1;
    for (let i = 0; i < textList.length; i++) {
        const command = textList[i];
        drawTextWithOutline(ctx, command, left, top + fontSize * (i + 1));
    }
}
