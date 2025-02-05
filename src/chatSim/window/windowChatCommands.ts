import { ChatSimState } from "../chatSimModels.js";
import { UiButton, UiRectangle } from "../rectangle.js";
import { Rectangle } from "../rectangle.js";
import { IMAGES } from "../images.js";
import { IMAGE_PATH_CITIZEN } from "../../drawHelper.js";
import { CITIZEN_TRAIT_FUNCTIONS } from "../traits/trait.js";

export function createButtonWindowChatCommands(): UiButton {
    return {
        clicked: clickedButton,
        paintIcon: paintIcon,
    }
}

function paintIcon(ctx: CanvasRenderingContext2D, rect: Rectangle) {
    ctx.font = "bold 30px Arial";
    ctx.fillStyle = "black";
    const centerX = rect.topLeft.x + rect.width / 2;
    const text = "!";
    const textWidth = ctx.measureText(text).width;
    ctx.fillText(text, centerX - textWidth / 2, rect.topLeft.y + 32);
}

function clickedButton(state: ChatSimState) {
    const width = 500;
    const citizenUiRectangle: UiRectangle = {
        mainRect: {
            topLeft: { x: state.canvas!.width - width, y: 0 },
            height: 100,
            width: width,
        },
        tabs: [
            {
                name: "List",
                paint: paintCommands,
            },
        ],
        heading: "Chat Commands:",
    }
    state.paintData.displaySelected = citizenUiRectangle;
}


function paintCommands(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const jobList = Object.keys(state.functionsCitizenJobs);
    let textLineCounter = 0;
    const fontSize = 20;
    const textY = rect.topLeft.y + fontSize;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    ctx.fillText(" !job <jobname>", rect.topLeft.x, textY + fontSize * textLineCounter++);
    for (let i = 0; i < jobList.length; i++) {
        const job = jobList[i];
        ctx.fillText(`        ${job}`, rect.topLeft.x, textY + fontSize * textLineCounter++);
    }
    textLineCounter++;
    const traitList = Object.keys(CITIZEN_TRAIT_FUNCTIONS);
    ctx.fillText(" !trait <trait>", rect.topLeft.x, textY + fontSize * textLineCounter++);
    for (let i = 0; i < traitList.length; i++) {
        const trait = traitList[i];
        ctx.fillText(`        ${trait}`, rect.topLeft.x, textY + fontSize * textLineCounter++);
    }

    rect.height = fontSize * textLineCounter + 5;
}