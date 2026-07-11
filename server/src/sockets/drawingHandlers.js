const { ensureRoom, popLastAction } = require("../rooms/roomStore");
const { scheduleSave } = require("../services/boardPersistenceService");

function registerDrawingHandlers(io, socket) {
  function pushEvent(room, roomCode, event) {
    room.events.push(event);
    room.undone = [];
    scheduleSave(roomCode, room, io);
  }

  socket.on("draw", async (data) => {
    const { roomId: roomCode, ...drawData } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: drawData.strokeId, type: "stroke", data: drawData, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("shape-add", async (data) => {
    const { roomId: roomCode, shape } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: shape.id, type: "shape-add", data: shape, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("shape-update", async (data) => {
    const { roomId: roomCode, shape } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: shape.id, type: "shape-update", data: shape, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("shape-delete", async (data) => {
    const { roomId: roomCode, shapeId } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: shapeId, type: "shape-delete", data: { shapeId }, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("text-add", async (data) => {
    const { roomId: roomCode, text } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: text.id, type: "text-add", data: text, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("text-update", async (data) => {
    const { roomId: roomCode, text } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: text.id, type: "text-update", data: text, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("text-delete", async (data) => {
    const { roomId: roomCode, textId } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: textId, type: "text-delete", data: { textId }, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("clear", async (roomCode) => {
    const room = await ensureRoom(roomCode);
    const event = { id: "clear-" + Date.now(), type: "clear", data: {}, timestamp: Date.now() };
    room.events.push(event);
    room.undone = [];
    scheduleSave(roomCode, room, io);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("canvas-color", async (data) => {
    const { roomId: roomCode, color } = data;
    const room = await ensureRoom(roomCode);
    room.canvasColor = color;
    scheduleSave(roomCode, room, io);
    socket.to(roomCode).emit("canvas-color", color);
  });

  socket.on("undo", async (roomCode) => {
    const room = await ensureRoom(roomCode);
    const batch = popLastAction(room);
    if (!batch) return;
    room.undone.push(batch);
    scheduleSave(roomCode, room, io);
    io.to(roomCode).emit("canvas-sync", { events: room.events });
  });

  socket.on("redo", async (roomCode) => {
    const room = await ensureRoom(roomCode);
    if (room.undone.length === 0) return;
    const batch = room.undone.pop();
    room.events.push(...batch);
    scheduleSave(roomCode, room, io);
    io.to(roomCode).emit("canvas-sync", { events: room.events });
  });
}

module.exports = { registerDrawingHandlers };
