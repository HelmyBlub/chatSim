import { drawTextWithOutline, loadImage } from "../../drawHelper.js";
import { IMAGE_PATH_UNBAKED_COOKIE } from "../draw.js";
import { ChatterDogPaintValues, drawPawsWithAngles, resetToSitting } from "../drawChatterDog.js";
import { addCookieToOvenGame } from "../gameCookieOven.js";
import { Chatter, State } from "../mainModels.js";
import { checkIsTextCloseTo } from "./commands.js";

const IMAGE_PATH_BOWL = "images/bowl.png";
const IMAGE_PATH_BAG = "images/bag.png";
const IMAGE_PATH_BUTTER = "images/butter.png";
const IMAGE_PATH_CHOCOLATE_CHIPS = "images/chocolateChips.png";
const IMAGE_PATH_EGG = "images/egg.png";
export const COMMAND_BAKE_COOKIES = "bake cookies";

export function commandAddBakeCookies(state: State) {
    state.commands[COMMAND_BAKE_COOKIES] = {
        isCommand: isCommand,
        preventChatBubble: preventChatBubble,
        drawPaw: drawCommand,
    }
    state.images[IMAGE_PATH_BOWL] = loadImage(IMAGE_PATH_BOWL);
    state.images[IMAGE_PATH_BAG] = loadImage(IMAGE_PATH_BAG);
    state.images[IMAGE_PATH_BUTTER] = loadImage(IMAGE_PATH_BUTTER);
    state.images[IMAGE_PATH_CHOCOLATE_CHIPS] = loadImage(IMAGE_PATH_CHOCOLATE_CHIPS);
    state.images[IMAGE_PATH_EGG] = loadImage(IMAGE_PATH_EGG);

}

function preventChatBubble(message: string): boolean {
    return message === COMMAND_BAKE_COOKIES;
}

function isCommand(message: string, chatter: Chatter): boolean {
    if (message === COMMAND_BAKE_COOKIES || checkIsTextCloseTo(message, COMMAND_BAKE_COOKIES)) {
        if (chatter.draw.pawAnimation !== COMMAND_BAKE_COOKIES) chatter.draw.pawAnimationStart = undefined;
        chatter.draw.pawAnimation = COMMAND_BAKE_COOKIES;
        return true;
    }
    return false;
}

function drawCommand(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, paintValues: ChatterDogPaintValues, timePassed: number) {
    const imageBowl = state.images[IMAGE_PATH_BOWL];
    const targetRotationValue = Math.PI / 4 * 3;
    let rotationValue = 0;
    const pawMoveUpTime = 500;
    const cookieShapingTime = 2000;
    let pawLengthScaling = 1;
    let rotationValueLeft = 0;
    let rotationValueRight = 0;
    const ingredientList: { image: string, name?: string, paw: string, offsetX: number, yOffset: number }[] = [
        { image: IMAGE_PATH_BUTTER, paw: "left", offsetX: -10, yOffset: 0 },
        { image: IMAGE_PATH_EGG, paw: "right", offsetX: 60, yOffset: 0 },
        { name: "Sugar", image: IMAGE_PATH_BAG, paw: "both", offsetX: 0, yOffset: -50 },
        { name: "Flour", image: IMAGE_PATH_BAG, paw: "both", offsetX: 0, yOffset: -50 },
        { image: IMAGE_PATH_CHOCOLATE_CHIPS, paw: "left", offsetX: -10, yOffset: 0 }
    ];
    let currentIngredientIndex = -1;

    const oneCycleTime = pawMoveUpTime * 2;
    if (timePassed < pawMoveUpTime * ingredientList.length * 2) {
        const rotationFactor = Math.abs(Math.cos(Math.PI * 2 / (oneCycleTime) * timePassed) - 1) / 2;
        currentIngredientIndex = Math.floor(timePassed / oneCycleTime);
        rotationValue = targetRotationValue * rotationFactor;
        rotationValueLeft = rotationValue * 0.98;
        rotationValueRight = rotationValue * 0.94;
        if (currentIngredientIndex > -1 && currentIngredientIndex < ingredientList.length) {
            const currentIngredient = ingredientList[currentIngredientIndex];
            if (currentIngredient.paw === "left") {
                rotationValueRight = 0;
            } else if (currentIngredient.paw === "right") {
                rotationValueLeft = 0;
            }
        }
        drawPawsWithAngles(ctx, paintValues, rotationValueLeft, -rotationValueRight, pawLengthScaling, pawLengthScaling, state);
        if (currentIngredientIndex > -1 && currentIngredientIndex < ingredientList.length) {
            const currentIngredient = ingredientList[currentIngredientIndex];
            const ingredientOffsetY = -(rotationValue / targetRotationValue) * 50 + 40 + currentIngredient.yOffset;
            const currentCyclePerCent = (timePassed % oneCycleTime) / oneCycleTime;
            let ingredientOffsetX = currentIngredient.offsetX;
            ctx.save();
            if (currentCyclePerCent > 0.5) {
                ctx.drawImage(imageBowl, 0, 0, 100, 100, paintValues.pawsMiddleX - 38, paintValues.pawsTopY - 40, 100, 100);
                ingredientOffsetX *= 1 - (currentCyclePerCent - 0.5) * 2;
                ctx.clip(getBowlClipPath(paintValues));
            }
            if (currentIngredient.name === undefined) {
                const image = state.images[currentIngredient.image];
                ctx.drawImage(image, 0, 0, 100, 100, paintValues.pawsMiddleX - 38 + ingredientOffsetX, paintValues.pawsTopY - 40 + ingredientOffsetY, 100, 100);
            } else {
                const image = state.images[currentIngredient.image];
                ctx.font = "18px Arial";
                const textWidth = ctx.measureText(currentIngredient.name).width;
                ctx.drawImage(image, 0, 0, 100, 100, paintValues.pawsMiddleX - 38 + ingredientOffsetX, paintValues.pawsTopY - 40 + ingredientOffsetY, 100, 100);
                drawTextWithOutline(ctx, currentIngredient.name, paintValues.pawsMiddleX + 10 - Math.floor(textWidth / 2) + ingredientOffsetX, paintValues.pawsTopY + 30 + ingredientOffsetY);
            }
            ctx.restore();
            if (currentCyclePerCent <= 0.5) {
                const imageBowl = state.images[IMAGE_PATH_BOWL];
                ctx.drawImage(imageBowl, 0, 0, 100, 100, paintValues.pawsMiddleX - 38, paintValues.pawsTopY - 40, 100, 100);
            }
        } else {
            const imageBowl = state.images[IMAGE_PATH_BOWL];
            ctx.drawImage(imageBowl, 0, 0, 100, 100, paintValues.pawsMiddleX - 38, paintValues.pawsTopY - 40, 100, 100);
        }
    } else if (timePassed < pawMoveUpTime * ingredientList.length * 2 + cookieShapingTime) {
        const rotationFactor = Math.abs(Math.cos(Math.PI * 2 / (oneCycleTime) * timePassed) - 1) / 2;
        rotationValue = targetRotationValue * rotationFactor;

        ctx.save();
        ctx.drawImage(imageBowl, 0, 0, 100, 100, paintValues.pawsMiddleX - 38, paintValues.pawsTopY - 40, 100, 100);
        ctx.clip(getBowlClipPath(paintValues));
        drawPawsWithAngles(ctx, paintValues, rotationValueLeft, -rotationValueRight, pawLengthScaling, pawLengthScaling, state);
        ctx.drawImage(state.images[IMAGE_PATH_UNBAKED_COOKIE], 0, 0, 80, 80, paintValues.pawsMiddleX - 18, paintValues.pawsTopY + 10, 60, 60);
        ctx.restore();
    } else {
        const cookieOvenGame = addCookieToOvenGame(state);
        if (cookieOvenGame.bakingStartedTime === undefined && chatter.draw.pawAnimationStart !== undefined) {
            chatter.draw.pawAnimationStart += cookieShapingTime;
            ctx.drawImage(imageBowl, 0, 0, 100, 100, paintValues.pawsMiddleX - 38, paintValues.pawsTopY - 40, 100, 100);
        } else {
            rotationValue = 0;
            resetToSitting(chatter, state);
        }
    }
}

function getBowlClipPath(paintValues: ChatterDogPaintValues): Path2D {
    let bowlPath = new Path2D();
    bowlPath.moveTo(paintValues.pawsMiddleX - 38 - 50, paintValues.pawsTopY - 40);
    bowlPath.lineTo(paintValues.pawsMiddleX - 38 + 2, paintValues.pawsTopY - 40 + 47);
    bowlPath.quadraticCurveTo(paintValues.pawsMiddleX - 38 + 51, paintValues.pawsTopY - 40 + 76, paintValues.pawsMiddleX - 38 + 98, paintValues.pawsTopY - 40 + 50);
    bowlPath.lineTo(paintValues.pawsMiddleX - 38 + 150, paintValues.pawsTopY - 40 + 50);
    bowlPath.lineTo(paintValues.pawsMiddleX - 38 + 150, paintValues.pawsTopY - 40 - 100);
    bowlPath.lineTo(paintValues.pawsMiddleX - 38 - 50, paintValues.pawsTopY - 40 - 100);
    bowlPath.lineTo(paintValues.pawsMiddleX - 38 - 50, paintValues.pawsTopY - 40);
    return bowlPath;
}