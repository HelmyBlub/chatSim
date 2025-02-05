import { ChatSimState, Position } from "./chatSimModels.js";
import { rectangleClickedInside, rectanglePaint, UiButton, UiRectangle } from "./rectangle.js";
import { Rectangle } from "./rectangle.js";
import { Citizen } from "./citizen.js";
import { inputMouseClientPositionToRelativeCanvasPosition, selectMapObject } from "./input.js";
import { createSelectedUiRectangle } from "./rectangle.js";


type CitizenInformationUiRectanlge = UiRectangle & {
    citizenInformationData: CitizenInformationData
}

type CitizenInformationData = {
    citizensPerPage: number,
    currentPageIndex: number,
    citizenPages: Citizen[][],
    paginationButtons?: Rectangle[],
    fontSize: number,
    padding: number,
    citizenListStartY: number,
}

export function createCitizenInformationWindowButton(): UiButton {
    return {
        clicked: clickedButton,
    }
}

function setupData(state: ChatSimState): CitizenInformationData {
    const canvasHeight = state.canvas?.height ?? 400;
    const estimatedContentRectHeight = canvasHeight - 80;
    const fontSize = 18;
    const padding = 5;
    const citizensPerPage = Math.floor(estimatedContentRectHeight / (fontSize + padding));
    const data: CitizenInformationData = {
        citizenPages: [],
        currentPageIndex: 0,
        citizenListStartY: 0,
        citizensPerPage,
        fontSize,
        padding,
    }
    const sortedCitizens = state.map.citizens.toSorted((a, b) => a.name.localeCompare(b.name));
    let pageIndex = -1;
    for (let i = 0; i < sortedCitizens.length; i++) {
        if (i % data.citizensPerPage === 0) {
            pageIndex++;
            data.citizenPages.push([]);
        }
        const currentCitizen = sortedCitizens[i];
        data.citizenPages[pageIndex].push(currentCitizen);
    }

    return data;
}

function clickedButton(state: ChatSimState) {
    const width = 500;
    const citizenUiRectangle: CitizenInformationUiRectanlge = {
        mainRect: {
            topLeft: { x: state.canvas!.width - width, y: 0 },
            height: 100,
            width: width,
        },
        tabs: [
            {
                name: "Generell",
                paint: paintCitizenInformation,
                click: clickedCititizenWindow,
            },
        ],
        heading: "Citizen Information:",
        citizenInformationData: setupData(state),
    }
    state.paintData.displaySelected = citizenUiRectangle;
}

function clickedCititizenWindow(relativeMouseToCanvas: Position, rect: Rectangle, state: ChatSimState) {
    const uiRect = state.paintData.displaySelected as CitizenInformationUiRectanlge;
    if (!uiRect) return;
    const data = uiRect.citizenInformationData;
    if (clickedPagination(relativeMouseToCanvas, data)) return;
    const hoverIndex = getHoverCitizenIndex(state);
    if (hoverIndex < 0) return;
    const closest = {
        object: data.citizenPages[data.currentPageIndex][hoverIndex],
        type: "citizen",
    }
    if (state.inputData.selected?.object === closest.object) {
        createSelectedUiRectangle(state);
    } else {
        selectMapObject(closest, state);
    }
}

function clickedPagination(relativeMouseToCanvas: Position, data: CitizenInformationData): boolean {
    if (!data.paginationButtons) return false;
    for (let i = 0; i < data.paginationButtons.length; i++) {
        if (rectangleClickedInside(relativeMouseToCanvas, data.paginationButtons[i])) {
            data.currentPageIndex = i;
            return true;
        }
    }
    return false;
}


/**
 * return -1 if nothing hovered
 */
function getHoverCitizenIndex(state: ChatSimState): number {
    if (!state.canvas) return -1;
    const rect = state.paintData.displaySelected?.tabConntentRect;
    if (!rect) return -1;
    const relativeMouseToCanvas = inputMouseClientPositionToRelativeCanvasPosition(state.inputData.mousePosition, state.canvas);
    if (relativeMouseToCanvas.x < rect.topLeft.x || relativeMouseToCanvas.x > rect.topLeft.x + rect.width) return -1;
    const uiRect = state.paintData.displaySelected as CitizenInformationUiRectanlge;
    if (!uiRect) return -1;
    const data = uiRect.citizenInformationData;
    const lineSpacing = data.fontSize + data.padding;
    const reltiveToCitizenListY = relativeMouseToCanvas.y - data.citizenListStartY;
    const hoverIndex = Math.floor(reltiveToCitizenListY / lineSpacing);
    if (hoverIndex < 0 || hoverIndex >= data.citizenPages[data.currentPageIndex].length) return -1;
    return hoverIndex;
}

function paintCitizenInformation(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const uiRect = state.paintData.displaySelected as CitizenInformationUiRectanlge;
    if (!uiRect) return;
    const data = uiRect.citizenInformationData;
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    ctx.strokeStyle = "darkred";
    const padding = 5;
    let offsetX = rect.topLeft.x + padding;
    let offsetY = rect.topLeft.y;
    const lineSpacing = fontSize + padding;
    let lineCounter = 0;
    const hoverIndex = getHoverCitizenIndex(state);
    if (data.citizenPages.length > 1) {
        let paginationButtonOffsetX = offsetX;
        if (!data.paginationButtons) {
            data.paginationButtons = [];
            for (let i = 0; i < data.citizenPages.length; i++) {
                data.paginationButtons.push({
                    topLeft: { x: paginationButtonOffsetX, y: offsetY },
                    height: fontSize + padding * 2,
                    width: fontSize + padding * 2,
                });
                paginationButtonOffsetX += 40;
            }
        }
        for (let i = 0; i < data.paginationButtons.length; i++) {
            const pageButton = data.paginationButtons[i];
            const text = data.citizenPages[i][0].name.substring(0, 2);
            const fillColor = i === data.currentPageIndex ? "lightblue" : undefined;
            rectanglePaint(ctx, pageButton, fillColor, { text, fontSize, padding });
        }
        offsetY += fontSize + padding * 2;
    }
    data.citizenListStartY = offsetY;
    offsetY += fontSize + padding;
    for (let i = 0; i < data.citizenPages[data.currentPageIndex].length; i++) {
        const citizen = data.citizenPages[data.currentPageIndex][i];
        ctx.fillText(`${citizen.name}`, offsetX, offsetY + lineSpacing * lineCounter);
        if (i === hoverIndex) {
            ctx.strokeText(`${citizen.name}`, offsetX, offsetY + lineSpacing * lineCounter);
        }
        lineCounter++;
    }

    rect.height = offsetY - rect.topLeft.y + lineSpacing * lineCounter;

}