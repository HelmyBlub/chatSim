import { ChatSimState, Position } from "./chatSimModels.js";
import { rectangleClickedInside, rectanglePaint, UiButton, UiRectangle } from "./rectangle.js";
import { Rectangle } from "./rectangle.js";
import { Citizen } from "./citizen.js";
import { inputMouseClientPositionToRelativeCanvasPosition, selectMapObject } from "./input.js";
import { createSelectedUiRectangle } from "./rectangle.js";
import { IMAGES } from "./images.js";
import { IMAGE_PATH_CITIZEN } from "../drawHelper.js";


type CitizenInformationUiRectanlge = UiRectangle & {
    citizenInformationData: CitizenInformationData,
    deceasedCitizenInformationData: CitizenInformationData,
}

type CitizenInformationData = {
    type: string,
    citizensPerPage: number,
    currentPageIndex: number,
    citizenPages: Citizen[][],
    paginationButtons?: Rectangle[],
    fontSize: number,
    padding: number,
    citizenListStartY: number,
}

const WINDOW_TAB_TYPE_DECEASED = "Deceased"
const WINDOW_TAB_TYPE_LIVING = "Living"

export function createCitizenInformationWindowButton(): UiButton {
    return {
        clicked: clickedButton,
        paintIcon: paintIcon,
    }
}

function paintIcon(ctx: CanvasRenderingContext2D, rect: Rectangle) {
    ctx.drawImage(IMAGES[IMAGE_PATH_CITIZEN], 0, 0, 200, 200,
        rect.topLeft.x,
        rect.topLeft.y,
        rect.width,
        rect.height
    );
}

function setupData(state: ChatSimState, citizens: Citizen[], type: string): CitizenInformationData {
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
        type,
    }
    const sortedCitizens = citizens.toSorted((a, b) => a.name.localeCompare(b.name));
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
                name: WINDOW_TAB_TYPE_LIVING,
                paint: paintLivingCitizenInformation,
                click: clickedLivingCititizenWindow,
            },
            {
                name: WINDOW_TAB_TYPE_DECEASED,
                paint: paintDeceasedCitizenInformation,
                click: clickedDeceasedCititizenWindow,
            },
        ],
        heading: "Citizen Information:",
        citizenInformationData: setupData(state, state.map.citizens, WINDOW_TAB_TYPE_LIVING),
        deceasedCitizenInformationData: setupData(state, state.deceasedCitizens, WINDOW_TAB_TYPE_DECEASED),
    }
    state.paintData.displaySelected = citizenUiRectangle;
}

function clickedLivingCititizenWindow(relativeMouseToCanvas: Position, rect: Rectangle, state: ChatSimState) {
    const uiRect = state.paintData.displaySelected as CitizenInformationUiRectanlge;
    if (!uiRect) return;
    const data = uiRect.citizenInformationData;
    clickedCititizenWindow(relativeMouseToCanvas, rect, state, data);
}

function clickedDeceasedCititizenWindow(relativeMouseToCanvas: Position, rect: Rectangle, state: ChatSimState) {
    const uiRect = state.paintData.displaySelected as CitizenInformationUiRectanlge;
    if (!uiRect) return;
    const data = uiRect.deceasedCitizenInformationData;
    clickedCititizenWindow(relativeMouseToCanvas, rect, state, data);
}

function clickedCititizenWindow(relativeMouseToCanvas: Position, rect: Rectangle, state: ChatSimState, data: CitizenInformationData) {
    if (clickedPagination(relativeMouseToCanvas, data)) return;
    const hoverIndex = getHoverCitizenIndex(state, data);
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
function getHoverCitizenIndex(state: ChatSimState, data: CitizenInformationData): number {
    if (data.citizenPages.length === 0) return -1;
    if (!state.canvas) return -1;
    const rect = state.paintData.displaySelected?.tabConntentRect;
    if (!rect) return -1;
    const relativeMouseToCanvas = inputMouseClientPositionToRelativeCanvasPosition(state.inputData.mousePosition, state.canvas);
    if (relativeMouseToCanvas.x < rect.topLeft.x || relativeMouseToCanvas.x > rect.topLeft.x + rect.width) return -1;
    const lineSpacing = data.fontSize + data.padding;
    const reltiveToCitizenListY = relativeMouseToCanvas.y - data.citizenListStartY;
    const hoverIndex = Math.floor(reltiveToCitizenListY / lineSpacing);
    if (hoverIndex < 0 || hoverIndex >= data.citizenPages[data.currentPageIndex].length) return -1;
    return hoverIndex;
}

function paintDeceasedCitizenInformation(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const uiRect = state.paintData.displaySelected as CitizenInformationUiRectanlge;
    if (!uiRect) return;
    const data = uiRect.deceasedCitizenInformationData;
    paintCitizenInformation(ctx, rect, state, data);
}

function paintLivingCitizenInformation(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState) {
    const uiRect = state.paintData.displaySelected as CitizenInformationUiRectanlge;
    if (!uiRect) return;
    const data = uiRect.citizenInformationData;
    paintCitizenInformation(ctx, rect, state, data);
}

function paintCitizenInformation(ctx: CanvasRenderingContext2D, rect: Rectangle, state: ChatSimState, data: CitizenInformationData) {
    const fontSize = 18;
    ctx.font = `${fontSize}px Arial`;
    ctx.fillStyle = "black";
    ctx.strokeStyle = "darkred";
    const padding = 5;
    let offsetX = rect.topLeft.x + padding;
    let offsetY = rect.topLeft.y;
    const lineSpacing = fontSize + padding;
    let lineCounter = 0;
    const hoverIndex = getHoverCitizenIndex(state, data);
    if (data.citizenPages.length > 1) {
        if (!data.paginationButtons) {
            data.paginationButtons = [];
            for (let i = 0; i < data.citizenPages.length; i++) {
                data.paginationButtons.push({
                    topLeft: { x: offsetX, y: offsetY },
                    height: fontSize + padding * 2,
                    width: fontSize + padding * 2,
                });
            }
        }
        for (let i = 0; i < data.paginationButtons.length; i++) {
            const pageButton = data.paginationButtons[i];
            let text;
            if (i === 0) {
                text = data.citizenPages[i][0].name.substring(0, 1);
            } else {
                const beforeCitizen = data.citizenPages[i - 1][data.citizenPages[i - 1].length - 1].name;
                const currentCititzen = data.citizenPages[i][0].name;
                let diffCharIndex = 1;
                for (let i = 0; i < beforeCitizen.length; i++) {
                    if (beforeCitizen[i] === currentCititzen[i]) {
                        diffCharIndex++;
                    } else {
                        break;
                    }
                }
                text = currentCititzen.substring(0, diffCharIndex);
            }
            text += "..";
            const textWidht = ctx.measureText(text).width;
            pageButton.width = textWidht + padding * 2;
            if (data.paginationButtons.length > i + 1) {
                data.paginationButtons[i + 1].topLeft.x = pageButton.topLeft.x + pageButton.width + padding;
            }
            const fillColor = i === data.currentPageIndex ? "lightblue" : undefined;
            rectanglePaint(ctx, pageButton, fillColor, { text, fontSize, padding });
        }
        offsetY += fontSize + padding * 2;
    }
    data.citizenListStartY = offsetY;
    offsetY += fontSize + padding;
    if (data.citizenPages.length === 0) return;
    for (let i = 0; i < data.citizenPages[data.currentPageIndex].length; i++) {
        const citizen = data.citizenPages[data.currentPageIndex][i];
        let text = `${citizen.name}`;
        if (data.type === WINDOW_TAB_TYPE_DECEASED && citizen.isDead) {
            text += ` ${citizen.isDead.reason}`;
        }
        ctx.fillText(text, offsetX, offsetY + lineSpacing * lineCounter);
        if (i === hoverIndex) {
            ctx.strokeText(text, offsetX, offsetY + lineSpacing * lineCounter);
        }
        lineCounter++;
    }

    rect.height = offsetY - rect.topLeft.y + lineSpacing * lineCounter;

}