const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const app = express();
const httpServer = createServer(app);

app.use(cors());
app.use(express.json());

const io = new Server(httpServer, {
    cors: { origin: "*" }
});

/**
 * drawingHistory[roomId] = {
 *   actions: [ [segment, segment, ...], ... ],   // freehand strokes
 *   shapes:  [ shapeObj, ... ],                  // shape objects
 *   undone:  [ { kind: "stroke"|"shape", data }, ... ]  // unified undo stack
 * }
 */
let drawingHistory = {};

function initRoom(roomId) {
    if (!drawingHistory[roomId]) {
        drawingHistory[roomId] = {
            actions: [],
            shapes: [],
            undone: []
        };
    }
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    // ─── JOIN ROOM ──────────────────────────────────────────────────────────────
    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
        initRoom(roomId);

        const room = drawingHistory[roomId];
        // Send both stroke history and shapes to the joining user
        socket.emit("init-canvas", {
            actions: room.actions,
            shapes: room.shapes
        });
    });

    // ─── FREEHAND DRAW ──────────────────────────────────────────────────────────
    socket.on("draw", (data) => {
        const { roomId, ...drawData } = data;
        initRoom(roomId);

        const room = drawingHistory[roomId];
        const lastStroke = room.actions[room.actions.length - 1];

        if (!lastStroke || lastStroke[0].strokeId !== drawData.strokeId) {
            room.actions.push([drawData]);
        } else {
            lastStroke.push(drawData);
        }

        // Clear undone stack on any new draw action
        room.undone = [];

        socket.to(roomId).emit("draw", drawData);
    });

    // ─── SHAPE ADD ──────────────────────────────────────────────────────────────
    socket.on("shape-add", (data) => {
        const { roomId, shape } = data;
        initRoom(roomId);

        const room = drawingHistory[roomId];
        room.shapes.push(shape);
        room.undone = [];

        // Broadcast to everyone including sender confirmation
        io.to(roomId).emit("shape-add", shape);
    });

    // ─── SHAPE UPDATE (drag / resize) ───────────────────────────────────────────
    socket.on("shape-update", (data) => {
        const { roomId, shape } = data;
        initRoom(roomId);

        const room = drawingHistory[roomId];
        const idx = room.shapes.findIndex((s) => s.id === shape.id);
        if (idx !== -1) {
            room.shapes[idx] = shape;
        }

        socket.to(roomId).emit("shape-update", shape);
    });

    // ─── SHAPE DELETE ───────────────────────────────────────────────────────────
    socket.on("shape-delete", (data) => {
        const { roomId, shapeId } = data;
        initRoom(roomId);

        const room = drawingHistory[roomId];
        const idx = room.shapes.findIndex((s) => s.id === shapeId);
        if (idx !== -1) {
            const removed = room.shapes.splice(idx, 1)[0];
            room.undone = [];
            io.to(roomId).emit("shape-delete", shapeId);
        }
    });

    // ─── UNDO ───────────────────────────────────────────────────────────────────
    socket.on("undo", (roomId) => {
        initRoom(roomId);
        const room = drawingHistory[roomId];

        // Determine what was added last: a stroke or a shape
        const lastStrokeTime = room.actions.length > 0
            ? (room.actions[room.actions.length - 1][0]?.timestamp ?? 0)
            : 0;
        const lastShapeTime = room.shapes.length > 0
            ? (room.shapes[room.shapes.length - 1]?.timestamp ?? 0)
            : 0;

        if (lastStrokeTime === 0 && lastShapeTime === 0) return;

        if (lastShapeTime > lastStrokeTime) {
            // Undo a shape
            const removed = room.shapes.pop();
            room.undone.push({ kind: "shape", data: removed });
            io.to(roomId).emit("undo", {
                actions: room.actions,
                shapes: room.shapes
            });
        } else {
            // Undo a stroke
            const removed = room.actions.pop();
            room.undone.push({ kind: "stroke", data: removed });
            io.to(roomId).emit("undo", {
                actions: room.actions,
                shapes: room.shapes
            });
        }
    });

    // ─── REDO ───────────────────────────────────────────────────────────────────
    socket.on("redo", (roomId) => {
        initRoom(roomId);
        const room = drawingHistory[roomId];
        if (room.undone.length === 0) return;

        const entry = room.undone.pop();
        if (entry.kind === "shape") {
            room.shapes.push(entry.data);
        } else {
            room.actions.push(entry.data);
        }

        io.to(roomId).emit("redo", {
            actions: room.actions,
            shapes: room.shapes
        });
    });

    // ─── CLEAR ──────────────────────────────────────────────────────────────────
    socket.on("clear", (roomId) => {
        drawingHistory[roomId] = {
            actions: [],
            shapes: [],
            undone: []
        };
        io.to(roomId).emit("clear");
    });

    // ─── REQUEST SYNC ───────────────────────────────────────────────────────────
    socket.on("request-sync", (roomId) => {
        initRoom(roomId);
        const room = drawingHistory[roomId];
        socket.emit("init-canvas", {
            actions: room.actions,
            shapes: room.shapes
        });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

httpServer.listen(5000, () => {
    console.log("Server running on port 5000");
});