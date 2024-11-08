import { drawTextWithBackgroundAndOutline } from "./draw.js";
import { Game, Chatter, State } from "./mainModels.js";
import { GAME_FUNCTIONS } from "./tick.js";


export const GAME_TIC_TAC_TOE = "TicTacToe"
export type GameTicTacToe = Game & {
    field: number[][],
    currentPlayersTurnIndex: number,
    players: Chatter[],
    turnTimer: number,
    turnTime: number,
}

export function addGameFunctionsTicTacToe() {
    GAME_FUNCTIONS[GAME_TIC_TAC_TOE] = {
        handleStartMessage: handleStartMessage,
        handleChatCommand: handleChatCommand,
        tick: tick,
        draw: draw,
    }
}

function handleStartMessage(chatter: Chatter, state: State) {
    if (chatter.playingGameIdRef !== undefined) {
        const chattersGame = state.gamesData.games.find((g) => g.id === chatter.playingGameIdRef);
        if (chatter.name !== state.streamerName && chattersGame && chattersGame.players && chattersGame.players.find(p => p === chatter)) return;
        chatter.playingGameIdRef = undefined;
    }
    for (let game of state.gamesData.games) {
        if (game.name === GAME_TIC_TAC_TOE) {
            const ticTacToeGame = game as GameTicTacToe;
            if (ticTacToeGame.finishedTime === undefined && ticTacToeGame.players.length < 2) {
                ticTacToeGame.players.push(chatter);
                ticTacToeGame.turnTimer = performance.now();
                chatter.playingGameIdRef = game.id;
                return;
            }
        }
    }
    if (state.gamesData.maxGames <= state.gamesData.games.length) return;
    const ticTacToe = createGameTicTacToe(chatter, state.gamesData.gameIdCounter++);
    state.gamesData.games.push(ticTacToe);
    chatter.playingGameIdRef = ticTacToe.id;
}

/**
 * @returns return true if it is a ticTacToe command
 */
function handleChatCommand(game: Game, chatter: Chatter, message: string, state: State): boolean {
    if (chatter.playingGameIdRef === undefined) return false;
    if (game.name !== GAME_TIC_TAC_TOE) {
        chatter.playingGameIdRef = undefined;
        return false;
    }
    const ticTacToeGame = game as GameTicTacToe;
    if (ticTacToeGame.winner) return false;
    if (ticTacToeGame.players[ticTacToeGame.currentPlayersTurnIndex] !== chatter) return false;
    let validTurn = false;
    const playPos = guessChatterPlayPosition(message);
    if (playPos) {
        if (ticTacToeGame.field[playPos.x][playPos.y] === -1) {
            ticTacToeGame.field[playPos.x][playPos.y] = ticTacToeGame.currentPlayersTurnIndex;
            validTurn = true;
        }
    }
    if (!validTurn) return false;
    checkWinCondition(ticTacToeGame);
    ticTacToeGame.turnTimer = performance.now();
    ticTacToeGame.currentPlayersTurnIndex = (ticTacToeGame.currentPlayersTurnIndex + 1) % 2;
    return true;
}

function tick(game: Game, state: State) {
    const ticTacToe = game as GameTicTacToe;
    //check turn timer
    if (ticTacToe.finishedTime !== undefined) return;
    if (ticTacToe.players.length === 2 && ticTacToe.turnTimer - performance.now() + ticTacToe.turnTime < 0) {
        ticTacToe.winner = ticTacToe.players[(ticTacToe.currentPlayersTurnIndex + 1) % 2];
        ticTacToe.finishedTime = performance.now();
        return;
    }
    // check if player still exists
    for (let player of ticTacToe.players) {
        const chatter = state.chatters.find(c => c === player);
        if (!chatter) {
            if (ticTacToe.players.length === 2) {
                ticTacToe.winner = ticTacToe.players[(ticTacToe.currentPlayersTurnIndex + 1) % 2];
                ticTacToe.finishedTime = performance.now();
            } else {
                ticTacToe.finishedTime = performance.now();
            }
        }
    }
}

function draw(ctx: CanvasRenderingContext2D, game: Game, leftX: number, topY: number) {
    if (game.name !== GAME_TIC_TAC_TOE) return;
    const ticTacToeGame = game as GameTicTacToe;
    const fontSize = 26;
    ctx.font = `bold ${fontSize}px Arial`;
    const aplha = 0.7;
    if (ticTacToeGame.winner) {
        const text = `Winner: ${ticTacToeGame.winner.name}`;
        drawTextWithBackgroundAndOutline(ctx, text, leftX, topY - fontSize, aplha);
    } else {
        if (ticTacToeGame.players.length < 2) {
            const text = `${ticTacToeGame.players[0].name} is waiting for an apponent.`;
            const text2 = `Write "${GAME_TIC_TAC_TOE}" to join`;
            drawTextWithBackgroundAndOutline(ctx, text, leftX, topY - fontSize * 2, aplha);
            drawTextWithBackgroundAndOutline(ctx, text2, leftX, topY - fontSize, aplha);
        } else {
            const text = `${ticTacToeGame.players[0].name} vs ${ticTacToeGame.players[1].name}`;
            const timer = Math.floor((ticTacToeGame.turnTimer - performance.now() + ticTacToeGame.turnTime) / 1000);
            const text2 = `${ticTacToeGame.players[ticTacToeGame.currentPlayersTurnIndex].name} turn. ${timer}s left`;
            drawTextWithBackgroundAndOutline(ctx, text, leftX, topY - fontSize * 2, aplha);
            drawTextWithBackgroundAndOutline(ctx, text2, leftX, topY - fontSize, aplha);
        }
    }

    const size = 200;
    ctx.globalAlpha = 0.7;
    ctx.fillStyle = "white";
    ctx.fillRect(leftX, topY, size, size);
    ctx.globalAlpha = 1;
    ctx.strokeStyle = "black";
    ctx.lineWidth = 3;
    const cellSize = Math.floor(size / 3);
    //horizontal lines
    for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(leftX, topY + cellSize * i);
        ctx.lineTo(leftX + size, topY + cellSize * i);
        ctx.stroke();
    }
    //vertical lines
    for (let i = 1; i < 3; i++) {
        ctx.beginPath();
        ctx.moveTo(leftX + cellSize * i, topY);
        ctx.lineTo(leftX + cellSize * i, topY + size);
        ctx.stroke();
    }

    const makerSize = Math.floor(cellSize * 0.75);
    const markerCellOffset = Math.floor(cellSize * 0.12);
    for (let x = 0; x < 3; x++) {
        for (let y = 0; y < 3; y++) {
            ctx.beginPath();
            if (ticTacToeGame.field[x][y] === 0) {
                ctx.rect(leftX + cellSize * x + markerCellOffset, topY + cellSize * y + markerCellOffset, makerSize, makerSize);
            } else if (ticTacToeGame.field[x][y] === 1) {
                ctx.arc(leftX + cellSize * x + Math.floor(cellSize / 2), topY + cellSize * y + Math.floor(cellSize / 2), makerSize / 2, 0, Math.PI * 2);
            }
            ctx.stroke();
        }
    }
}

function createGameTicTacToe(player1: Chatter, id: number): GameTicTacToe {
    return {
        field: [
            [-1, -1, -1],
            [-1, -1, -1],
            [-1, -1, -1],
        ],
        players: [player1],
        id: id,
        name: GAME_TIC_TAC_TOE,
        currentPlayersTurnIndex: 0,
        turnTimer: 0,
        turnTime: 60000,
    }
}

function guessChatterPlayPosition(message: string): { x: number, y: number } | undefined {
    let x: number | undefined = undefined;
    let y: number | undefined = undefined;
    if (message.indexOf("left") !== -1) {
        x = 0;
    }
    if (message.indexOf("right") !== -1) {
        if (x === undefined) {
            x = 2;
        } else {
            return undefined;
        }
    }
    if (message.indexOf("top") !== -1 || message.indexOf("up") !== -1) {
        y = 0;
    }
    if (message.indexOf("bottom") !== -1 || message.indexOf("down") !== -1) {
        if (y === undefined) {
            y = 2;
        } else {
            return undefined;
        }
    }
    if (message.indexOf("center") !== -1 || message.indexOf("middle") !== -1) {
        if (x === undefined) x = 1;
        if (y === undefined) y = 1;
    }
    if (x !== undefined && y === undefined) y = 1;
    if (x === undefined && y !== undefined) x = 1;
    if (x !== undefined && y !== undefined) {
        return { x, y };
    }
    return undefined;
}


function checkWinCondition(game: GameTicTacToe) {
    //check vertical
    for (let x = 0; x < 3; x++) {
        if (game.field[x][0] === -1) continue;
        if (game.field[x][0] === game.field[x][1] && game.field[x][0] === game.field[x][2]) {
            game.winner = game.players[game.field[x][0]];
        }
    }
    //check horizontal
    for (let y = 0; y < 3; y++) {
        if (game.field[0][y] === -1) continue;
        if (game.field[0][y] === game.field[1][y] && game.field[0][y] === game.field[2][y]) {
            game.winner = game.players[game.field[0][y]];
        }
    }
    //check diagonal
    if (game.field[1][1] !== -1) {
        if (game.field[1][1] === game.field[0][0] && game.field[1][1] === game.field[2][2]) {
            game.winner = game.players[game.field[1][1]];
        }
        if (game.field[1][1] === game.field[2][0] && game.field[1][1] === game.field[0][2]) {
            game.winner = game.players[game.field[1][1]];
        }
    }

    if (game.winner) {
        game.finishedTime = performance.now();
        game.players[0].playingGameIdRef = undefined;
        game.players[1].playingGameIdRef = undefined;
        game.players = [];
    }
}
