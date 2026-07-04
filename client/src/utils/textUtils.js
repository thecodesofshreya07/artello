const COLORS = {
  accent: "#3b82f6",
  white: "#ffffff",
};

export function drawTextItem(ctx, textItem) {
  ctx.fillStyle = textItem.color;

  const x0 = textItem.width >= 0 ? textItem.x : textItem.x + textItem.width;
  const y0 = textItem.height >= 0 ? textItem.y : textItem.y + textItem.height;
  const h = Math.abs(textItem.height) || 24;

  const lines = textItem.text.split("\n");
  const rawSize = h / Math.max(lines.length, 1);
  const fontSize = Math.max(12, Math.min(126, rawSize * 0.5));
  ctx.font = `${fontSize}px Arial`;

  lines.forEach((line, index) => {
    ctx.fillText(
      line,
      x0,
      y0 + fontSize + index * fontSize * 1.2
    );
  });
}

export function isPointInText(px, py, text) {
  const x0 = text.width >= 0 ? text.x : text.x + text.width;
  const y0 = text.height >= 0 ? text.y : text.y + text.height;
  const w = Math.abs(text.width);
  const h = Math.abs(text.height);

  return (
    px >= x0 &&
    px <= x0 + w &&
    py >= y0 &&
    py <= y0 + h
  );
}

export function drawTextSelection(ctx, text) {
  const x0 = text.width >= 0 ? text.x : text.x + text.width;
  const y0 = text.height >= 0 ? text.y : text.y + text.height;
  const w = Math.abs(text.width);
  const h = Math.abs(text.height);

  ctx.save();
  ctx.strokeStyle = "#FF007F";
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(x0, y0, w, h);
  ctx.restore();
}

export function drawTextSelectionHandles(ctx, text) {
  const x0 = text.width >= 0 ? text.x : text.x + text.width;
  const y0 = text.height >= 0 ? text.y : text.y + text.height;
  const w = Math.abs(text.width);
  const h = Math.abs(text.height);
  const pad = 6;

  ctx.save();
  ctx.strokeStyle = COLORS.accent;
  ctx.lineWidth = 1.5;
  ctx.setLineDash([5, 3]);
  ctx.strokeRect(x0 - pad, y0 - pad, w + pad * 2, h + pad * 2);
  ctx.setLineDash([]);

  [[x0 - pad, y0 - pad], [x0 + w + pad, y0 - pad], [x0 - pad, y0 + h + pad], [x0 + w + pad, y0 + h + pad]].forEach(([hx, hy]) => {
    ctx.beginPath();
    ctx.arc(hx, hy, 5, 0, 2 * Math.PI);
    ctx.fillStyle = COLORS.white;
    ctx.fill();
    ctx.strokeStyle = COLORS.accent;
    ctx.stroke();
  });
  ctx.restore();
}

export function getTextResizeHandle(px, py, text) {
  const x0 = text.width >= 0 ? text.x : text.x + text.width;
  const y0 = text.height >= 0 ? text.y : text.y + text.height;
  const w = Math.abs(text.width);
  const h = Math.abs(text.height);
  const pad = 6;
  const handles = [[x0 - pad, y0 - pad], [x0 + w + pad, y0 - pad], [x0 - pad, y0 + h + pad], [x0 + w + pad, y0 + h + pad]];
  for (let i = 0; i < handles.length; i++) {
    const [hx, hy] = handles[i];
    if (Math.hypot(px - hx, py - hy) <= 8) return i;
  }
  return -1;
}