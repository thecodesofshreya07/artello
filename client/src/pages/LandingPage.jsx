import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBoard, getBoard } from "../services/api";

export default function LandingPage() {
  const [mode, setMode] = useState("create"); // "create" | "join"
  const [title, setTitle] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!title.trim()) return setError("Give your board a title");
    setLoading(true);
    setError("");
    try {
      const board = await createBoard(title.trim());
      // "justCreated" tells BoardPage to pop the share modal immediately
      navigate(`/room/${board.roomCode}`, { state: { justCreated: true } });
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (!code) return setError("Enter a room code");
    setLoading(true);
    setError("");
    try {
      await getBoard(code); // validate it exists before navigating away
      navigate(`/room/${code}`);
    } catch (err) {
      setError("No board found with that code");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="landing-shell">
      <h1 className="landing-logo">Artello</h1>
      <p className="landing-tagline">
        A lightweight collaborative whiteboard. No sign-up, just share a link.
      </p>

      <div className="landing-tabs">
        <button className={mode === "create" ? "active" : ""} onClick={() => setMode("create")}>
          Create Board
        </button>
        <button className={mode === "join" ? "active" : ""} onClick={() => setMode("join")}>
          Join Board
        </button>
      </div>

      {mode === "create" ? (
        <form onSubmit={handleCreate} className="landing-form">
          <input
            autoFocus
            placeholder="Board title (e.g. Sprint Planning)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Board"}
          </button>
        </form>
      ) : (
        <form onSubmit={handleJoin} className="landing-form">
          <input
            autoFocus
            placeholder="Room code (e.g. ABC123)"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
            maxLength={8}
          />
          <button type="submit" disabled={loading}>
            {loading ? "Joining..." : "Join Board"}
          </button>
        </form>
      )}

      {error && <p className="landing-error">{error}</p>}
    </div>
  );
}
