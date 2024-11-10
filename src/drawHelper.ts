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