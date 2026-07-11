import React, { useRef, useEffect, useState, useCallback } from "react";
import "./styles.css";
import { drawShape, isPointInShape, drawSelectionHandles, getResizeHandle } from "../utils/canvasUtils";
import { PenIcon, EraserIcon, ShapeIcon, SelectIcon, UndoIcon, RedoIcon, TrashIcon, TextIcon } from "./icons";
import SidebarBtn from "./SidebarBtn";
import { socket } from "../services/socket";
import { drawTextItem, isPointInText, drawTextSelection, drawTextSelectionHandles, getTextResizeHandle } from "../utils/textUtils";
import { useUserIdentity } from "../hooks/useUserIdentity";
import { usePresence } from "../hooks/usePresence";
import CursorLayer from "./CursorLayer";
import PresenceBar from "./PresenceBar";
import { exportCanvasAsPNG } from "../utils/exportUtils";


export default function CanvasBoard({ roomCode, title }) {

  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const staticCanvasRef = useRef(null);
  const staticContextRef = useRef(null);
  const snapshotBase64Ref = useRef(null);
  const snapshotImageRef = useRef(null);

  const isDrawingRef = useRef(false);
  const lastXRef = useRef(0);
  const lastYRef = useRef(0);
  const lastEmittedXRef = useRef(null);
  const lastEmittedYRef = useRef(null);
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
  const roomId = roomCode;
  const [tool, setTool] = useState("pen");
  const [canvasColor, setCanvasColor] = useState("#ffffff");
  const [selectedShape, setSelectedShape] = useState("rectangle");
  const [statusMsg, setStatusMsg] = useState("");
  const [texts, setTexts] = useState([]);
  const [editingText, setEditingText] = useState(null);
  const [textDraft, setTextDraft] = useState("");
  const [textBox, setTextBox] = useState(null);
  const [selectedTextId, setSelectedTextId] = useState(null);
  const selectedTextIdRef = useRef(null);
  const identity = useUserIdentity();
  const { remoteUsers, presenceList, sendCursor } = usePresence(roomId, identity, tool);
  useEffect(() => {
    selectedTextIdRef.current = selectedTextId;
  }, [selectedTextId]);

  const textsRef = useRef([]);

  // Always point at the latest applyEvent/rebuildFromEvents closures so
  // socket listeners (registered once on mount) never act on stale state.
  const applyEventRef = useRef(null);
  const rebuildFromEventsRef = useRef(null);

  useEffect(() => {
    textsRef.current = texts;
  }, [texts]);

  useEffect(() => { shapesRef.current = shapes; }, [shapes]);
  useEffect(() => { selectedShapeIdRef.current = selectedShapeId; }, [selectedShapeId]);

  const showStatus = (msg) => {
    setStatusMsg(msg);
    setTimeout(() => setStatusMsg(""), 1800);
  };

  const applyEvent = (event) => {
    const { type, data } = event;

    switch (type) {
      case "snapshot": {
        snapshotBase64Ref.current = data.image;
        if (snapshotBase64Ref.current) {
          const img = new Image();
          img.src = snapshotBase64Ref.current;
          img.onload = () => {
            snapshotImageRef.current = img;
            redrawStaticCanvas();
          };
        } else {
          snapshotImageRef.current = null;
        }
        break;
      }

      case "stroke": {
        const strokeIndex = strokesRef.current.findIndex(
          s => s[0]?.strokeId === data.strokeId
        );
        console.log("STROKE EVENT", event.data);
        let updated;
        if (strokeIndex === -1) {
          // first point of a brand-new stroke
          updated = [...strokesRef.current, [data]];
        } else {
          // append this point to the stroke it belongs to
          updated = strokesRef.current.map((s, i) =>
            i === strokeIndex ? [...s, data] : s
          );
        }

        strokesRef.current = updated;

        // Draw directly onto the static canvas incrementally
        const sCtx = staticContextRef.current;
        if (sCtx) {
          sCtx.strokeStyle = data.tool === "eraser" ? canvasColor : data.color;
          sCtx.lineWidth = data.brushSize;
          sCtx.lineCap = "round";
          sCtx.lineJoin = "round";
          sCtx.beginPath();
          sCtx.moveTo(data.x1, data.y1);
          sCtx.lineTo(data.x2, data.y2);
          sCtx.stroke();
        }
        break;
      }

      case "shape-add": {
        const updated = [...shapesRef.current, data];
        shapesRef.current = updated;
        setShapes(updated);
        redrawCanvas(strokesRef.current, updated);
        break;
      }

      case "shape-update": {
        const updated = shapesRef.current.map((s) =>
          s.id === data.id ? data : s
        );
        shapesRef.current = updated;
        setShapes(updated);
        redrawCanvas(strokesRef.current, updated);
        break;
      }

      case "shape-delete": {
        const updated = shapesRef.current.filter((s) => s.id !== data.shapeId);
        shapesRef.current = updated;
        setShapes(updated);
        redrawCanvas(strokesRef.current, updated);
        break;
      }
      case "text-add": {
        const updated = [...textsRef.current, data];
        textsRef.current = updated;
        setTexts(updated);
        redrawCanvas(strokesRef.current, shapesRef.current);
        break;
      }

      case "text-update": {
        const updated = textsRef.current.map((t) =>
          t.id === data.id ? data : t
        );
        textsRef.current = updated;
        setTexts(updated);
        redrawCanvas(strokesRef.current, shapesRef.current);
        break;
      }
      case "text-delete": {
        const updated =
          textsRef.current.filter(
            t => t.id !== data.textId
          );

        textsRef.current = updated;
        setTexts(updated);

        redrawCanvas(
          strokesRef.current,
          shapesRef.current
        );

        break;
      }

      case "clear": {
        strokesRef.current = [];
        shapesRef.current = [];
        textsRef.current = [];
        setShapes([]);
        setTexts([]);
        setSelectedShapeId(null);
        setSelectedTextId(null);
        snapshotBase64Ref.current = null;
        snapshotImageRef.current = null;
        redrawCanvas();
        break;
      }
    }
  };

  const redrawStaticCanvas = useCallback(() => {
    const canvas = staticCanvasRef.current;
    const ctx = staticContextRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = canvasColor;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (snapshotImageRef.current) {
      ctx.drawImage(snapshotImageRef.current, 0, 0);
    }

    strokesRef.current.forEach((stroke) => {
      stroke.forEach((d) => {
        ctx.strokeStyle = d.tool === "eraser" ? canvasColor : d.color;
        ctx.lineWidth = d.brushSize;
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(d.x1, d.y1);
        ctx.lineTo(d.x2, d.y2);
        ctx.stroke();
      });
    });

    const activeDragShapeId = dragRef.current?.shapeId;
    shapesRef.current.forEach((shape) => {
      if (shape.id === activeDragShapeId) return;
      drawShape(ctx, shape);
      if (shape.id === selectedShapeIdRef.current) {
        drawSelectionHandles(ctx, shape);
      }
    });

    const activeDragTextId = dragRef.current?.textId;
    textsRef.current.forEach((textItem) => {
      if (textItem.id === activeDragTextId) return;
      drawTextItem(ctx, textItem);
      if (textItem.id === selectedTextIdRef.current) {
        drawTextSelectionHandles(ctx, textItem);
      }
    });
  }, [canvasColor]);

  const redrawOverlayCanvas = useCallback((previewShape = null) => {
    const canvas = canvasRef.current;
    const ctx = contextRef.current;
    if (!canvas || !ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (previewShape) {
      ctx.save();
      ctx.setLineDash([6, 3]);
      drawShape(ctx, previewShape);
      ctx.restore();
    }

    if (dragRef.current && dragRef.current.shapeId) {
      const activeShape = shapesRef.current.find(s => s.id === dragRef.current.shapeId);
      if (activeShape) {
        drawShape(ctx, activeShape);
        drawSelectionHandles(ctx, activeShape);
      }
    }

    if (dragRef.current && dragRef.current.textId) {
      const activeText = textsRef.current.find(t => t.id === dragRef.current.textId);
      if (activeText) {
        drawTextItem(ctx, activeText);
        drawTextSelectionHandles(ctx, activeText);
      }
    }
  }, []);

  const redrawCanvas = useCallback(() => {
    redrawStaticCanvas();
    redrawOverlayCanvas();
  }, [redrawStaticCanvas, redrawOverlayCanvas]);

  useEffect(() => {
    redrawCanvas();
  }, [redrawCanvas]);

  useEffect(() => {
    const staticCanvas = staticCanvasRef.current;
    const staticCtx = staticCanvas.getContext("2d");
    staticContextRef.current = staticCtx;
    staticCtx.lineCap = "round";
    staticCtx.lineJoin = "round";
    staticCtx.fillStyle = canvasColor;
    staticCtx.fillRect(0, 0, staticCanvas.width, staticCanvas.height);

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    contextRef.current = ctx;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  useEffect(() => {
    const handleEvent = (event) => {
      try {
        console.log("RECEIVED EVENT", event);
        applyEventRef.current(event);
      } catch (err) {
        console.error("Failed to apply remote event:", event, err);
      }
    };

    socket.on("event", handleEvent);

    return () => {
      socket.off("event", handleEvent);
    };
  }, []);

  useEffect(() => {
    const ctx = contextRef.current;
    if (!ctx) return;
    redrawCanvas(strokesRef.current, shapesRef.current);
  }, [canvasColor]);

  const rebuildFromEvents = (events) => {
    strokesRef.current = [];
    shapesRef.current = [];
    textsRef.current = [];
    setShapes([]);
    setTexts([]);
    setSelectedShapeId(null);
    setSelectedTextId(null);

    // Only reload or clear the snapshot if it has changed
    const firstEvent = events[0];
    if (firstEvent && firstEvent.type === "snapshot") {
      const newImageBase64 = firstEvent.data.image;
      if (snapshotBase64Ref.current !== newImageBase64) {
        snapshotBase64Ref.current = newImageBase64;
        snapshotImageRef.current = null;
        const img = new Image();
        img.src = newImageBase64;
        img.onload = () => {
          snapshotImageRef.current = img;
          redrawStaticCanvas();
        };
      }
    } else {
      snapshotBase64Ref.current = null;
      snapshotImageRef.current = null;
    }

    // IMPORTANT: rebuild cleanly
    events.forEach((event) => {
      if (event.type === "snapshot") return; // already processed
      try {
        applyEvent(event);
      } catch (err) {
        console.error("Skipping event that failed to apply:", event, err);
      }
    });

    // Redraw at the end of the rebuild process to ensure the canvas is updated, especially if events is empty
    redrawCanvas();
  };

  // These handlers are registered once on mount, but they close over
  // applyEvent/rebuildFromEvents/canvasColor from that specific render.
  // Routing every call through a ref that's updated on every render keeps
  // remote events using current state (e.g. the canvas background color)
  // instead of whatever was current the moment the socket listener attached.
  applyEventRef.current = applyEvent;
  rebuildFromEventsRef.current = rebuildFromEvents;

  useEffect(() => {
    const handleInit = (data) => {
      if (data?.canvasColor) setCanvasColor(data.canvasColor);   // NEW
      rebuildFromEventsRef.current(data?.events ?? []);
    };

    socket.on("init-canvas", handleInit);
    return () => socket.off("init-canvas", handleInit);
  }, []);

  useEffect(() => {
    const handleColor = (color) => setCanvasColor(color);
    socket.on("canvas-color", handleColor);
    return () => socket.off("canvas-color", handleColor);
  }, []);

  useEffect(() => {
    // Undo/redo can't be represented as a single incremental "event" the way
    // draw/shape/text actions can, so the server instead sends the full,
    // corrected event log and every client rebuilds the canvas from it.
    const handleSync = (data) => {
      rebuildFromEventsRef.current(data?.events ?? []);
    };

    socket.on("canvas-sync", handleSync);
    return () => socket.off("canvas-sync", handleSync);
  }, []);

  useEffect(() => {
    const handleRequestSnapshot = (data) => {
      const { roomId } = data;
      const tempCanvas = document.createElement("canvas");
      tempCanvas.width = 1100;
      tempCanvas.height = 650;
      const tempCtx = tempCanvas.getContext("2d");

      tempCtx.fillStyle = canvasColor;
      tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);

      if (snapshotImageRef.current) {
        tempCtx.drawImage(snapshotImageRef.current, 0, 0);
      }

      strokesRef.current.forEach((stroke) => {
        stroke.forEach((d) => {
          tempCtx.strokeStyle = d.tool === "eraser" ? canvasColor : d.color;
          tempCtx.lineWidth = d.brushSize;
          tempCtx.lineCap = "round";
          tempCtx.lineJoin = "round";
          tempCtx.beginPath();
          tempCtx.moveTo(d.x1, d.y1);
          tempCtx.lineTo(d.x2, d.y2);
          tempCtx.stroke();
        });
      });

      shapesRef.current.forEach((shape) => {
        drawShape(tempCtx, shape);
      });

      textsRef.current.forEach((textItem) => {
        drawTextItem(tempCtx, textItem);
      });

      const base64 = tempCanvas.toDataURL("image/png");
      socket.emit("submit-snapshot", { roomId, base64 });
    };

    socket.on("request-snapshot", handleRequestSnapshot);
    return () => socket.off("request-snapshot", handleRequestSnapshot);
  }, [canvasColor]);

  const startDrawingRef = useRef(null);
  const drawRefFunc = useRef(null);
  const stopDrawingRef = useRef(null);

  useEffect(() => {
    startDrawingRef.current = startDrawing;
    drawRefFunc.current = draw;
    stopDrawingRef.current = stopDrawing;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const handleStart = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        startDrawingRef.current({ clientX: touch.clientX, clientY: touch.clientY });
      }
    };

    const handleMove = (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      if (touch) {
        drawRefFunc.current({ clientX: touch.clientX, clientY: touch.clientY });
      }
    };

    const handleEnd = (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0] || e.touches[0];
      stopDrawingRef.current(touch ? { clientX: touch.clientX, clientY: touch.clientY } : null);
    };

    canvas.addEventListener("touchstart", handleStart, { passive: false });
    canvas.addEventListener("touchmove", handleMove, { passive: false });
    canvas.addEventListener("touchend", handleEnd, { passive: false });

    return () => {
      canvas.removeEventListener("touchstart", handleStart);
      canvas.removeEventListener("touchmove", handleMove);
      canvas.removeEventListener("touchend", handleEnd);
    };
  }, []);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e) => {
    const { x, y } = getPos(e);
    if (tool === "text") {
      setTextBox({
        x,
        y,
        width: 0,
        height: 0,
      });

      isDrawingRef.current = true;
      return;
    }

    if (tool === "select") {
      const sel = shapesRef.current.find((s) => s.id === selectedShapeIdRef.current);
      if (sel) {
        const handle = getResizeHandle(x, y, sel);
        if (handle !== -1) {
          const normX = sel.width >= 0 ? sel.x : sel.x + sel.width;
          const normY = sel.height >= 0 ? sel.y : sel.y + sel.height;
          const normW = Math.abs(sel.width);
          const normH = Math.abs(sel.height);
          dragRef.current = {
            shapeId: sel.id,
            startX: x,
            startY: y,
            origX: normX,
            origY: normY,
            origW: normW,
            origH: normH,
            handle,
            mode: "resize",
          };
          redrawStaticCanvas();
          return;
        }
      }

      const selText = textsRef.current.find((t) => t.id === selectedTextIdRef.current);
      if (selText) {
        const handle = getTextResizeHandle(x, y, selText);
        if (handle !== -1) {
          const normX = selText.width >= 0 ? selText.x : selText.x + selText.width;
          const normY = selText.height >= 0 ? selText.y : selText.y + selText.height;
          const normW = Math.abs(selText.width);
          const normH = Math.abs(selText.height);
          dragRef.current = {
            mode: "text-resize",
            textId: selText.id,
            startX: x,
            startY: y,
            origX: normX,
            origY: normY,
            origW: normW,
            origH: normH,
            handle,
          };
          redrawStaticCanvas();
          return;
        }
      }

      const hitText = [...textsRef.current]
        .reverse()
        .find((t) => isPointInText(x, y, t));
      console.log("TEXTS", textsRef.current);
      console.log("CLICK", x, y);
      console.log("HIT TEXT", hitText);

      if (hitText) {
        setSelectedTextId(hitText.id);
        setSelectedShapeId(null);

        dragRef.current = {
          mode: "text-drag",
          textId: hitText.id,
          startX: x,
          startY: y,
          origX: hitText.x,
          origY: hitText.y,
        };

        redrawStaticCanvas();
        return;
      }

      const hit = [...shapesRef.current].reverse().find((s) => isPointInShape(x, y, s));
      if (hit) {
        setSelectedShapeId(hit.id);
        setSelectedTextId(null);
        dragRef.current = { shapeId: hit.id, startX: x, startY: y, origX: hit.x, origY: hit.y, origW: hit.width, origH: hit.height, handle: -1, mode: "drag" };
        redrawStaticCanvas();
      } else {
        setSelectedShapeId(null);
        setSelectedTextId(null);
        redrawStaticCanvas();
      }
      return;
    }

    if (tool === "shape") {
      shapeStartRef.current = { x, y };
      return;
    }

    lastXRef.current = x;
    lastYRef.current = y;
    lastEmittedXRef.current = x;
    lastEmittedYRef.current = y;
    isDrawingRef.current = true;
    currentStrokeIdRef.current = Date.now().toString();
  };

  const draw = (e) => {
    const { x, y } = getPos(e);
    sendCursor(x, y);
    if (tool === "text" && textBox && isDrawingRef.current) {
      setTextBox(prev => ({
        ...prev,
        width: x - prev.x,
        height: y - prev.y,
      }));

      return;
    }
    if (
      dragRef.current &&
      dragRef.current.mode === "text-resize"
    ) {
      const { textId, startX, startY, origX, origY, origW, origH, handle } = dragRef.current;
      const dx = x - startX;
      const dy = y - startY;

      let nx = origX, ny = origY, nw = origW, nh = origH;
      if (handle === 0) { nx = origX + dx; ny = origY + dy; nw = origW - dx; nh = origH - dy; }
      if (handle === 1) { ny = origY + dy; nw = origW + dx; nh = origH - dy; }
      if (handle === 2) { nx = origX + dx; nw = origW - dx; nh = origH + dy; }
      if (handle === 3) { nw = origW + dx; nh = origH + dy; }

      const updatedTexts = textsRef.current.map((t) =>
        t.id === textId ? { ...t, x: nx, y: ny, width: nw, height: nh } : t
      );
      textsRef.current = updatedTexts;
      setTexts(updatedTexts);
      redrawOverlayCanvas();
      return;
    }

    if (
      dragRef.current &&
      dragRef.current.mode === "text-drag"
    ) {
      const {
        textId,
        startX,
        startY,
        origX,
        origY,
      } = dragRef.current;

      const dx = x - startX;
      const dy = y - startY;

      const updatedTexts =
        textsRef.current.map((t) =>
          t.id === textId
            ? {
              ...t,
              x: origX + dx,
              y: origY + dy,
            }
            : t
        );

      textsRef.current = updatedTexts;
      setTexts(updatedTexts);

      redrawOverlayCanvas();

      return;
    }

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
      redrawOverlayCanvas();
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
      redrawOverlayCanvas(preview);
      return;
    }

    if (!isDrawingRef.current) return;

    // Draw locally at full resolution on the overlay canvas immediately
    const ctx = contextRef.current;
    if (ctx) {
      ctx.lineWidth = brushSize;
      ctx.lineCap = "round";
      ctx.lineJoin = "round";
      ctx.strokeStyle = tool === "eraser" ? canvasColor : selectedColor;
      ctx.beginPath();
      ctx.moveTo(lastXRef.current, lastYRef.current);
      ctx.lineTo(x, y);
      ctx.stroke();
    }

    // Downsample network emissions using distance thresholding
    const dist = Math.hypot(x - lastEmittedXRef.current, y - lastEmittedYRef.current);
    if (dist >= 4) {
      const drawData = {
        roomId,
        tool,
        strokeId: currentStrokeIdRef.current,
        timestamp: Date.now(),
        x1: lastEmittedXRef.current,
        y1: lastEmittedYRef.current,
        x2: x,
        y2: y,
        color: tool === "eraser" ? canvasColor : selectedColor,
        brushSize,
        userId: identity.id,
      };

      console.log("SENDING", drawData);
      socket.emit("draw", drawData);

      const lastStroke = strokesRef.current[strokesRef.current.length - 1];
      if (!lastStroke || lastStroke[0].strokeId !== drawData.strokeId) {
        strokesRef.current = [...strokesRef.current, [drawData]];
      } else {
        lastStroke.push(drawData);
      }

      lastEmittedXRef.current = x;
      lastEmittedYRef.current = y;
    }

    lastXRef.current = x;
    lastYRef.current = y;
  };

  const stopDrawing = (e) => {
    if (tool === "text" && textBox) {
      const w = Math.abs(textBox.width) < 10 ? 150 : textBox.width;
      const h = Math.abs(textBox.height) < 10 ? 40 : textBox.height;
      const newText = {
        id: Date.now().toString(),
        x: textBox.x,
        y: textBox.y,
        width: w,
        height: h,
        text: "",
        color: selectedColor,
      };
      const updatedTexts = [...textsRef.current, newText];
      textsRef.current = updatedTexts;
      setTexts(updatedTexts);
      setEditingText(newText);
      setTextDraft("");
      isDrawingRef.current = false;
      socket.emit("text-add", { roomId, text: { ...newText, userId: identity.id }, userId: identity.id });
      redrawCanvas();
      return;
    }

    if (dragRef.current) {
      const finalShape = shapesRef.current.find((s) => s.id === dragRef.current.shapeId);
      if (finalShape) socket.emit("shape-update", { roomId, shape: finalShape, userId: identity.id });

      if (dragRef.current?.mode === "text-drag") {
        const movedText = textsRef.current.find(t => t.id === dragRef.current.textId);
        socket.emit("text-update", { roomId, text: movedText, userId: identity.id });
      }

      if (dragRef.current?.mode === "text-resize") {
        const resizedText = textsRef.current.find(t => t.id === dragRef.current.textId);
        socket.emit("text-update", { roomId, text: resizedText, userId: identity.id });
      }

      dragRef.current = null;
      redrawOverlayCanvas();
      redrawStaticCanvas();
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
        socket.emit("shape-add", { roomId, shape: { ...newShape, userId: identity.id }, userId: identity.id });
      }
      shapeStartRef.current = null;
      previewShapeRef.current = null;
      redrawOverlayCanvas();
      redrawStaticCanvas();
      return;
    }

    if (isDrawingRef.current) {
      // Emit final segment if there is any unsent distance (downsampling cleanup)
      if (lastEmittedXRef.current !== null && (lastXRef.current !== lastEmittedXRef.current || lastYRef.current !== lastEmittedYRef.current)) {
        const drawData = {
          roomId,
          tool,
          strokeId: currentStrokeIdRef.current,
          timestamp: Date.now(),
          x1: lastEmittedXRef.current,
          y1: lastEmittedYRef.current,
          x2: lastXRef.current,
          y2: lastYRef.current,
          color: tool === "eraser" ? canvasColor : selectedColor,
          brushSize,
          userId: identity.id,
        };
        socket.emit("draw", drawData);

        const lastStroke = strokesRef.current[strokesRef.current.length - 1];
        if (!lastStroke || lastStroke[0].strokeId !== drawData.strokeId) {
          strokesRef.current = [...strokesRef.current, [drawData]];
        } else {
          lastStroke.push(drawData);
        }
      }

      isDrawingRef.current = false;
      redrawOverlayCanvas();
      redrawStaticCanvas();
    }
  };

  const deleteSelectedText = () => {
    if (!selectedTextIdRef.current) return;

    const updated =
      textsRef.current.filter(
        t => t.id !== selectedTextIdRef.current
      );

    textsRef.current = updated;
    setTexts(updated);

    socket.emit("text-delete", {
      roomId,
      textId: selectedTextIdRef.current,
      userId: identity.id,
    });

    setSelectedTextId(null);

    redrawCanvas(
      strokesRef.current,
      shapesRef.current
    );
  };

  const clearCanvas = () => {
    strokesRef.current = [];
    shapesRef.current = [];
    textsRef.current = [];
    setShapes([]);
    setTexts([]);
    setSelectedShapeId(null);
    setSelectedTextId(null);
    snapshotBase64Ref.current = null;
    snapshotImageRef.current = null;

    redrawCanvas();

    socket.emit("clear", { roomId, userId: identity.id });
    showStatus("Canvas cleared");
  };

  useEffect(() => {
    if (!roomId) return;
    const handleConnect = () => {
      socket.emit("join-room", roomId);
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);
    showStatus(`Joined "${title}"`);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [roomId, title]);

  useEffect(() => {
    const handleSaved = () => showStatus("Saved");
    socket.on("board-saved", handleSaved);
    return () => socket.off("board-saved", handleSaved);
  }, []);

  const deleteSelectedShape = () => {
    if (!selectedShapeIdRef.current) return;
    const shapeId = selectedShapeIdRef.current;
    const updated = shapesRef.current.filter((s) => s.id !== shapeId);
    shapesRef.current = updated;
    setShapes(updated);
    setSelectedShapeId(null);
    socket.emit("shape-delete", { roomId, shapeId, userId: identity.id });
    redrawCanvas(strokesRef.current, updated);
    showStatus("Shape deleted");
  };

  useEffect(() => {
    const handleKey = (e) => {
      if (e.key === "Delete" || e.key === "Backspace") {
        if (selectedShapeIdRef.current) {
          e.preventDefault();
          deleteSelectedShape();
        } else if (selectedTextIdRef.current) {
          e.preventDefault();
          deleteSelectedText();
        }
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
      <div className="wb-shell">

        <aside className="wb-sidebar">
          <div className="wb-logo" style={{ fontWeight: 600 }}>Artello</div>
          <SidebarBtn icon={<PenIcon />} label="Pen" active={tool === "pen"} onClick={() => setTool("pen")} />
          <SidebarBtn icon={<EraserIcon />} label="Eraser" active={tool === "eraser"} onClick={() => setTool("eraser")} />
          <SidebarBtn icon={<ShapeIcon />} label="Shapes" active={tool === "shape"} onClick={() => setTool("shape")} />
          <SidebarBtn icon={<SelectIcon />} label="Select & Move" active={tool === "select"} onClick={() => setTool("select")} />
          <SidebarBtn
            icon={<TextIcon />}
            label="Text"
            active={tool === "text"}
            onClick={() => setTool("text")}
          />
          <div className="wb-divider" />
        </aside>

        <div className="wb-main">
          <header className="wb-topbar">
            <div className="wb-topbar-left">
              <div className="wb-joined-badge">
                <div className="wb-joined-dot" />
                <span className="wb-board-title">{title}</span>
                <span className="wb-room-code">{roomId}</span>
              </div>
              <PresenceBar presenceList={presenceList} currentUser={identity} />
            </div>

            <div className="wb-topbar-right">
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
              {selectedTextId && (
                <>
                  <div className="wb-topbar-sep" />
                  <button className="wb-top-btn danger" onClick={deleteSelectedText}>
                    <TrashIcon /> Delete text
                  </button>
                </>
              )}

              {(selectedShapeId || selectedTextId) && (() => {
                const selectedItem = selectedShapeId
                  ? shapes.find(s => s.id === selectedShapeId)
                  : selectedTextId
                    ? texts.find(t => t.id === selectedTextId)
                    : null;

                if (!selectedItem) return null;

                return (
                  <>
                    <div className="wb-topbar-sep" />
                    <div className="wb-color-row">
                      <span className="wb-color-label">Recolor</span>
                      <div className="wb-color-swatch">
                        <div className="wb-color-preview" style={{ background: selectedItem.color || "#000000" }} />
                        <input
                          type="color"
                          value={selectedItem.color || "#000000"}
                          onChange={(e) => {
                            const newColor = e.target.value;
                            if (selectedShapeId) {
                              const updatedShapes = shapes.map(s =>
                                s.id === selectedShapeId ? { ...s, color: newColor } : s
                              );
                              setShapes(updatedShapes);
                              shapesRef.current = updatedShapes;
                              const updatedShape = updatedShapes.find(s => s.id === selectedShapeId);
                              socket.emit("shape-update", { roomId, shape: updatedShape, userId: identity.id });
                              redrawCanvas(strokesRef.current, updatedShapes);
                            } else if (selectedTextId) {
                              const updatedTexts = texts.map(t =>
                                t.id === selectedTextId ? { ...t, color: newColor } : t
                              );
                              setTexts(updatedTexts);
                              textsRef.current = updatedTexts;
                              const updatedText = updatedTexts.find(t => t.id === selectedTextId);
                              socket.emit("text-update", { roomId, text: updatedText, userId: identity.id });
                              redrawCanvas(strokesRef.current, shapesRef.current);
                            }
                          }}
                        />
                      </div>
                    </div>
                  </>
                );
              })()}

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
                  <input type="color" value={canvasColor} onChange={(e) => {
                    const color = e.target.value;
                    setCanvasColor(color);
                    socket.emit("canvas-color", { roomId, color });
                  }} />
                </div>
              </div>

              <div className="wb-topbar-sep" />

              <button className="wb-top-btn" onClick={() => { socket.emit("undo", { roomId, userId: identity.id }); showStatus("Undo"); }}>
                <UndoIcon /> Undo
              </button>
              <button className="wb-top-btn" onClick={() => { socket.emit("redo", { roomId, userId: identity.id }); showStatus("Redo"); }}>
                <RedoIcon /> Redo
              </button>
              <button className="wb-top-btn danger" onClick={clearCanvas}>
                <TrashIcon /> Clear
              </button>
              <button className="wb-top-btn" onClick={() => exportCanvasAsPNG(canvasRef.current)}>
                Export PNG
              </button>
            </div>
          </header>

          <div className="wb-canvas-wrap" >
            <div className="wb-canvas-container">
              <canvas
                ref={staticCanvasRef}
                className="wb-canvas wb-canvas-static"
                width={1100}
                height={650}
              />
              <canvas
                ref={canvasRef}
                className="wb-canvas wb-canvas-overlay"
                width={1100}
                height={650}
                style={{ cursor: getCursor(), touchAction: "none" }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
              />
              <CursorLayer remoteUsers={remoteUsers} canvasRef={canvasRef} />

              {editingText && (() => {
                const canvas = canvasRef.current;
                const rect = canvas?.getBoundingClientRect();
                const scaleX = rect ? canvas.width / rect.width : 1;
                const scaleY = rect ? canvas.height / rect.height : 1;

                return (
                  <textarea
                    autoFocus
                    value={textDraft}
                    onChange={(e) => setTextDraft(e.target.value)}
                    style={{
                      position: "absolute",
                      left: editingText.x / scaleX,
                      top: editingText.y / scaleY,
                      width: Math.abs(editingText.width) / scaleX,
                      height: Math.abs(editingText.height) / scaleY,
                      resize: "none",
                      border: "1px dashed #ff69b4",
                      background: "transparent",
                      outline: "none",
                      fontSize: `${20 / scaleX}px`,
                      color: editingText.color || selectedColor,
                      zIndex: 10,
                    }}
                    onBlur={() => {
                      const finalText = { ...editingText, text: textDraft };
                      const updatedTexts = textsRef.current.map(t =>
                        t.id === finalText.id ? finalText : t
                      );
                      textsRef.current = updatedTexts;
                      setTexts(updatedTexts);

                      setEditingText(null);
                      setTextDraft("");
                      socket.emit("text-update", { roomId, text: finalText, userId: identity.id });

                      redrawCanvas();
                    }}
                  />
                );
              })()}
            </div>
          </div>
        </div>
        <div className={`wb-status${statusMsg ? " visible" : ""}`}>
          {statusMsg}
        </div>
      </div>
    </>
  );
}
