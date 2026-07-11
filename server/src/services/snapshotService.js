/**
 * Reduces a flat in-memory event log into the compacted snapshot shape we
 * persist to MongoDB: grouped strokes, keyed shapes/texts with deletes and
 * updates already applied. This is the same reduction the client performs
 * live via applyEvent - done here so we never write the raw, unbounded
 * per-mouse-move event log to the database.
 */
function buildSnapshotFromEvents(events) {
  const strokesById = new Map(); // strokeId -> segment[]
  const strokeOrder = [];
  const shapesById = new Map();
  const textsById = new Map();

  for (const event of events) {
    switch (event.type) {
      case "stroke": {
        const id = event.data.strokeId;
        if (!strokesById.has(id)) {
          strokesById.set(id, []);
          strokeOrder.push(id);
        }
        strokesById.get(id).push(event.data);
        break;
      }
      case "shape-add":
      case "shape-update":
        shapesById.set(event.data.id, event.data);
        break;
      case "shape-delete":
        shapesById.delete(event.data.shapeId);
        break;
      case "text-add":
      case "text-update":
        textsById.set(event.data.id, event.data);
        break;
      case "text-delete":
        textsById.delete(event.data.textId);
        break;
      case "clear":
        strokesById.clear();
        strokeOrder.length = 0;
        shapesById.clear();
        textsById.clear();
        break;
      default:
        break;
    }
  }

  return {
    strokes: strokeOrder.map((id) => strokesById.get(id)),
    shapes: Array.from(shapesById.values()),
    texts: Array.from(textsById.values()),
  };
}

/**
 * The inverse operation: turns a persisted snapshot back into a synthetic
 * event log so a freshly-loaded room can be driven through the exact same
 * join-room / init-canvas / applyEvent path a room that's been live the
 * whole time uses. This is what makes DB-backed rooms indistinguishable
 * from in-memory-only rooms, from the client's point of view.
 */
function buildEventsFromSnapshot(snapshot) {
  const events = [];

  (snapshot.strokes || []).forEach((segments) => {
    segments.forEach((seg) => {
      events.push({
        id: seg.strokeId,
        type: "stroke",
        userId: seg.userId,
        data: seg,
        timestamp: seg.timestamp || Date.now(),
      });
    });
  });

  (snapshot.shapes || []).forEach((shape) => {
    events.push({
      id: shape.id,
      type: "shape-add",
      userId: shape.userId,
      data: shape,
      timestamp: shape.timestamp || Date.now(),
    });
  });

  (snapshot.texts || []).forEach((text) => {
    events.push({
      id: text.id,
      type: "text-add",
      userId: text.userId,
      data: text,
      timestamp: Date.now(),
    });
  });

  return events;
}

module.exports = { buildSnapshotFromEvents, buildEventsFromSnapshot };
