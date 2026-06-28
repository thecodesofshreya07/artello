import React, { useRef, useEffect, useState } from "react";
import { socket } from "../services/socket";

export default function CanvasBoard() {
    // Stores the canvas DOM element
    const canvasRef = useRef(null);
    // Stores the drawing context (pen)
    const contextRef = useRef(null);
    // Tracks whether the user is currently drawing
    const isDrawingRef = useRef(false);
    // Stores previous mouse coordinates
    const lastXRef = useRef(0);
    const lastYRef = useRef(0);

    // Brush settings
    const [brushSize, setBrushSize] = useState(4);
    const [selectedColor, setSelectedColor] = useState("#000000");

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext("2d");
        contextRef.current = ctx;
        // Better-looking strokes
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        console.log(contextRef.current);
    }, []);

    useEffect(() => {
        const handleRemoteDraw = (drawData) => {
            const ctx = contextRef.current;

            ctx.strokeStyle = drawData.color;
            ctx.lineWidth = drawData.brushSize;

            ctx.beginPath();
            ctx.moveTo(drawData.x1, drawData.y1);
            ctx.lineTo(drawData.x2, drawData.y2);
            ctx.stroke();
        };

        socket.on("draw", handleRemoteDraw);

        return () => {
            socket.off("draw", handleRemoteDraw);
        };
    }, []);

    const startDrawing = (e) => {
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        lastXRef.current = x;
        lastYRef.current = y;
        isDrawingRef.current = true;
        console.log("Drawing started");
    };

    const stopDrawing = () => {
        isDrawingRef.current = false;
        console.log("Drawing stopped");
    };

    const draw = (e) => {
        if (!isDrawingRef.current) return;
        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const ctx = contextRef.current;
        ctx.lineWidth = brushSize;
        ctx.strokeStyle = selectedColor;
        ctx.beginPath();
        ctx.moveTo(lastXRef.current, lastYRef.current);
        ctx.lineTo(x, y);
        ctx.stroke();
        const drawData = {
            x1: lastXRef.current,
            y1: lastYRef.current,
            x2: x,
            y2: y,
            color: selectedColor,
            brushSize: brushSize,
        };
        socket.emit("draw", drawData);
        lastXRef.current = x;
        lastYRef.current = y;
    };

    const clearCanvas = () => {
        const canvas = canvasRef.current;
        const ctx = contextRef.current;

        ctx.clearRect(0, 0, canvas.width, canvas.height);
    };

    return (
        <>
            <div style={{ marginBottom: "10px" }}>
                <input
                    type="range"
                    min="1"
                    max="20"
                    value={brushSize}
                    onChange={(e) => setBrushSize(Number(e.target.value))}
                />

                <span style={{ marginLeft: "10px", marginRight: "20px" }}>
                    Brush Size: {brushSize}
                </span>

                <input
                    type="color"
                    value={selectedColor}
                    onChange={(e) => setSelectedColor(e.target.value)}
                />

                <button
                    onClick={clearCanvas}
                    style={{ marginLeft: "20px" }}
                >
                    Clear
                </button>
            </div>

            <canvas
                ref={canvasRef}
                width={800}
                height={500}
                style={{
                    border: "2px solid black",
                }}
                onMouseDown={startDrawing}
                onMouseMove={draw}
                onMouseUp={stopDrawing}
                onMouseLeave={stopDrawing}
            />
        </>
    );
}