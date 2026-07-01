const COLORS = {
  accent: "#3b82f6",
  white: "#ffffff",
};

export function drawShape(ctx, shape) {
  const { type, x, y, width, height, color, brushSize, fill } = shape;
  ctx.strokeStyle = color;
  ctx.lineWidth = brushSize;
  ctx.fillStyle = fill || "transparent";

  const x0 = width >= 0 ? x : x + width;
  const y0 = height >= 0 ? y : y + height;
  const w = Math.abs(width);
  const h = Math.abs(height);
  const cx = x0 + w / 2;
  const cy = y0 + h / 2;

  ctx.beginPath();

  switch (type) {
    case "line":
      ctx.moveTo(x, y);
      ctx.lineTo(x + width, y + height);
      break;
    case "rectangle":
      ctx.rect(x0, y0, w, h);
      break;
    case "circle":
      ctx.ellipse(cx, cy, w / 2, h / 2, 0, 0, 2 * Math.PI);
      break;
    case "triangle":
      ctx.moveTo(cx, y0);
      ctx.lineTo(x0, y0 + h);
      ctx.lineTo(x0 + w, y0 + h);
      ctx.closePath();
      break;
    case "diamond":
      ctx.moveTo(cx, y0);
      ctx.lineTo(x0 + w, cy);
      ctx.lineTo(cx, y0 + h);
      ctx.lineTo(x0, cy);
      ctx.closePath();
      break;
    case "hexagon": {
      const r = Math.min(w, h) / 2;
      for (let i = 0; i < 6; i++) {
        const angle = (Math.PI / 3) * i - Math.PI / 6;
        const px = cx + r * Math.cos(angle);
        const py = cy + r * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "star": {
      const outerR = Math.min(w, h) / 2;
      const innerR = outerR * 0.4;
      for (let i = 0; i < 10; i++) {
        const angle = (Math.PI / 5) * i - Math.PI / 2;
        const r2 = i % 2 === 0 ? outerR : innerR;
        const px = cx + r2 * Math.cos(angle);
        const py = cy + r2 * Math.sin(angle);
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
      }
      ctx.closePath();
      break;
    }
    case "arrow": {
      const headLen = Math.min(w, h) * 0.35;
      const ex = x + width;
      const ey = y + height;
      const angle = Math.atan2(height, width);
      ctx.moveTo(x, y);
      ctx.lineTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(angle - Math.PI / 6), ey - headLen * Math.sin(angle - Math.PI / 6));
      ctx.moveTo(ex, ey);
      ctx.lineTo(ex - headLen * Math.cos(angle + Math.PI / 6), ey - headLen * Math.sin(angle + Math.PI / 6));
      break;
    }
    default:
      break;
  }

  if (fill && fill !== "transparent") ctx.fill();
  ctx.stroke();
}

export function isPointInShape(px, py, shape) {
  const x0 = shape.width >= 0 ? shape.x : shape.x + shape.width;
  const y0 = shape.height >= 0 ? shape.y : shape.y + shape.height;
  const w = Math.abs(shape.width);
  const h = Math.abs(shape.height);
  const pad = 8;
  return px >= x0 - pad && px <= x0 + w + pad && py >= y0 - pad && py <= y0 + h + pad;
}

export function drawSelectionHandles(ctx, shape) {
  const x0 = shape.width >= 0 ? shape.x : shape.x + shape.width;
  const y0 = shape.height >= 0 ? shape.y : shape.y + shape.height;
  const w = Math.abs(shape.width);
  const h = Math.abs(shape.height);
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

export function getResizeHandle(px, py, shape) {
  const x0 = shape.width >= 0 ? shape.x : shape.x + shape.width;
  const y0 = shape.height >= 0 ? shape.y : shape.y + shape.height;
  const w = Math.abs(shape.width);
  const h = Math.abs(shape.height);
  const pad = 6;
  const handles = [[x0 - pad, y0 - pad], [x0 + w + pad, y0 - pad], [x0 - pad, y0 + h + pad], [x0 + w + pad, y0 + h + pad]];
  for (let i = 0; i < handles.length; i++) {
    const [hx, hy] = handles[i];
    if (Math.hypot(px - hx, py - hy) <= 8) return i;
  }
  return -1;
}