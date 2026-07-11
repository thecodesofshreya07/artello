const { ensureRoom, getRoom, removeRoom } = require("../rooms/roomStore");
const { flushSave } = require("../services/boardPersistenceService");

function registerRoomHandlers(io, socket) {
  socket.on("join-room", async (roomCode) => {
    try {
      socket.join(roomCode);
      socket.data.roomCode = roomCode;
      console.log(`User ${socket.id} joined room ${roomCode}`);

      const room = await ensureRoom(roomCode);

      socket.emit("init-canvas", {
        events: room.events,
        canvasColor: room.canvasColor,
        title: room.title,
      });
    } catch (err) {
      console.error(`join-room failed for ${roomCode}:`, err);
      socket.emit("room-error", { message: "Could not load this board. Please try again." });
    }
  });

  socket.on("request-sync", async (roomCode) => {
    const room = await ensureRoom(roomCode);
    socket.emit("init-canvas", {
      events: room.events,
      canvasColor: room.canvasColor,
      title: room.title,
    });
  });

  // "disconnecting" (unlike "disconnect") still has access to socket.rooms,
  // so we can tell which rooms this socket is about to leave and check
  // whether it was the last person there.
  socket.on("disconnecting", () => {
    for (const roomCode of socket.rooms) {
      if (roomCode === socket.id) continue; // socket.io's own default room
      const remaining = (io.sockets.adapter.rooms.get(roomCode)?.size || 1) - 1;
      if (remaining <= 0) {
        const room = getRoom(roomCode);
        if (room) {
          flushSave(roomCode, room).then(() => removeRoom(roomCode));
        }
      }
    }
  });
}

module.exports = { registerRoomHandlers };
