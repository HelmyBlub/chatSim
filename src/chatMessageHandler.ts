
function addChatMessage(userName: string, message: string, state: State) {
    if (state.streamerName === userName) {
        const continueChatHandler = streamerCommands(message, state);
        if (!continueChatHandler) {
            return;
        }
    }
    let chatter = state.chatters.find(u => u.name === userName);
    if (!chatter) {
        chatter = addChatterAndRemoveMostInactive(userName, state);
    }
    addChatMessageToChatter(chatter, message, state);
    localStorageStoreChatters(state);
}

function addChatMessageToChatter(chatter: Chatter, message: string, state: State) {
    const maxMessageLength = state.config.maxMessageLength;
    let messageCapSized = message;
    if (chatter.state == "sleeping") chatter.state = "sitting";
    chatter.lastMessageTime = performance.now();
    let stillDoChatMessage = chatterCommands(chatter, messageCapSized, state);
    if (stillDoChatMessage) stillDoChatMessage = !handleGameTicTacToeChatCommand(chatter, message, state);
    if (stillDoChatMessage) {
        if (messageCapSized.length > maxMessageLength) messageCapSized = messageCapSized.substring(0, maxMessageLength);
        chatter.chatMessages.push({ message: messageCapSized, receiveTime: performance.now() });
        if (chatter.chatMessages.length > state.config.maxChatMessagesPerChatter) {
            chatter.chatMessages.shift();
        }
    }
}

function chatterCommands(chatter: Chatter, message: string, state: State): boolean {
    switch (message) {
        case "sleep":
            if (chatter.state === "sitting") {
                chatter.state = "sleeping";
            }
            return false;
        case "leave":
            chatter.state = "leaving";
            chatter.moveToX = -CHATTER_IMAGE_WIDTH;
            return false;
        case "HeyGuys":
            chatter.draw.pawAnimation = "wave";
            chatter.draw.pawAnimationStart = undefined;
            return false;
        case "clap":
            chatter.draw.pawAnimation = "clap";
            chatter.draw.pawAnimationStart = undefined;
            return false;
        case "Kappa": case "slow clap":
            chatter.draw.pawAnimation = "slowClap";
            chatter.draw.pawAnimationStart = undefined;
            return false;
        case "NotLikeThis":
            chatter.draw.pawAnimation = "notLikeThis";
            chatter.draw.pawAnimationStart = undefined;
            return false;
        case "eat cookie": case "eatCookie":
            if (chatter.draw.pawAnimation !== "eatCookie" && state.gamesData.cookieGame.cookieCounter > 0) {
                chatter.draw.pawAnimation = "eatCookie";
                state.gamesData.cookieGame.cookieCounter--;
            }
            return false;
        case "bake cookie": case "bake cookies":
            if (chatter.draw.pawAnimation !== "bake cookies") chatter.draw.pawAnimationStart = undefined;
            chatter.draw.pawAnimation = "bake cookies";
            state.gamesData.cookieGame.cookieCounter++;
            return false;
        case "TicTacToe":
            handleTicTacToeMessage(chatter, state);
            return false;
    }
    return true;
}

function streamerCommands(message: string, state: State): boolean {
    switch (message) {
        case "delete":
            state.chatters = [];
            state.testing.chatterDogAutoTalk = undefined;
            return false;
        case "delete dog":
        case "delete dogs":
        case "delete test dog":
        case "delete test dogs":
            for (let i = state.chatters.length - 1; i >= 0; i--) {
                if (state.chatters[i].name === state.testing.testDogName) {
                    state.chatters.splice(i, 1);
                }
            }
            state.testing.chatterDogAutoTalk = undefined;
            localStorageStoreChatters(state);
            return false;
        case "add":
            addChatterAndRemoveMostInactive(state.testing.testDogName, state);
            return false;
        case "chaos":
            while (state.chatters.length < state.config.maxChatters) {
                addChatterAndRemoveMostInactive(state.testing.testDogName, state);
            }
            state.testing.chatterDogAutoTalk = true;
            return false;
    }
    return true;
}

function addChatterAndRemoveMostInactive(userName: string, state: State) {
    let chatterSpacing = 10;
    const chatter: Chatter = {
        state: "joining",
        speed: 2,
        name: userName, chatMessages: [],
        posX: -CHATTER_IMAGE_WIDTH,
        posY: 0,
        lastMessageTime: performance.now(),
        sound: {},
        draw: {
            pawAnimation: "sit",
            mouthAnimation: "closed",
            nextPupilMoveTime: 0,
            pupilX: 0,
            pupilY: 0,
        }
    };
    state.chatters.push(chatter);
    if (state.chatters.length > state.config.maxChatters) {
        let mostInactiveIndex = -1;
        let mostInactiveReceiveTime = 0;
        for (let i = 0; i < state.chatters.length; i++) {
            const currentChatter = state.chatters[i];
            if (currentChatter.playingGameIdRef !== undefined) continue;
            if (mostInactiveIndex === -1 || currentChatter.lastMessageTime < mostInactiveReceiveTime) {
                mostInactiveReceiveTime = currentChatter.lastMessageTime;
                mostInactiveIndex = i;
            }
        }
        state.chatters.splice(mostInactiveIndex, 1);
    }
    for (let sittingSpot = 0; sittingSpot < state.config.maxChatters; sittingSpot++) {
        let sittingPositionInUse = false;
        for (let chatter of state.chatters) {
            if (chatter.sittingSpot !== undefined && chatter.sittingSpot === sittingSpot) {
                sittingPositionInUse = true;
                break;
            }
        }
        if (sittingPositionInUse) continue;
        chatter.sittingSpot = sittingSpot;
        chatter.moveToX = (sittingSpot % state.config.maxChattersPerRow) * (chatterSpacing + CHATTER_IMAGE_WIDTH) + 5;
        if (sittingSpot > state.config.maxChattersPerRow) {
            chatter.moveToY = -Math.floor(sittingSpot / state.config.maxChattersPerRow) * 40;
        }
        break;
    }
    state.chatters.sort((chatter1, chatter2) => {
        const chatterY1 = chatter1.moveToY !== undefined ? chatter1.moveToY : chatter1.posY;
        const chatterY2 = chatter2.moveToY !== undefined ? chatter2.moveToY : chatter2.posY;
        return chatterY1 - chatterY2;
    })
    return chatter;
}

