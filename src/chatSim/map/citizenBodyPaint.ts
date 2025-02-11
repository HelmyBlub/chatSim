import { IMAGE_PATH_CITIZEN_PART_BODY, IMAGE_PATH_CITIZEN_PART_EAR_LEFT, IMAGE_PATH_CITIZEN_PART_EAR_RIGHT, IMAGE_PATH_CITIZEN_PART_HEAD } from "../../drawHelper.js";
import { ChatSimState } from "../chatSimModels.js";
import { IMAGES } from "../images.js";
import { mapPositionToPaintPosition, PAINT_LAYER_CITIZEN_AFTER_HOUSES, PAINT_LAYER_CITIZEN_BEFORE_HOUSES } from "../paint.js";
import { Citizen, CITIZEN_PAINT_SIZE } from "./citizen.js";
import { PaintDataMap } from "./map.js";


export function paintCitizenBody(ctx: CanvasRenderingContext2D, citizen: Citizen, paintDataMap: PaintDataMap, layer: number, state: ChatSimState) {
    const paintPos = mapPositionToPaintPosition(citizen.position, paintDataMap);
    const paintInThisLayer = (layer === PAINT_LAYER_CITIZEN_BEFORE_HOUSES && citizen.paintBehindBuildings) || (layer === PAINT_LAYER_CITIZEN_AFTER_HOUSES && !citizen.paintBehindBuildings);
    if (!paintInThisLayer) return;
    const scaleFactor = 40 / 200;
    const paintParts = [
        {
            imagePath: IMAGE_PATH_CITIZEN_PART_BODY,
            offsetX: 0,
            offsetY: 0,
            horizontalScale: citizen.foodPerCent + 0.5,
        },
        {
            imagePath: IMAGE_PATH_CITIZEN_PART_HEAD,
            offsetX: 0,
            offsetY: -10,
        },
        {
            imagePath: IMAGE_PATH_CITIZEN_PART_EAR_LEFT,
            offsetX: -10,
            offsetY: -10,
            width: 40,
            indexLoopInverval: 100,
        },
        {
            imagePath: IMAGE_PATH_CITIZEN_PART_EAR_RIGHT,
            offsetX: +10,
            offsetY: -10,
            width: 40,
            indexLoopInverval: 100,
            height: undefined,
        },
    ]

    for (let part of paintParts) {
        const imagePart = IMAGES[part.imagePath];
        let width = part.width ? part.width : imagePart.width;
        let height = part.height ? part.height : imagePart.height;
        let scaledWidth = width * scaleFactor;
        if (part.horizontalScale !== undefined) {
            scaledWidth *= part.horizontalScale;
        }
        const scaledHeight = height * scaleFactor;
        let index = 0;
        if (part.indexLoopInverval && width < imagePart.width) {
            const maxIndex = Math.floor(imagePart.width / width);
            index = Math.floor((state.time / part.indexLoopInverval) % maxIndex);
        }
        ctx.drawImage(imagePart, index * width, 0, width, height,
            paintPos.x - scaledWidth / 2 + part.offsetX,
            paintPos.y - scaledHeight / 2 + part.offsetY,
            scaledWidth, scaledHeight
        );
    }
}