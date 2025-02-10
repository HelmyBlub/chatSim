
export const IMAGE_PATH_TREE = "images/tree.png";
export const IMAGE_PATH_MUSHROOM = "images/mushroom.png";
export const IMAGE_PATH_CITIZEN = "images/citizen.png";
export const IMAGE_PATH_CITIZEN_DEAD = "images/citizenDead.png";
export const IMAGE_PATH_CITIZEN_HOUSE = "images/citizenHouse.png";
export const IMAGE_PATH_AXE = "images/axe.png";
export const IMAGE_PATH_BASKET = "images/basket.png";
export const IMAGE_PATH_HELMET = "images/helmet.png";
export const IMAGE_PATH_BUILDING_MARKET = "images/buildingMarket.png";
export const IMAGE_PATH_TREE_LOG = "images/treeLog.png";
export const IMAGE_PATH_WOOD_PLANK = "images/woodPlank.png";
export const IMAGE_PATH_HAMMER = "images/hammer.png";
export const IMAGE_PATH_CITIZEN_SLEEPING = "images/citizenSleeping.png";
export const IMAGE_PATH_CITIZEN_EAT = "images/citizenEat.png";
export const IMAGE_PATH_MONEY = "images/money.png";

export const IMAGE_PATH_CITIZEN_PART_BODY = "images/citizenPartBody.png";
export const IMAGE_PATH_CITIZEN_PART_EAR_LEFT = "images/citizenPartEarLeft.png";
export const IMAGE_PATH_CITIZEN_PART_EAR_RIGHT = "images/citizenPartEarRight.png";
export const IMAGE_PATH_CITIZEN_PART_EAR_SIDE = "images/citizenPartEarSide.png";
export const IMAGE_PATH_CITIZEN_PART_FOOT = "images/citizenPartFoot.png";
export const IMAGE_PATH_CITIZEN_PART_HEAD = "images/citizenPartHead.png";
export const IMAGE_PATH_CITIZEN_PART_HEAD_SIDE = "images/citizenPartHeadSideways.png";
export const IMAGE_PATH_CITIZEN_PART_PAW = "images/citizenPartPaw.png";


export function loadImage(path: string) {
    const imageChatter = new Image();
    imageChatter.src = path;
    return imageChatter;
}

export function drawTextWithOutline(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, outlineColor: string = "white", fillColor: string = "black", lineWidth: number = 2) {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.strokeText(text, x, y);
    ctx.stroke();
    ctx.fillText(text, x, y);
}

export function drawTextWithBackgroundAndOutline(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, alpha: number) {
    ctx.fillStyle = "white";
    ctx.globalAlpha = alpha;
    const metrics = ctx.measureText(text);
    const fontSize = metrics.fontBoundingBoxAscent;

    ctx.fillRect(x, y - fontSize, metrics.width, fontSize);
    ctx.globalAlpha = 1;
    drawTextWithOutline(ctx, text, x, y);
}
