import { ChatSimState } from "../chatSimModels.js";
import { Citizen } from "../citizen.js";
import { citizenIsSleeping } from "../citizenNeeds/citizenNeedSleep.js";
import { citizenMemoryKnowByName } from "./citizenStateSmallTalk.js";

type Intention = "stopBothering" | "ignore" | "greeting" | "introduction" | "howAreYou" | "reply" | "byeBye"; // ... add rest

type ChatTestData = {
    intention: Intention,
    placeholderFunctions?: { [placeholder: string]: (citizen: Citizen, state: ChatSimState) => string },
    orderedMessageOptions: {
        template?: string,
        condition?: (citizen: Citizen) => boolean,
    }[],
    orderedReplyOptions: {
        template?: string[],
        condition?: (citizen: Citizen, messageByCitizen: Citizen) => boolean,
        intention?: Intention,
    }[],
    orderedFollowUpOptions?: {
        option: Intention,
        condition?: (citizen: Citizen, messageByCitizen: Citizen) => boolean,
    }[]
}

function createGreetingChat(citizen: Citizen, state: ChatSimState): ChatTestData {
    return {
        intention: "greeting",
        orderedMessageOptions: [{ template: "Hello!" }],
        orderedReplyOptions: [
            {
                template: [`Let me sleep! Idiot!`],
                condition: (citizen: Citizen) => citizenIsSleeping(citizen) && citizen.happinessData.happiness < 0,
                intention: "stopBothering"
            },
            { condition: citizenIsSleeping, intention: "ignore" },
            { template: ["Hello?", "Yes?", "Whay do you want?"], intention: "reply" },
        ],
        orderedFollowUpOptions: [
            { option: "howAreYou", condition: citizenMemoryKnowByName },
            { option: "introduction" },
        ]
    }
}

const smalltalktestdata: { [key: string]: ChatTestData } = {
    greeting: {
        intention: "greeting",
        orderedMessageOptions: [{ template: "Hello!" }],
        orderedReplyOptions: [
            {
                template: ["Let me sleep! Idiot!"],
                condition: (citizen: Citizen) => citizenIsSleeping(citizen) && citizen.happinessData.happiness < 0,
                intention: "stopBothering"
            },
            { condition: citizenIsSleeping, intention: "ignore" },
            { template: ["Hello?", "Yes?", "Whay do you want?"], intention: "reply" },
        ],
        orderedFollowUpOptions: [
            { option: "howAreYou", condition: citizenMemoryKnowByName },
            { option: "introduction" },
        ]
    },
    introduction: {
        intention: "introduction",
        orderedMessageOptions: [{
            template: "My name is {name}. Who are you?",
        }],
        orderedReplyOptions: [{ template: ["My name is {citizen.name}."] }],
        orderedFollowUpOptions: [{ option: "howAreYou" }],
    },
    howAreYou: {
        intention: "howAreYou",
        orderedMessageOptions: [{ template: "How are you today ${message.by.name}?" }],
        orderedReplyOptions: [{ template: ["I am ${howAmI}. How are you?"] }],
        orderedFollowUpOptions: [{ option: "byeBye" }],
    },
    byeBye: {
        intention: "byeBye",
        orderedMessageOptions: [{ template: "I am ${howAmI}. Bye Bye!" }],
        orderedReplyOptions: [{ template: ["Bye Bye!"] }],
    },
};