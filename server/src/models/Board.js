const mongoose = require("mongoose");
const { Schema } = mongoose;

// One segment of a stroke - identical shape to the "draw" socket payload,
// minus roomId (which is implicit: it's this document).
const StrokeSegmentSchema = new Schema(
  {
    strokeId: String,
    userId: String,
    tool: String,
    x1: Number,
    y1: Number,
    x2: Number,
    y2: Number,
    color: String,
    brushSize: Number,
    timestamp: Number,
  },
  { _id: false }
);

const BoardSchema = new Schema(
  {
    roomCode: { type: String, required: true, unique: true, index: true, uppercase: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    canvasColor: { type: String, default: "#ffffff" },

    // Compacted SNAPSHOT of the board, not a raw append-only event log.
    // strokes: array of strokes, each stroke = array of its segments
    // (same shape the client already keeps in strokesRef.current).
    strokes: { type: [[StrokeSegmentSchema]], default: [] },

    // Shapes/texts vary a lot by type (rectangle vs star vs arrow, etc.),
    // so Mixed keeps this schema from having to duplicate every shape
    // variant's fields. They're keyed by id and already fully-resolved
    // (deletes/updates applied) by the time they're saved here.
    shapes: { type: [Schema.Types.Mixed], default: [] },
    texts: { type: [Schema.Types.Mixed], default: [] },
    snapshot: { type: String, default: null },

    // TTL: MongoDB automatically deletes the document once this passes.
    // Refreshed on every save (see boardPersistenceService), so any board
    // that's actually being used never expires - only abandoned ones do.
    expiresAt: { type: Date, index: { expires: 0 } },
    createdAt: { type: Date, default: Date.now, index: { expires: '3d' } },
  },
  { timestamps: true } // adds createdAt / updatedAt
);

module.exports = mongoose.model("Board", BoardSchema);
