require("dotenv").config();
const express = require("express");
const cors = require("cors");
const { createServer } = require("http");
const { Server } = require("socket.io");

const { connectDB } = require("./config/db");
const boardsRouter = require("./routes/boards");
const { registerSocketHandlers } = require("./sockets");
const { rooms } = require("./rooms/roomStore");
const { flushSave } = require("./services/boardPersistenceService");

async function main() {
  await connectDB();

  const app = express();
  app.use(cors());
  app.use(express.json());
  app.use("/api/boards", boardsRouter);

  const httpServer = createServer(app);
  const io = new Server(httpServer, { cors: { origin: "*" } });

  registerSocketHandlers(io);

  const PORT = process.env.PORT || 5000;
  httpServer.listen(PORT, () => console.log(`Server running on port ${PORT}`));

  // Best-effort flush of any dirty rooms on shutdown, so a deploy/restart
  // never loses the last few seconds of drawing.
  const shutdown = async () => {
    console.log("Shutting down, flushing unsaved boards...");
    await Promise.all(
      Array.from(rooms.entries()).map(([roomCode, room]) => flushSave(roomCode, room))
    );
    process.exit(0);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

main().catch((err) => {
  console.error("Fatal startup error:", err);
  process.exit(1);
});
