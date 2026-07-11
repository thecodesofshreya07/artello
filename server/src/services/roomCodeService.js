const Board = require("../models/Board");

// No 0/O/1/I - avoids ambiguity when a code is read aloud or hand-typed.
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function randomCode(length = 6) {
  let code = "";
  for (let i = 0; i < length; i++) {
    code += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  }
  return code;
}

async function generateUniqueRoomCode() {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = randomCode();
    const exists = await Board.exists({ roomCode: code });
    if (!exists) return code;
  }
  // Astronomically unlikely to ever reach this, but widen instead of failing.
  return randomCode(8);
}

module.exports = { generateUniqueRoomCode };
