import { ChatSimState, Position, Rectangle, UiButton, UiRectangle } from "./chatSimModels.js";
import { createSelectedUiRectangle, inputMouseClientPositionToRelativeCanvasPosition, selectMapObject } from "./input.js";


export function createCitizenInformationWindowButton(): UiButton {
    return {
        clicked: clickedButton,
    }
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
                name: "Generell",
                paint: paintCitizenInformation,
                click: clickedCititizenList,
            },
        ],
        heading: "Citizen Information:",
    }
    state.paintData.displaySelected = citizenUiRectangle;
}

function clickedCititizenList(relativeMouseToCanvas: Position, rect: Rectangle, state: ChatSimState) {
    const hoverIndex = getHoverCitizenIndex(state);
    const closest = {
        object: state.map.citizens[hoverIndex],
        type: "citizen",
    }
    if (state.inputData.selected?.object === closest.object) {
        createSelectedUiRectangle(state);
    } else {
        selectMapObject(closest, state);
    }
}

/***
 * return -1 if nothing hovered
 */
function getHoverCitizenIndex(state: ChatSimState): number {
    if (!state.canvas) return -1;
    const rect = state.paintData.displaySelected?.tabConntentRect;
    if (!rect) return -1;
    const relativeMouseToCanvas = inputMouseClientPositionToRelativeCanvasPosition(state.inputData.mousePosition, state.canvas);
    if (relativeMouseToCanvas.x < rect.topLeft.x || relativeMouseToCanvas.x > rect.topLeft.x + rect.width) return -1;
    const fontSize = 18;
    const padding = 5;
    const lineSpacing = fontSize + padding;
    const reltiveToRectY = relativeMouseToCanvas.y - rect.topLeft.y - padding;
    const hoverIndex = Math.floor(reltiveToRectY / lineSpacing);
    if (hoverIndex < 0 || hoverIndex >= state.map.citizens.length) return -1;
    return hoverIndex;
}

function paintCitizenInformation(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    ctx.strokeStyle = "darkred";
    const padding = 5;
    let offsetX = rect.topLeft.x + padding;
    let offsetY = rect.topLeft.y + fontSize + padding;
    const lineSpacing = fontSize + padding;
    let lineCounter = 0;
    const hoverIndex = getHoverCitizenIndex(state);
    for (let i = 0; i < state.map.citizens.length; i++) {
        const citizen = state.map.citizens[i];
        ctx.fillText(`${citizen.name}`, offsetX, offsetY + lineSpacing * lineCounter);
        if (i === hoverIndex) {
            ctx.strokeText(`${citizen.name}`, offsetX, offsetY + lineSpacing * lineCounter);
        }
        lineCounter++;
    }

    rect.height = lineSpacing * lineCounter + padding * 2;

}