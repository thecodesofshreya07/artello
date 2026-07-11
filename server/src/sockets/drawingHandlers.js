const { ensureRoom, popUserLastAction } = require("../rooms/roomStore");
const { scheduleSave } = require("../services/boardPersistenceService");

function registerDrawingHandlers(io, socket) {
  const FLATTEN_THRESHOLD = 400;

  function pushEvent(room, roomCode, event) {
    room.events.push(event);
    if (!room.undoneMap) {
      room.undoneMap = {};
    }
    room.undoneMap[event.userId] = [];
    scheduleSave(roomCode, room, io);

    // Request client-side flattening if event count exceeds the threshold
    if (room.events.length > FLATTEN_THRESHOLD && !room._flatteningInProgress) {
      room._flatteningInProgress = true;
      room._flatteningEventsLength = room.events.length;
      socket.emit("request-snapshot", { roomId: roomCode });
    }
  }

  socket.on("draw", async (data) => {
    const { roomId: roomCode, ...drawData } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: drawData.strokeId, type: "stroke", userId: drawData.userId, data: drawData, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("shape-add", async (data) => {
    const { roomId: roomCode, shape, userId } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: shape.id, type: "shape-add", userId, data: shape, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("shape-update", async (data) => {
    const { roomId: roomCode, shape, userId } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: shape.id, type: "shape-update", userId, data: shape, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("shape-delete", async (data) => {
    const { roomId: roomCode, shapeId, userId } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: shapeId, type: "shape-delete", userId, data: { shapeId }, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("text-add", async (data) => {
    const { roomId: roomCode, text, userId } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: text.id, type: "text-add", userId, data: text, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("text-update", async (data) => {
    const { roomId: roomCode, text, userId } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: text.id, type: "text-update", userId, data: text, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("text-delete", async (data) => {
    const { roomId: roomCode, textId, userId } = data;
    const room = await ensureRoom(roomCode);
    const event = { id: textId, type: "text-delete", userId, data: { textId }, timestamp: Date.now() };
    pushEvent(room, roomCode, event);
    socket.to(roomCode).emit("event", event);
  });

  socket.on("clear", async (data) => {
    const { roomId: roomCode, userId } = typeof data === "string" ? { roomId: data } : data;
    const room = await ensureRoom(roomCode);
    const event = { id: "clear-" + Date.now(), type: "clear", userId, data: {}, timestamp: Date.now() };
    room.events.push(event);
    if (!room.undoneMap) {
      room.undoneMap = {};
    }
    room.undoneMap[userId] = [];
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

  socket.on("undo", async (data) => {
    const { roomId: roomCode, userId } = typeof data === "string" ? { roomId: data } : data;
    const room = await ensureRoom(roomCode);
    const batch = popUserLastAction(room, userId);
    if (!batch) return;
    if (!room.undoneMap) room.undoneMap = {};
    if (!room.undoneMap[userId]) room.undoneMap[userId] = [];
    room.undoneMap[userId].push(batch);
    if (room.undoneMap[userId].length > 50) {
      room.undoneMap[userId].shift();
    }
    scheduleSave(roomCode, room, io);
    io.to(roomCode).emit("canvas-sync", { events: room.events });
  });

  socket.on("redo", async (data) => {
    const { roomId: roomCode, userId } = typeof data === "string" ? { roomId: data } : data;
    const room = await ensureRoom(roomCode);
    if (!room.undoneMap || !room.undoneMap[userId] || room.undoneMap[userId].length === 0) return;
    const batch = room.undoneMap[userId].pop();
    room.events.push(...batch);
    scheduleSave(roomCode, room, io);
    io.to(roomCode).emit("canvas-sync", { events: room.events });
  });

  socket.on("submit-snapshot", async (data) => {
    const { roomId: roomCode, base64 } = data;
    const room = await ensureRoom(roomCode);
    if (!room || !room._flatteningInProgress) return;

    const N = room._flatteningEventsLength || room.events.length;
    room._flatteningInProgress = false;
    room._flatteningEventsLength = null;

    const snapshotEvent = {
      id: "snapshot-" + Date.now(),
      type: "snapshot",
      userId: "server",
      data: { image: base64 },
      timestamp: Date.now(),
    };

    const subsequentEvents = room.events.slice(N);
    room.events = [snapshotEvent, ...subsequentEvents];
    room.undoneMap = {};

    scheduleSave(roomCode, room, io);
    io.to(roomCode).emit("canvas-sync", { events: room.events });
  });
}

module.exports = { registerDrawingHandlers };
