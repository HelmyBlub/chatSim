import { ChatSimState, Rectangle, UiButton, UiRectangle } from "./chatSimModels.js";


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
            },
        ],
        heading: "Citizen Information:",
    }
    state.paintData.displaySelected = citizenUiRectangle;
}

function paintCitizenInformation(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    const padding = 5;
    let offsetX = rect.topLeft.x + padding;
    let offsetY = rect.topLeft.y + fontSize + padding;
    const lineSpacing = fontSize + padding;
    let lineCounter = 0;
    for (let citizen of state.map.citizens) {
        ctx.fillText(`${citizen.name}`, offsetX, offsetY + lineSpacing * lineCounter++);
    }

    rect.height = lineSpacing * lineCounter + padding * 2;

}