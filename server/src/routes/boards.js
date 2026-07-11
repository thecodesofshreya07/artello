const express = require("express");
const { createBoard, getBoard } = require("../controllers/boardController");

const router = express.Router();

router.post("/", createBoard);
router.get("/:roomCode", getBoard);

module.exports = router;
