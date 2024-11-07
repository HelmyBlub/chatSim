import { drawTextWithOutline, IMAGE_PATH_COOKIE, IMAGE_PATH_OVEN, IMAGE_PATH_UNBAKED_COOKIE } from "./draw.js";
import { Chatter, Game, State } from "./mainModels.js"
import { GAME_FUNCTIONS } from "./tick.js";


const GAME_COOKIE_OVEN = "CookieOven";

export type GameCookieOven = Game & {
    cookieAmount: number,
    maxCookies: number,
    bakingStartedTime?: number,
    bakeDuration: number,
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
        players: [],
        id,
        cookieAmount: 0,
        bakeDuration: 6000,
        maxCookies: 24,
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
}

function draw(ctx: CanvasRenderingContext2D, game: Game, leftX: number, topY: number, state: State) {
    const ovenGame = game as GameCookieOven;
    const ovenImage = state.images[IMAGE_PATH_OVEN];
    let clipPath: Path2D;
    if (ovenGame.bakingStartedTime !== undefined) {
        ctx.drawImage(ovenImage, 0, 0, 200, 200, leftX, topY, 200, 200);
        clipPath = getClosedOvenClipPath(leftX, topY);
    } else {
        ctx.drawImage(ovenImage, 200, 0, 200, 200, leftX, topY, 200, 200);
        clipPath = getOpenOvenClipPath(leftX, topY);
    }
    const cookiesPerRowInOven = 6;

    let cookieImage = state.images[IMAGE_PATH_UNBAKED_COOKIE];
    if (ovenGame.bakingStartedTime !== undefined) {
        const cookingTimer = Math.floor((ovenGame.bakeDuration + ovenGame.bakingStartedTime - performance.now()) / 1000);
        ctx.font = "20px Arial";
        drawTextWithOutline(ctx, cookingTimer.toString(), leftX, topY - 26);
        if (cookingTimer <= 0) {
            cookieImage = state.images[IMAGE_PATH_COOKIE];
        }
    }
    ctx.save()
    ctx.clip(clipPath);
    for (let i = 0; i < ovenGame.cookieAmount; i++) {
        const offsetX = (i % cookiesPerRowInOven) * 20 + 30;
        const offsetY = -(Math.floor(i / cookiesPerRowInOven)) * 20 + 120;
        ctx.drawImage(cookieImage, 0, 0, 80, 80, leftX + offsetX, topY + offsetY, 40, 40);
    }
    ctx.restore();
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
