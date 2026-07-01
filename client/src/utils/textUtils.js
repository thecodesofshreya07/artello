export function drawTextItem(ctx, textItem) {
    ctx.fillStyle = textItem.color;
    ctx.font = "20px Arial";
    const lines = textItem.text.split("\n");

    lines.forEach((line, index) => {
        ctx.fillText(
            line,
            textItem.x,
            textItem.y + index * 24
        );
    });
}