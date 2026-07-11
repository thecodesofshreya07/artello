const { registerRoomHandlers } = require("./roomHandlers");
const { registerDrawingHandlers } = require("./drawingHandlers");
const { registerPresenceHandlers } = require("./presenceHandlers");

function registerSocketHandlers(io) {
  io.on("connection", (socket) => {
    console.log("User connected:", socket.id);

    registerRoomHandlers(io, socket);
    registerDrawingHandlers(io, socket);
    registerPresenceHandlers(io, socket);

    socket.on("disconnect", () => {
      console.log("User disconnected:", socket.id);
    });
  });
}

module.exports = { registerSocketHandlers };
