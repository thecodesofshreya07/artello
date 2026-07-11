const roomUsers = new Map(); // roomCode -> Map(socketId -> user)

function getRoomUserList(roomCode) {
  return Array.from(roomUsers.get(roomCode)?.values() ?? []);
}

function registerPresenceHandlers(io, socket) {
  socket.on("presence-join", ({ roomId: roomCode, user }) => {
    if (!roomUsers.has(roomCode)) roomUsers.set(roomCode, new Map());
    roomUsers.get(roomCode).set(socket.id, user);
    io.to(roomCode).emit("presence-list", getRoomUserList(roomCode));
  });

  socket.on("presence-tool", ({ roomId: roomCode, tool }) => {
    const users = roomUsers.get(roomCode);
    const entry = users?.get(socket.id);
    if (entry) entry.tool = tool;
  });

  socket.on("cursor-move", (data) => {
    socket.to(data.roomId).emit("cursor-move", data);
  });

  socket.on("disconnect", () => {
    for (const [roomCode, users] of roomUsers.entries()) {
      if (users.has(socket.id)) {
        users.delete(socket.id);
        io.to(roomCode).emit("presence-list", getRoomUserList(roomCode));
        io.to(roomCode).emit("presence-left", socket.id);
      }
    }
  });
}

module.exports = { registerPresenceHandlers };
