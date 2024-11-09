import { IMAGE_PATH_COOKIE, IMAGE_PATH_OVEN, IMAGE_PATH_UNBAKED_COOKIE } from "./draw.js";
import { Chatter, Game, State } from "./mainModels.js"
import { GAME_FUNCTIONS } from "./tick.js";


const GAME_COOKIE_OVEN = "CookieOven";

export type GameCookieOven = Game & {
    cookieAmount: number,
    maxCookies: number,
    bakingStartedTime?: number,
    bakeDuration: number,
    cookiesPutIntoJar?: boolean,
    delayPutIntoJarWhenFinished: number,
}

export function addGameFunctionsCookieOven() {
    GAME_FUNCTIONS[GAME_COOKIE_OVEN] = {
        handleStartMessage: handleStartMessage,
        handleChatCommand: handleChatCommand,
        tick: tick,
        draw: draw,
    }
}

export function addCookieToOvenGame(state: State): GameCookieOven {
    let cookieOvenGame = state.gamesData.games.find(g => g.name === GAME_COOKIE_OVEN) as GameCookieOven;
    if (!cookieOvenGame) {
        cookieOvenGame = createGameCookieOven(state.gamesData.gameIdCounter++);
        state.gamesData.games.push(cookieOvenGame);
    }
    if (cookieOvenGame.cookieAmount < cookieOvenGame.maxCookies) {
        cookieOvenGame.cookieAmount++;
        if (cookieOvenGame.cookieAmount >= cookieOvenGame.maxCookies) {
            if (cookieOvenGame.bakingStartedTime === undefined) cookieOvenGame.bakingStartedTime = performance.now();
        }
    }

    return cookieOvenGame;
}

function createGameCookieOven(id: number): GameCookieOven {
    return {
        name: GAME_COOKIE_OVEN,
        id,
        cookieAmount: 0,
        bakeDuration: 60000,
        maxCookies: 24,
        delayPutIntoJarWhenFinished: 5000,
    }
}

function handleStartMessage(chatter: Chatter, state: State) {
}

function handleChatCommand(game: Game, chatter: Chatter, message: string, state: State): boolean {
    const ovenGame = game as GameCookieOven;
    return false;
}

function tick(game: Game, state: State) {
    const ovenGame = game as GameCookieOven;
    if (ovenGame.bakingStartedTime !== undefined && ovenGame.bakeDuration + ovenGame.bakingStartedTime + 3000 < performance.now() && ovenGame.finishedTime === undefined) {
        ovenGame.finishedTime = performance.now();
    }
    if (!ovenGame.cookiesPutIntoJar && ovenGame.finishedTime !== undefined && ovenGame.finishedTime + ovenGame.delayPutIntoJarWhenFinished < performance.now()) {
        state.gamesData.cookieGame.cookieCounter += ovenGame.cookieAmount;
        ovenGame.cookiesPutIntoJar = true;
    }
}

function draw(ctx: CanvasRenderingContext2D, game: Game, leftX: number, topY: number, state: State) {
    const ovenGame = game as GameCookieOven;
    const ovenImage = state.images[IMAGE_PATH_OVEN];
    let clipPath: Path2D;
    if (ovenGame.bakingStartedTime !== undefined && ovenGame.finishedTime === undefined) {
        ctx.drawImage(ovenImage, 0, 0, 200, 200, leftX, topY, 200, 200);
        clipPath = getClosedOvenClipPath(leftX, topY);
    } else {
        ctx.drawImage(ovenImage, 200, 0, 200, 200, leftX, topY, 200, 200);
        clipPath = getOpenOvenClipPath(leftX, topY);
    }
    const cookiesPerRowInOven = 6;

    let cookieImage = state.images[IMAGE_PATH_UNBAKED_COOKIE];
    let srcOffsetY = 0;
    if (ovenGame.bakingStartedTime !== undefined) {
        const cookingTimer = Math.floor((ovenGame.bakeDuration + ovenGame.bakingStartedTime - performance.now()) / 1000);
        ctx.font = "20px Arial";
        drawTextWithOutline(ctx, cookingTimer.toString(), leftX, topY - 26);
        if (cookingTimer <= 0) cookieImage = state.images[IMAGE_PATH_COOKIE];
        if (cookingTimer <= -ovenGame.bakeDuration / 2000) srcOffsetY = 80;
    }
    if (ovenGame.finishedTime === undefined) {
        ctx.save()
        ctx.clip(clipPath);
        for (let i = 0; i < ovenGame.cookieAmount; i++) {
            const offsetX = (i % cookiesPerRowInOven) * 20 + 30;
            const offsetY = -(Math.floor(i / cookiesPerRowInOven)) * 20 + 120;
            ctx.drawImage(cookieImage, 0, 0 + srcOffsetY, 80, 80, leftX + offsetX, topY + offsetY, 40, 40);
        }
        ctx.restore();
    } else if (state.gamesData.cookieGame.cookieJarX && state.gamesData.cookieGame.cookieJarY) {
        const targetX = state.gamesData.cookieGame.cookieJarX + 80;
        const targetY = state.gamesData.cookieGame.cookieJarY + 20;
        const timeFactor = (ovenGame.finishedTime + ovenGame.delayPutIntoJarWhenFinished - performance.now()) / ovenGame.delayPutIntoJarWhenFinished;
        if (timeFactor > 0) {
            for (let i = 0; i < ovenGame.cookieAmount; i++) {
                const offsetX = (i % cookiesPerRowInOven) * 20 + 30;
                const offsetY = -(Math.floor(i / cookiesPerRowInOven)) * 20 + 120;
                const cookieX = (leftX + offsetX) * timeFactor + targetX * (1 - timeFactor);
                const cookieY = (topY + offsetY) * timeFactor + targetY * (1 - timeFactor);
                ctx.drawImage(cookieImage, 0, 0, 80, 80, cookieX, cookieY, 40, 40);
            }
        }
    }
}

function getOpenOvenClipPath(leftX: number, topY: number): Path2D {
    const path = new Path2D();
    path.rect(leftX + 36, topY + 58, 122, 95);
    return path;
}

function getClosedOvenClipPath(leftX: number, topY: number): Path2D {
    const path = new Path2D();
    path.moveTo(leftX + 37, topY + 90);
    path.quadraticCurveTo(leftX + 37, topY + 77, leftX + 50, topY + 77);
    path.lineTo(leftX + 130, topY + 77);
    path.quadraticCurveTo(leftX + 140, topY + 77, leftX + 140, topY + 90);
    path.lineTo(leftX + 140, topY + 135);
    path.quadraticCurveTo(leftX + 140, topY + 145, leftX + 130, topY + 145);
    path.lineTo(leftX + 45, topY + 145);
    path.quadraticCurveTo(leftX + 37, topY + 145, leftX + 37, topY + 132);
    path.lineTo(leftX + 37, topY + 90);
    return path;
}
function drawTextWithOutline(ctx: CanvasRenderingContext2D, arg1: string, leftX: number, arg3: number) {
    throw new Error("Function not implemented.");
}

