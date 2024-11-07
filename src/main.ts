
type ChatMessage = {
    receiveTime: number,
    message: string,
}

type Chatter = {
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
    draw: {
        pawAnimation: "sit" | "wave" | "clap" | "slowClap" | 'notLikeThis' | 'eatCookie',
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

type Game = {
    name: string,
    id: number,
    players: Chatter[],
    winner?: Chatter,
    finishedTime?: number,
}

type State = {
    canvas?: HTMLCanvasElement,
    streamerName: string,
    chatters: Chatter[],
    images: { [key: string]: HTMLImageElement },
    sounds: { [key: string]: HTMLAudioElement },
    frameRateCounter?: number[];
    config: Configuration,
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

type Configuration = {
    fontSize: number,
    maxChatters: number,
    maxChattersPerRow: number,
    maxChatMessagesPerChatter: number,
    maxMessageLength: number,
    deleteInactiveChatterAfterTimeMs: number,
    deleteMessageTimeMs: number,
    inactiveToSleepTimeMs: number,
}

const LOCAL_STORAGE_NAME = "TestStorage";
let STATE: State;
function stateInit(): State {
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
        streamerName: "HelmiBlub",
        frameRateCounter: [],
        config: {
            maxChatters: 3,
            maxChattersPerRow: 8,
            maxChatMessagesPerChatter: 5,
            maxMessageLength: 20,
            deleteInactiveChatterAfterTimeMs: 300000,
            inactiveToSleepTimeMs: 30000,
            deleteMessageTimeMs: 10000,
            fontSize: 36
        }
    }
    loadImages(state);
    loadSounds(state);
    return state;
}

const AUDIO_HEYGUYS = "sounds/HeyGuys.mp3";
const AUDIO_CLAP_1 = "sounds/clap1.mp3";
const AUDIO_CLAP_2 = "sounds/clap2.mp3";
const AUDIO_CLAP_3 = "sounds/clap3.mp3";
const AUDIO_CLAP_4 = "sounds/clap4.mp3";
const AUDIO_CLAP_5 = "sounds/clap5.mp3";

function playSoundRandomClapping(state: State, notThisIndex: number | undefined) {
    let randomIndex = Math.floor(Math.random() * 5) + 1;
    if (randomIndex === notThisIndex) randomIndex = (randomIndex % 5) + 1;
    const path = `sounds/clap${randomIndex}.mp3`;
    let sound = state.sounds[path];
    if (sound) {
        sound.play();
        return randomIndex;
    }
    console.log("sound not found", path);
    return undefined;
}

function loadSounds(state: State) {
    state.sounds[AUDIO_HEYGUYS] = new Audio(AUDIO_HEYGUYS);
    state.sounds[AUDIO_CLAP_1] = new Audio(AUDIO_CLAP_1);
    state.sounds[AUDIO_CLAP_2] = new Audio(AUDIO_CLAP_2);
    state.sounds[AUDIO_CLAP_3] = new Audio(AUDIO_CLAP_3);
    state.sounds[AUDIO_CLAP_4] = new Audio(AUDIO_CLAP_4);
    state.sounds[AUDIO_CLAP_5] = new Audio(AUDIO_CLAP_5);
}


function localStorageStoreChatters(state: State) {
    localStorage.setItem(LOCAL_STORAGE_NAME, JSON.stringify(state.chatters));
}

function initMyApp() {
    const state = stateInit();
    STATE = state;
    //@ts-ignore
    ComfyJS.onChat = (user, message, flags, self, extra) => {
        addChatMessage(user, message, state);
    }
    //@ts-ignore
    ComfyJS.Init("HelmiBlub");

    loadLocalStorage(state);
    runner(state);
}

function loadLocalStorage(state: State) {
    const testData = localStorage.getItem(LOCAL_STORAGE_NAME);
    if (testData) {
        state.chatters = JSON.parse(testData);
        for (let chatter of state.chatters) {
            chatter.lastMessageTime = 0;
            chatter.draw.blinkStartedTime = undefined;
            chatter.draw.nextPupilMoveTime = 0;
            for (let message of chatter.chatMessages) {
                message.receiveTime = performance.now();
            }
        }
    }
}

async function runner(state: State) {
    try {
        while (true) {
            tick(state);
            draw(state);
            await sleep(16);
        }
    } catch (e) {
        throw e;
    }
}

async function sleep(milliseconds: number) {
    return new Promise(resolve => {
        setTimeout(resolve, milliseconds);
    });
}

document.addEventListener("DOMContentLoaded", function () {
    initMyApp();
});
