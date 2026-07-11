const { loadBoard } = require("../services/boardPersistenceService");

const rooms = new Map(); // roomCode -> in-memory room state

function createEmptyRoom(overrides = {}) {
  return {
    events: [],
    undone: [],
    canvasColor: "#ffffff",
    title: "",
    dirty: false,
    _saveTimer: null,
    _firstDirtyAt: null,
    lastSavedAt: null,
    ...overrides,
  };
}

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

/**
 * Ensures a room exists in memory, loading it from MongoDB on first access
 * (e.g. the first user to join after a server restart, or the first user
 * ever for a brand-new board). Subsequent joins during the same server
 * lifetime reuse the in-memory copy - no repeated DB reads per action.
 */
async function ensureRoom(roomCode) {
  let room = rooms.get(roomCode);
  if (room) return room;

  const saved = await loadBoard(roomCode);
  room = createEmptyRoom(
    saved ? { events: saved.events, canvasColor: saved.canvasColor, title: saved.title } : {}
  );
  rooms.set(roomCode, room);
  return room;
}

// A freehand stroke is logged as one event PER mouse-move segment, so a
// single stroke can be dozens of individual "stroke" events in a row. If
// undo only popped one event at a time, clicking Undo once would shave a
// single pixel-sized segment off the end of the stroke - visually almost
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

function removeRoom(roomCode) {
  rooms.delete(roomCode);
}

module.exports = { rooms, getRoom, ensureRoom, popLastAction, removeRoom };
