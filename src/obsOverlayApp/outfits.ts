import { loadImage } from "./draw.js";
import { Chatter, State } from "./mainModels.js";


const IMAGES_GLASSES: { image: string, name?: string }[] = [
    { image: "images/sunglasses.png", name: "sunglasses" },
];

export function loadOutfitImages(state: State) {
    for (let glass of IMAGES_GLASSES) {
        state.images[glass.image] = loadImage(glass.image);
    }
}

export function handleOutfitMessage(chatter: Chatter, message: string, state: State): boolean {
    if (!chatter.outfit) chatter.outfit = {};
    if (message === "no glasses" || message === "glasses 0") {
        chatter.outfit.glasses = undefined;
        return true;
    }
    if (message === "glasses 1" || message === "sunglasses") {
        chatter.outfit.glasses = 0;
        return true;
    }
    return false;
}

export function drawOutfit(ctx: CanvasRenderingContext2D, chatter: Chatter, state: State, leftX: number, topY: number) {
    if (!chatter.outfit) return;
    if (chatter.outfit.glasses !== undefined) {
        const glassesImage = state.images[IMAGES_GLASSES[chatter.outfit.glasses].image];
        ctx.drawImage(glassesImage, leftX + 58, topY + 65);
    }
}