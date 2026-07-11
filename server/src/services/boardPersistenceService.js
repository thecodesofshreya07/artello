const Board = require("../models/Board");
const { buildSnapshotFromEvents, buildEventsFromSnapshot } = require("./snapshotService");

const DEBOUNCE_MS = 3000;   // save 3s after the last change, so bursts of activity coalesce into one write
const MAX_WAIT_MS = 20000;  // ...but a continuously-active room still gets saved at least this often
const EXPIRY_DAYS = Number(process.env.BOARD_EXPIRY_DAYS || 90);

function expiryDate() {
  return new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

/**
 * Loads a board's saved state from MongoDB and returns everything needed to
 * bootstrap an in-memory room (see rooms/roomStore.js). Returns null if no
 * board exists for that code.
 */
async function loadBoard(roomCode) {
  const board = await Board.findOne({ roomCode }).lean();
  if (!board) return null;

  return {
    title: board.title,
    canvasColor: board.canvasColor,
    events: buildEventsFromSnapshot(board),
  };
}

/**
 * Immediately persists a room's current state. Called directly on
 * room-empty / server shutdown; called (debounced) after every drawing
 * action otherwise.
 */
async function saveBoardNow(roomCode, room, io) {
  const snapshot = buildSnapshotFromEvents(room.events);

  await Board.findOneAndUpdate(
    { roomCode },
    {
      $set: {
        canvasColor: room.canvasColor,
        strokes: snapshot.strokes,
        shapes: snapshot.shapes,
        texts: snapshot.texts,
        expiresAt: expiryDate(),
      },
    }
    // no upsert: the row is created by the REST "create board" endpoint;
    // sockets only ever update an existing board.
  );

  room.dirty = false;
  room.lastSavedAt = Date.now();

  if (io) io.to(roomCode).emit("board-saved", { at: room.lastSavedAt });
}

/**
 * Call this after every mutation to a room. Schedules a debounced save,
 * with a hard upper bound (MAX_WAIT_MS) so long, continuously-active
 * sessions still get saved periodically instead of only once activity stops.
 */
function scheduleSave(roomCode, room, io) {
  room.dirty = true;
  if (!room._firstDirtyAt) room._firstDirtyAt = Date.now();
  clearTimeout(room._saveTimer);

  const elapsedSinceFirstDirty = Date.now() - room._firstDirtyAt;
  const delay = elapsedSinceFirstDirty >= MAX_WAIT_MS ? 0 : DEBOUNCE_MS;

  room._saveTimer = setTimeout(async () => {
    room._firstDirtyAt = null;
    try {
      await saveBoardNow(roomCode, room, io);
    } catch (err) {
      console.error(`Failed to autosave board ${roomCode}:`, err);
    }
  }, delay);
}

/** Saves immediately and cancels any pending debounce timer. */
async function flushSave(roomCode, room) {
  clearTimeout(room._saveTimer);
  room._firstDirtyAt = null;
  if (!room.dirty) return;
  try {
    await saveBoardNow(roomCode, room);
  } catch (err) {
    console.error(`Failed to flush-save board ${roomCode}:`, err);
  }
}

module.exports = { loadBoard, saveBoardNow, scheduleSave, flushSave };
