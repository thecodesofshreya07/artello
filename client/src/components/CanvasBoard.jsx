import React, { useRef, useEffect, useState, useCallback } from "react";
import { socket } from "../services/socket";

const COLORS = {
  bg: "#F7F7F5",
  sidebar: "#18181B",
  sidebarHover: "#27272A",
  accent: "#6C63FF",
  accentLight: "#EEF0FF",
  danger: "#E5484D",
  border: "#E4E4E7",
  text: "#18181B",
  muted: "#71717A",
  white: "#FFFFFF",
  canvasBg: "#FFFFFF",
  tooltipBg: "#18181B",
};

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Space+Grotesk:wght@600&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'Inter', sans-serif;
    background: ${COLORS.bg};
    overflow: hidden;
  }

  .wb-shell {
    display: flex;
    height: 100vh;
    width: 100vw;
    overflow: hidden;
  }

  .wb-sidebar {
    width: 60px;
    background: ${COLORS.sidebar};
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 16px 0;
    gap: 4px;
    flex-shrink: 0;
    z-index: 10;
  }

  .wb-logo {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 18px;
    color: ${COLORS.accent};
    letter-spacing: -0.5px;
    margin-bottom: 20px;
    user-select: none;
  }

  .wb-tool-btn {
    position: relative;
    width: 40px;
    height: 40px;
    border-radius: 10px;
    border: none;
    background: transparent;
    color: #A1A1AA;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.15s, color 0.15s;
  }

  .wb-tool-btn:hover {
    background: ${COLORS.sidebarHover};
    color: ${COLORS.white};
  }

  .wb-tool-btn.active {
    background: ${COLORS.accent}22;
    color: ${COLORS.accent};
  }

  .wb-tool-btn.active::before {
    content: '';
    position: absolute;
    left: 0;
    top: 50%;
    transform: translateY(-50%);
    width: 3px;
    height: 20px;
    background: ${COLORS.accent};
    border-radius: 0 3px 3px 0;
  }

  .wb-tooltip {
    position: absolute;
    left: 52px;
    top: 50%;
    transform: translateY(-50%);
    background: ${COLORS.tooltipBg};
    color: ${COLORS.white};
    font-size: 12px;
    font-weight: 500;
    padding: 5px 10px;
    border-radius: 6px;
    white-space: nowrap;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.1s;
    z-index: 100;
  }

  .wb-tool-btn:hover .wb-tooltip {
    opacity: 1;
  }

  .wb-divider {
    width: 28px;
    height: 1px;
    background: #27272A;
    margin: 6px 0;
  }

  .wb-main {
    flex: 1;
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  .wb-topbar {
    height: 52px;
    background: ${COLORS.white};
    border-bottom: 1px solid ${COLORS.border};
    display: flex;
    align-items: center;
    padding: 0 16px;
    gap: 10px;
    flex-shrink: 0;
  }

  .wb-room-input {
    height: 34px;
    padding: 0 12px;
    border: 1px solid ${COLORS.border};
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: ${COLORS.text};
    background: ${COLORS.bg};
    outline: none;
    width: 160px;
    transition: border-color 0.15s;
  }

  .wb-room-input:focus {
    border-color: ${COLORS.accent};
    background: ${COLORS.white};
  }

  .wb-room-input::placeholder {
    color: ${COLORS.muted};
  }

  .wb-join-btn {
    height: 34px;
    padding: 0 14px;
    background: ${COLORS.accent};
    color: ${COLORS.white};
    border: none;
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: opacity 0.15s;
  }

  .wb-join-btn:hover { opacity: 0.88; }

  .wb-topbar-sep {
    width: 1px;
    height: 22px;
    background: ${COLORS.border};
    margin: 0 4px;
  }

  .wb-top-btn {
    height: 34px;
    padding: 0 12px;
    background: transparent;
    border: 1px solid ${COLORS.border};
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: ${COLORS.text};
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 6px;
    transition: background 0.12s, border-color 0.12s;
  }

  .wb-top-btn:hover {
    background: ${COLORS.bg};
    border-color: #D4D4D8;
  }

  .wb-top-btn.danger {
    color: ${COLORS.danger};
    border-color: #FECDD3;
  }

  .wb-top-btn.danger:hover {
    background: #FFF1F2;
  }

  .wb-shape-select {
    height: 34px;
    padding: 0 10px;
    border: 1px solid ${COLORS.border};
    border-radius: 8px;
    font-family: 'Inter', sans-serif;
    font-size: 13px;
    color: ${COLORS.text};
    background: ${COLORS.bg};
    outline: none;
    cursor: pointer;
  }

  .wb-color-row {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-left: auto;
  }

  .wb-color-label {
    font-size: 12px;
    color: ${COLORS.muted};
    white-space: nowrap;
  }

  .wb-color-swatch {
    width: 28px;
    height: 28px;
    border-radius: 6px;
    border: 1px solid ${COLORS.border};
    cursor: pointer;
    overflow: hidden;
    position: relative;
    flex-shrink: 0;
  }

  .wb-color-swatch input[type="color"] {
    position: absolute;
    inset: -4px;
    width: calc(100% + 8px);
    height: calc(100% + 8px);
    border: none;
    cursor: pointer;
    opacity: 0;
  }

  .wb-color-preview {
    width: 100%;
    height: 100%;
    pointer-events: none;
  }

  .wb-size-row {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .wb-size-label {
    font-size: 12px;
    color: ${COLORS.muted};
    width: 42px;
  }

  .wb-slider {
    -webkit-appearance: none;
    width: 80px;
    height: 4px;
    border-radius: 4px;
    background: ${COLORS.border};
    outline: none;
    cursor: pointer;
  }

  .wb-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    background: ${COLORS.accent};
    cursor: pointer;
    border: 2px solid ${COLORS.white};
    box-shadow: 0 1px 4px rgba(0,0,0,0.18);
  }

  .wb-canvas-wrap {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    background: ${COLORS.bg};
    background-image: radial-gradient(circle, #D4D4D8 1px, transparent 1px);
    background-size: 24px 24px;
    overflow: hidden;
    padding: 20px;
  }

  .wb-canvas {
    border-radius: 6px;
    box-shadow: 0 4px 24px rgba(0,0,0,0.10), 0 1px 4px rgba(0,0,0,0.06);
    display: block;
    max-width: 100%;
    max-height: 100%;
  }

  .wb-status {
    position: fixed;
    bottom: 16px;
    left: 50%;
    transform: translateX(-50%);
    background: ${COLORS.tooltipBg};
    color: ${COLORS.white};
    font-size: 12px;
    padding: 7px 14px;
    border-radius: 20px;
    pointer-events: none;
    opacity: 0;
    transition: opacity 0.2s;
    z-index: 50;
  }

  .wb-status.visible {
    opacity: 1;
  }

  .wb-joined-badge {
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 12px;
    color: #16A34A;
    font-weight: 500;
    background: #F0FDF4;
    border: 1px solid #BBF7D0;
    border-radius: 20px;
    padding: 4px 10px;
  }

  .wb-joined-dot {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: #16A34A;
  }
`;

function drawShape(ctx, shape) {
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

function isPointInShape(px, py, shape) {
  const x0 = shape.width >= 0 ? shape.x : shape.x + shape.width;
  const y0 = shape.height >= 0 ? shape.y : shape.y + shape.height;
  const w = Math.abs(shape.width);
  const h = Math.abs(shape.height);
  const pad = 8;
  return px >= x0 - pad && px <= x0 + w + pad && py >= y0 - pad && py <= y0 + h + pad;
}

function drawSelectionHandles(ctx, shape) {
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

function getResizeHandle(px, py, shape) {
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

const PenIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.586 7.586"/><circle cx="11" cy="11" r="2"/>
  </svg>
);

const EraserIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 20H7L3 16c-.8-.8-.8-2 0-2.83L14.17 2c.78-.78 2.05-.78 2.83 0L21 6.17c.78.78.78 2.05 0 2.83L8 22"/><path d="M6.17 7.17l10.66 10.66"/>
  </svg>
);

const ShapeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="8" height="8"/><circle cx="17" cy="7" r="4"/><path d="M12 21l4-8 4 8H12z"/><path d="M3 17h8v4H3z"/>
  </svg>
);

const SelectIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 3l14 9-7 1-4 7L5 3z"/>
  </svg>
);

const UndoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 7v6h6"/><path d="M21 17a9 9 0 00-9-9 9 9 0 00-6 2.3L3 13"/>
  </svg>
);

const RedoIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 7v6h-6"/><path d="M3 17a9 9 0 019-9 9 9 0 016 2.3L21 13"/>
  </svg>
);

const TrashIcon = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/>
  </svg>
);

function SidebarBtn({ icon, label, active, onClick }) {
  return (
    <button className={`wb-tool-btn${active ? " active" : ""}`} onClick={onClick}>
      {icon}
      <span className="wb-tooltip">{label}</span>
    </button>
  );
}

export default function CanvasBoard() {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);

  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const currentStrokeIdRef = useRef(null);
  const strokesRef = useRef([]);

  const shapeStartRef = useRef(null);
  const previewShapeRef = useRef(null);
  const shapesRef = useRef([]);
  const selectedShapeIdRef = useRef(null);
  const dragRef = useRef(null);

  const [shapes, setShapes] = useState([]);
  const [selectedShapeId, setSelectedShapeId] = useState(null);
  const [brushSize, setBrushSize] = useState(4);
  const [selectedColor, setSelectedColor] = useState("#18181B");
  const [roomId, setRoomId] = useState("");
  const [joined, setJoined] = useState(false);
  const [tool, setTool] = useState("pen");
  const [canvasColor, setCanvasColor] = useState("#ffffff");
  const [selectedShape, setSelectedShape] = useState("rectangle");
  const [statusMsg, setStatusMsg] = useState("");

  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { selectedShapeIdRef.current = selectedShapeId; }, [selectedShapeId]);

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 1800);
  };

  const redrawCanvas = useCallback((history, shapeList, preview = null) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    history.forEach((stroke) => {
      stroke.forEach((d) => {
        ctx.strokeStyle = d.color;
        ctx.lineWidth = d.brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(d.x1, d.y1);
        ctx.lineTo(d.x2, d.y2);
        ctx.stroke();
      });
    });

    shapeList.forEach((shape) => {
      drawShape(ctx, shape);
      if (shape.id === selectedShapeIdRef.current) drawSelectionHandles(ctx, shape);
    });

    if (preview) {
      ctx.save();
      ctx.setLineDash([6, 3]);
      drawShape(ctx, preview);
      ctx.restore();
    }
  }, [canvasColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    contextRef.current = ctx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, []);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    redrawCanvas(strokesRef.current, shapesRef.current);
  }, [canvasColor]);

  useEffect(() => {
    const handleRemoteDraw = (d) => {
      const ctx = contextRef.current;
      ctx.strokeStyle = d.color;
      ctx.lineWidth = d.brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.beginPath();
      ctx.moveTo(d.x1, d.y1);
      ctx.lineTo(d.x2, d.y2);
      ctx.stroke();
    };
    socket.on("draw", handleRemoteDraw);
    return () => socket.off("draw", handleRemoteDraw);
  }, []);

  useEffect(() => {
    const handleInit = (data) => {
      const actions = data?.actions ?? (Array.isArray(data) ? data : []);
      const incoming = data?.shapes ?? [];
      strokesRef.current = actions;
      shapesRef.current = incoming;
      setShapes(incoming);
      redrawCanvas(actions, incoming);
    };
    socket.on("init-canvas", handleInit);
    return () => socket.off("init-canvas", handleInit);
  }, [redrawCanvas]);

  useEffect(() => {
    const handleClear = () => {
      const canvas = canvasRef.current;
      const ctx = contextRef.current;
      strokesRef.current = [];
      shapesRef.current = [];
      setShapes([]);
      setSelectedShapeId(null);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = canvasColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    };
    socket.on("clear", handleClear);
    return () => socket.off("clear", handleClear);
  }, [canvasColor]);

  useEffect(() => {
    const handle = (data) => {
      const actions = data?.actions ?? [];
      const incoming = data?.shapes ?? [];
      strokesRef.current = actions;
      shapesRef.current = incoming;
      setShapes(incoming);
      setSelectedShapeId(null);
      redrawCanvas(actions, incoming);
    };
    socket.on("undo", handle);
    socket.on("redo", handle);
    return () => { socket.off("undo", handle); socket.off("redo", handle); };
  }, [redrawCanvas]);

  useEffect(() => {
    const handleShapeAdd = (shape) => {
      if (shapesRef.current.find((s) => s.id === shape.id)) return;
      const updated = [...shapesRef.current, shape];
      shapesRef.current = updated;
      setShapes(updated);
      redrawCanvas(strokesRef.current, updated);
    };
    socket.on("shape-add", handleShapeAdd);
    return () => socket.off("shape-add", handleShapeAdd);
  }, [redrawCanvas]);

  useEffect(() => {
    const handleShapeUpdate = (shape) => {
      const updated = shapesRef.current.map((s) => s.id === shape.id ? shape : s);
      shapesRef.current = updated;
      setShapes(updated);
      redrawCanvas(strokesRef.current, updated);
    };
    socket.on("shape-update", handleShapeUpdate);
    return () => socket.off("shape-update", handleShapeUpdate);
  }, [redrawCanvas]);

  useEffect(() => {
    const handleShapeDelete = (shapeId) => {
      const updated = shapesRef.current.filter((s) => s.id !== shapeId);
      shapesRef.current = updated;
      setShapes(updated);
      if (selectedShapeIdRef.current === shapeId) setSelectedShapeId(null);
      redrawCanvas(strokesRef.current, updated);
    };
    socket.on("shape-delete", handleShapeDelete);
    return () => socket.off("shape-delete", handleShapeDelete);
  }, [redrawCanvas]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDrawing = (e) => {
    const { x, y } = getPos(e);

    if (tool === "select") {
      const sel = shapesRef.current.find((s) => s.id === selectedShapeIdRef.current);
      if (sel) {
        const handle = getResizeHandle(x, y, sel);
        if (handle !== -1) {
          dragRef.current = { shapeId: sel.id, startX: x, startY: y, origX: sel.x, origY: sel.y, origW: sel.width, origH: sel.height, handle, mode: "resize" };
          return;
        }
      }
      const hit = [...shapesRef.current].reverse().find((s) => isPointInShape(x, y, s));
      if (hit) {
        setSelectedShapeId(hit.id);
        dragRef.current = { shapeId: hit.id, startX: x, startY: y, origX: hit.x, origY: hit.y, origW: hit.width, origH: hit.height, handle: -1, mode: "drag" };
        redrawCanvas(strokesRef.current, shapesRef.current);
      } else {
        setSelectedShapeId(null);
        redrawCanvas(strokesRef.current, shapesRef.current);
      }
      return;
    }

    if (tool === "shape") {
      shapeStartRef.current = { x, y };
      return;
    }

    lastXRef.current = x;
    lastYRef.current = y;
    isDrawingRef.current = true;
    currentStrokeIdRef.current = Date.now().toString();
  };

  const draw = (e) => {
    const { x, y } = getPos(e);

    if (dragRef.current) {
      const { shapeId, startX, startY, origX, origY, origW, origH, handle, mode } = dragRef.current;
      const dx = x - startX;
      const dy = y - startY;
      let updated;
      if (mode === "drag") {
        updated = { ...shapesRef.current.find((s) => s.id === shapeId), x: origX + dx, y: origY + dy };
      } else {
        let nx = origX, ny = origY, nw = origW, nh = origH;
        if (handle === 0) { nx = origX + dx; ny = origY + dy; nw = origW - dx; nh = origH - dy; }
        if (handle === 1) { ny = origY + dy; nw = origW + dx; nh = origH - dy; }
        if (handle === 2) { nx = origX + dx; nw = origW - dx; nh = origH + dy; }
        if (handle === 3) { nw = origW + dx; nh = origH + dy; }
        updated = { ...shapesRef.current.find((s) => s.id === shapeId), x: nx, y: ny, width: nw, height: nh };
      }
      const newShapes = shapesRef.current.map((s) => s.id === shapeId ? updated : s);
      shapesRef.current = newShapes;
      setShapes(newShapes);
      redrawCanvas(strokesRef.current, newShapes);
      return;
    }

    if (tool === "shape" && shapeStartRef.current) {
      const preview = {
        type: selectedShape,
        x: shapeStartRef.current.x,
        y: shapeStartRef.current.y,
        width: x - shapeStartRef.current.x,
        height: y - shapeStartRef.current.y,
        color: selectedColor,
        brushSize,
        fill: "transparent",
      };
      previewShapeRef.current = preview;
      redrawCanvas(strokesRef.current, shapesRef.current, preview);
      return;
    }

    if (!isDrawingRef.current) return;

    const ctx = contextRef.current;
    ctx.lineWidth = brushSize;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = tool === "eraser" ? canvasColor : selectedColor;
    ctx.beginPath();
    ctx.moveTo(lastXRef.current, lastYRef.current);
    ctx.lineTo(x, y);
    ctx.stroke();

    const drawData = {
      roomId,
      tool,
      strokeId: currentStrokeIdRef.current,
      timestamp: Date.now(),
      x1: lastXRef.current,
      y1: lastYRef.current,
      x2: x,
      y2: y,
      color: tool === "eraser" ? canvasColor : selectedColor,
      brushSize,
    };
    socket.emit("draw", drawData);

    const lastStroke = strokesRef.current[strokesRef.current.length - 1];
    if (!lastStroke || lastStroke[0].strokeId !== drawData.strokeId) {
      strokesRef.current = [...strokesRef.current, [drawData]];
    } else {
      lastStroke.push(drawData);
    }

    lastXRef.current = x;
    lastYRef.current = y;
  };

  const stopDrawing = (e) => {
    if (dragRef.current) {
      const finalShape = shapesRef.current.find((s) => s.id === dragRef.current.shapeId);
      if (finalShape) socket.emit("shape-update", { roomId, shape: finalShape });
      dragRef.current = null;
      return;
    }

    if (tool === "shape" && shapeStartRef.current && e) {
      const { x, y } = getPos(e);
      const w = x - shapeStartRef.current.x;
      const h = y - shapeStartRef.current.y;
      if (Math.abs(w) > 4 || Math.abs(h) > 4) {
        const newShape = {
          id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: selectedShape,
          x: shapeStartRef.current.x,
          y: shapeStartRef.current.y,
          width: w,
          height: h,
          color: selectedColor,
          brushSize,
          fill: "transparent",
          timestamp: Date.now(),
        };
        const updated = [...shapesRef.current, newShape];
        shapesRef.current = updated;
        setShapes(updated);
        setSelectedShapeId(newShape.id);
        socket.emit("shape-add", { roomId, shape: newShape });
        redrawCanvas(strokesRef.current, updated);
      } else {
        redrawCanvas(strokesRef.current, shapesRef.current);
      }
      shapeStartRef.current = null;
      previewShapeRef.current = null;
      return;
    }

    isDrawingRef.current = false;
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    strokesRef.current = [];
    shapesRef.current = [];
    setShapes([]);
    setSelectedShapeId(null);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit("clear", roomId);
    showStatus("Canvas cleared");
  };

  const joinRoom = () => {
    if (!roomId.trim()) return;
    socket.emit("join-room", roomId);
    setJoined(true);
    showStatus(`Joined room "${roomId}"`);
  };

  const deleteSelectedShape = () => {
    if (!selectedShapeIdRef.current) return;
    const shapeId = selectedShapeIdRef.current;
    const updated = shapesRef.current.filter((s) => s.id !== shapeId);
    shapesRef.current = updated;
    setShapes(updated);
    setSelectedShapeId(null);
    socket.emit("shape-delete", { roomId, shapeId });
    redrawCanvas(strokesRef.current, updated);
    showStatus("Shape deleted");
  };

  useEffect(() => {
    const handleKey = (e) => {
      if ((e.key === "Delete" || e.key === "Backspace") && selectedShapeIdRef.current) {
        e.preventDefault();
        deleteSelectedShape();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  const getCursor = () => {
    if (tool === "eraser") return "cell";
    if (tool === "shape") return "crosshair";
    if (tool === "select") return "default";
    return "crosshair";
  };

  return (
    <>
      <style>{styles}</style>
      <div className="wb-shell">

        <aside className="wb-sidebar">
          <div className="wb-logo">W</div>
          <SidebarBtn icon={<PenIcon />} label="Pen" active={tool === "pen"} onClick={() => setTool("pen")} />
          <SidebarBtn icon={<EraserIcon />} label="Eraser" active={tool === "eraser"} onClick={() => setTool("eraser")} />
          <SidebarBtn icon={<ShapeIcon />} label="Shapes" active={tool === "shape"} onClick={() => setTool("shape")} />
          <SidebarBtn icon={<SelectIcon />} label="Select & Move" active={tool === "select"} onClick={() => setTool("select")} />
          <div className="wb-divider" />
        </aside>

        <div className="wb-main">
          <header className="wb-topbar">
            {joined ? (
              <div className="wb-joined-badge">
                <div className="wb-joined-dot" />
                {roomId}
              </div>
            ) : (
              <>
                <input
                  className="wb-room-input"
                  type="text"
                  placeholder="Room ID"
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && joinRoom()}
                />
                <button className="wb-join-btn" onClick={joinRoom}>Join</button>
              </>
            )}

            {tool === "shape" && (
              <>
                <div className="wb-topbar-sep" />
                <select
                  className="wb-shape-select"
                  value={selectedShape}
                  onChange={(e) => setSelectedShape(e.target.value)}
                >
                  <option value="line">Line</option>
                  <option value="rectangle">Rectangle</option>
                  <option value="circle">Ellipse</option>
                  <option value="triangle">Triangle</option>
                  <option value="arrow">Arrow</option>
                  <option value="diamond">Diamond</option>
                  <option value="hexagon">Hexagon</option>
                  <option value="star">Star</option>
                </select>
              </>
            )}

            {selectedShapeId && (
              <>
                <div className="wb-topbar-sep" />
                <button className="wb-top-btn danger" onClick={deleteSelectedShape}>
                  <TrashIcon /> Delete shape
                </button>
              </>
            )}

            <div className="wb-topbar-sep" style={{ marginLeft: "auto" }} />

            <div className="wb-size-row">
              <span className="wb-size-label">Size {brushSize}</span>
              <input
                className="wb-slider"
                type="range"
                min="1"
                max="20"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
              />
            </div>

            <div className="wb-topbar-sep" />

            <div className="wb-color-row">
              <span className="wb-color-label">Stroke</span>
              <div className="wb-color-swatch">
                <div className="wb-color-preview" style={{ background: selectedColor }} />
                <input type="color" value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)} />
              </div>
              <span className="wb-color-label">Canvas</span>
              <div className="wb-color-swatch">
                <div className="wb-color-preview" style={{ background: canvasColor }} />
                <input type="color" value={canvasColor} onChange={(e) => setCanvasColor(e.target.value)} />
              </div>
            </div>

            <div className="wb-topbar-sep" />

            <button className="wb-top-btn" onClick={() => { socket.emit("undo", roomId); showStatus("Undo"); }}>
              <UndoIcon /> Undo
            </button>
            <button className="wb-top-btn" onClick={() => { socket.emit("redo", roomId); showStatus("Redo"); }}>
              <RedoIcon /> Redo
            </button>
            <button className="wb-top-btn danger" onClick={clearCanvas}>
              <TrashIcon /> Clear
            </button>
          </header>

          <div className="wb-canvas-wrap">
            <canvas
              ref={canvasRef}
              className="wb-canvas"
              width={1100}
              height={650}
              style={{ cursor: getCursor() }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
            />
          </div>
        </div>

        <div className={`wb-status${statusMsg ? " visible" : ""}`}>
          {statusMsg}
        </div>
      </div>
    </>
  );
}
