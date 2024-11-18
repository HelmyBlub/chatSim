
export const IMAGE_PATH_TREE = "images/tree.png";
export const IMAGE_PATH_MUSHROOM = "images/mushroom.png";
export const IMAGE_PATH_CITIZEN = "images/citizen.png";
export const IMAGE_PATH_CITIZEN_HOUSE = "images/citizenHouse.png";
export const IMAGE_PATH_AXE = "images/axe.png";
export const IMAGE_PATH_BASKET = "images/basket.png";
export const IMAGE_PATH_HELMET = "images/helmet.png";
export const IMAGE_PATH_BUILDING_MARKET = "images/buildingMarket.png";

export function loadImage(path: string) {
    const imageChatter = new Image();
    imageChatter.src = path;
    return imageChatter;
}

export function drawTextWithOutline(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, outlineColor: string = "white", fillColor: string = "black") {
    ctx.fillStyle = fillColor;
    ctx.strokeStyle = outlineColor;
    ctx.lineWidth = 2;
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
