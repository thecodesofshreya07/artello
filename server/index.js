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

let drawingHistory = {};

function initRoom(roomId) {
    if (!drawingHistory[roomId]) {
        drawingHistory[roomId] = {
            events: [],
            undone: [],
            canvasColor: "#ffffff"   // NEW
        };
    }
}

// A freehand stroke is logged as one event PER mouse-move segment, so a
// single stroke can be dozens of individual "stroke" events in a row. If
// undo only popped one event at a time, clicking Undo once would shave a
// single pixel-sized segment off the end of the stroke — visually almost
// imperceptible. Instead we treat the whole run of same-strokeId events as
// one undoable action, same as a single shape/text add/update/delete.
function popLastAction(room) {
    const events = room.events;
    if (events.length === 0) return null;

    const last = events[events.length - 1];
    if (last.type !== "stroke") {
        return [events.pop()];
    }

    const strokeId = last.data.strokeId;
    const batch = [];
    while (
        events.length > 0 &&
        events[events.length - 1].type === "stroke" &&
        events[events.length - 1].data.strokeId === strokeId
    ) {
        batch.unshift(events.pop());
    }
    return batch;
}

io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
        initRoom(roomId);

        const room = drawingHistory[roomId];
        // Send both stroke history and shapes to the joining user
        socket.emit("init-canvas", {
            events: room.events,
            canvasColor: room.canvasColor   // NEW
        });
    });


    socket.on("draw", (data) => {
        const { roomId, ...drawData } = data;
        initRoom(roomId);
        const event = {
            id: drawData.strokeId,
            type: "stroke",
            data: drawData,
            timestamp: Date.now()
        };
        drawingHistory[roomId].events.push(event);
        drawingHistory[roomId].undone = [];
        socket.to(roomId).emit("event", event);
    });


    socket.on("shape-add", (data) => {
        const { roomId, shape } = data;
        initRoom(roomId);

        const room = drawingHistory[roomId];
        const event = {
            id: shape.id,
            type: "shape-add",
            data: shape,
            timestamp: Date.now()
        };

        drawingHistory[roomId].events.push(event);
        drawingHistory[roomId].undone = [];

        socket.to(roomId).emit("event", event);
    });


    socket.on("shape-update", (data) => {
        const { roomId, shape } = data;
        initRoom(roomId);

        const event = {
            id: shape.id,
            type: "shape-update",
            data: shape,
            timestamp: Date.now()
        };

        drawingHistory[roomId].events.push(event);
        drawingHistory[roomId].undone = [];

        socket.to(roomId).emit("event", event);
    });


    socket.on("shape-delete", (data) => {
        const { roomId, shapeId } = data;
        initRoom(roomId);

        const event = {
            id: shapeId,
            type: "shape-delete",
            data: { shapeId },
            timestamp: Date.now()
        };

        drawingHistory[roomId].events.push(event);
        drawingHistory[roomId].undone = [];

        socket.to(roomId).emit("event", event);
    });

    socket.on("text-add", (data) => {
        const { roomId, text } = data;
        initRoom(roomId);

        const event = {
            id: text.id,
            type: "text-add",
            data: text,
            timestamp: Date.now()
        };

        drawingHistory[roomId].events.push(event);
        drawingHistory[roomId].undone = [];
        socket.to(roomId).emit("event", event);
    });

    socket.on("text-update", (data) => {
        const { roomId, text } = data;
        initRoom(roomId);

        const event = {
            id: text.id,
            type: "text-update",
            data: text,
            timestamp: Date.now()
        };

        drawingHistory[roomId].events.push(event);
        drawingHistory[roomId].undone = [];
        socket.to(roomId).emit("event", event);
    });

    socket.on("canvas-color", (data) => {
    const { roomId, color } = data;
    initRoom(roomId);
    drawingHistory[roomId].canvasColor = color;
    socket.to(roomId).emit("canvas-color", color);
});

    socket.on("undo", (roomId) => {
        initRoom(roomId);
        const room = drawingHistory[roomId];

        const batch = popLastAction(room);
        if (!batch) return;

        // push into redo stack as one unit
        room.undone.push(batch);

        // Undo removes a whole action from history. There's no generic way
        // to "subtract" its visual effect on the client, so instead we tell
        // everyone to rebuild the canvas from the (now shorter) event log.
        io.to(roomId).emit("canvas-sync", { events: room.events });
    });

    socket.on("redo", (roomId) => {
        initRoom(roomId);
        const room = drawingHistory[roomId];

        if (room.undone.length === 0) return;

        const batch = room.undone.pop();

        // re-add the whole action to the main timeline
        room.events.push(...batch);

        io.to(roomId).emit("canvas-sync", { events: room.events });
    });

    socket.on("clear", (roomId) => {
        initRoom(roomId);
        const room = drawingHistory[roomId];

        const event = {
            id: "clear-" + Date.now(),
            type: "clear",
            data: {},
            timestamp: Date.now()
        };

        room.events.push(event);
        room.undone = []; // IMPORTANT

        socket.to(roomId).emit("event", event);
    });

    socket.on("request-sync", (roomId) => {
        initRoom(roomId);
        const room = drawingHistory[roomId];
        socket.emit("init-canvas", {
            events: room.events,
            canvasColor: room.canvasColor   // NEW
        });
    });

    socket.on("disconnect", () => {
        console.log("User disconnected:", socket.id);
    });
});

httpServer.listen(5000, () => {
    console.log("Server running on port 5000");
});