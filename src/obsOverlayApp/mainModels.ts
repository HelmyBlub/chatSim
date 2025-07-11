import { Commands, initCommands } from "./commands/commands.js"
import { createPrison, Prison } from "./commands/prison.js"
import { loadImages } from "./draw.js"
import { loadSounds } from "./main.js"

export type ChatMessage = {
    receiveTime: number,
    message: string,
}

export type Chatter = {
    chatMessages: ChatMessage[],
    lastMessageTime: number,
    state: "joining" | "sitting" | "sleeping" | "leaving",
    name: string,
    posX: number,
    posY: number,
    moveToX?: number,
    moveToY?: number,
    sittingSpot?: number,
    playingGameIdRef?: number,
    speed: number,
    sound: {
        lastClapIndex?: number,
    },
    outfit?: {
        glasses?: number,
    }
    draw: {
        pawAnimation: string,
        pawAnimationStart?: number,
        pawAnimationSoundPlayed?: boolean,
        nextPupilMoveTime: number,
        pupilX: number,
        pupilY: number,
        pupilMoveToX?: number,
        pupilMoveToY?: number,
        blinkStartedTime?: number,
        mouthAnimation: 'closed' | 'eating',
    }
}

export type Game = {
    name: string,
    id: number,
    players?: Chatter[],
    winner?: Chatter,
    finishedTime?: number,
}

export type State = {
    canvas?: HTMLCanvasElement,
    streamerName: string,
    chatters: Chatter[],
    inactiveChatters: Chatter[],
    images: { [key: string]: HTMLImageElement },
    sounds: { [key: string]: HTMLAudioElement },
    frameRateCounter?: number[];
    config: Configuration,
    commands: Commands,
    prison: Prison,
    gamesData: {
        gameIdCounter: number,
        games: Game[],
        maxGames: number,
        deleteFinishedGamesAfterMs: number,
        cookieGame: {
            cookieCounter: number,
            cookieJarX?: number,
            cookieJarY?: number,
        }
    }
    testing: {
        testDogName: string,
        chatterDogAutoTalk?: boolean,
    }
}

export type Configuration = {
    fontSize: number,
    maxChatters: number,
    maxChattersPerRow: number,
    maxChatMessagesPerChatter: number,
    maxMessageLength: number,
    deleteInactiveChatterAfterTimeMs: number,
    deleteMessageTimeMs: number,
    inactiveToSleepTimeMs: number,
}


export function stateInit(): State {
    let canvas = document.getElementById("canvas") as HTMLCanvasElement;
    canvas.width = window.innerWidth - 10;
    canvas.height = window.innerHeight - 10;
    const state: State = {
        canvas: canvas,
        images: {},
        sounds: {},
        gamesData: {
            gameIdCounter: 0,
            maxGames: 4,
            deleteFinishedGamesAfterMs: 10000,
            games: [],
            cookieGame: {
                cookieCounter: 10,
            }
        },
        testing: {
            testDogName: "testDog",
        },
        chatters: [],
        inactiveChatters: [],
        streamerName: "HelmiBlub",
        frameRateCounter: [],
        config: {
            maxChatters: 5,
            maxChattersPerRow: 8,
            maxChatMessagesPerChatter: 5,
            maxMessageLength: 20,
            deleteInactiveChatterAfterTimeMs: 300000,
            inactiveToSleepTimeMs: 30000,
            deleteMessageTimeMs: 10000,
            fontSize: 36
        },
        commands: {},
        prison: createPrison(),
    }
    loadImages(state);
    loadSounds(state);
    initCommands(state);
    return state;
}