const Board = require("../models/Board");
const { generateUniqueRoomCode } = require("../services/roomCodeService");

const EXPIRY_DAYS = Number(process.env.BOARD_EXPIRY_DAYS || 90);
function expiryDate() {
  return new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
}

async function createBoard(req, res) {
  const title = (req.body.title || "").trim();
  if (!title) return res.status(400).json({ error: "Title is required" });
  if (title.length > 120) return res.status(400).json({ error: "Title is too long" });

  const roomCode = await generateUniqueRoomCode();

  const board = await Board.create({
    roomCode,
    title,
    canvasColor: "#ffffff",
    strokes: [],
    shapes: [],
    texts: [],
    expiresAt: expiryDate(),
  });

  res.status(201).json({
    roomCode: board.roomCode,
    title: board.title,
  });
}

async function getBoard(req, res) {
  const roomCode = req.params.roomCode.toUpperCase();
  const board = await Board.findOne({ roomCode })
    .select("roomCode title canvasColor createdAt updatedAt")
    .lean();

  if (!board) return res.status(404).json({ error: "Board not found" });
  res.json(board);
}

module.exports = { createBoard, getBoard };
