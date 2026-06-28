const express = require("express");
const cors = require("cors");
const { createServer } = require("http"); //import createServer fn from node's built in http module
const { Server } = require("socket.io"); //import Server class from socket.io
const app = express(); //creates an express/backend application
const httpServer = createServer(app); //raw http server made
//socket attaches to http server , http server attaches to express
let drawingHistory = {};

//enabling middleware -ie my server will allow json and cors
app.use(cors());
app.use(express.json());

//attaching socket.io to http 
const io = new Server(httpServer, {
    cors: {
        origin: "*"
    }
});
//now clients <-> socket.io <-> http server <-> express

//listen for connections , evrry browser tab is a new socket 
io.on("connection", (socket) => {
    console.log("User connected: ", socket.id);
    socket.on("join-room", (roomId) => {
        socket.join(roomId);
        console.log(`User ${socket.id} joined room ${roomId}`);
        // send previous drawings
        if (drawingHistory[roomId]) {
            socket.emit("init-canvas", drawingHistory[roomId].actions);
        }
    });
    socket.on("draw", (data) => {
        const { roomId, ...drawData } = data;
        if (!drawingHistory[roomId]) {
            drawingHistory[roomId] = { actions: [], undone: [] };
        }
        drawingHistory[roomId].actions.push(drawData);
        socket.to(roomId).emit("draw", drawData);
    });

    socket.on("undo", (roomId) => {
        const room = drawingHistory[roomId];
        if (!room || room.actions.length === 0) return;
        const lastAction = room.actions.pop();
        room.undone.push(lastAction);
        io.to(roomId).emit("undo", room.actions);
    });

    socket.on("request-sync", (roomId) => {
        const room = drawingHistory[roomId];
        if (!room) return;
        socket.emit("init-canvas", room.actions || []);
    });

    socket.on("clear", (roomId) => {
        drawingHistory[roomId] = []; // reset history
        socket.to(roomId).emit("clear");
    });
});

httpServer.listen(5000, () => {
    console.log("server running on port 5000");
})
