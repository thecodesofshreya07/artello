const express = require("express");
const cors = require("cors");
const { createServer } = require("http"); //import createServer fn from node's built in http module
const { Server } = require("socket.io"); //import Server class from socket.io
const app = express(); //creates an express/backend application
const httpServer = createServer(app); //raw http server made
//socket attaches to http server , http server attaches to express

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
    socket.on("draw", (drawData) => {
        console.log(drawData);
        socket.broadcast.emit("draw", drawData);
    });
});

httpServer.listen(5000, () => {
    console.log("server running on port 5000");
})
