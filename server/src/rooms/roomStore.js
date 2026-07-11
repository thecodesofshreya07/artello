const { loadBoard } = require("../services/boardPersistenceService");

const rooms = new Map(); // roomCode -> in-memory room state

function createEmptyRoom(overrides = {}) {
  return {
    events: [],
    undoneMap: {},
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
// Scoped to the acting user.
function popUserLastAction(room, userId) {
  const events = room.events;
  if (!events || events.length === 0) return null;

  // Find the last event matching the userId
  let lastMatchIndex = -1;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].userId === userId) {
      lastMatchIndex = i;
      break;
    }
  }

  if (lastMatchIndex === -1) return null;

  const lastEvent = events[lastMatchIndex];
  if (lastEvent.type !== "stroke") {
    // Single event action (shape-add, shape-update, shape-delete, text-add, text-update, text-delete, clear)
    events.splice(lastMatchIndex, 1);
    return [lastEvent];
  }

  // It's a stroke, retrieve all events with the same strokeId
  const strokeId = lastEvent.data.strokeId;
  const batch = [];
  const remainingEvents = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    if (ev.userId === userId && ev.type === "stroke" && ev.data?.strokeId === strokeId) {
      batch.push(ev);
    } else {
      remainingEvents.push(ev);
    }
  }
  room.events = remainingEvents;
  return batch;
}

function removeRoom(roomCode) {
  rooms.delete(roomCode);
}

module.exports = { rooms, getRoom, ensureRoom, popUserLastAction, removeRoom };
