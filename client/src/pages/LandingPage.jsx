import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createBoard, getBoard } from "../services/api";

export default function LandingPage() {
  const [mode, setMode] = useState("create");
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
      await getBoard(code);
      navigate(`/room/${code}`);
    } catch (err) {
      setError("No board found with that code");
    } finally {
      setLoading(false);
    }
  };

  return (
     <div className="landing-shell">
    <header className="landing-header">
  <div className="landing-logo-top">
    <svg className="landing-logo-mark" viewBox="0 0 20 20" aria-hidden="true">
      <rect x="0.5" y="0.5" width="19" height="19" rx="4" fill="none" stroke="#FF007F" strokeWidth="1.4" />
      <line x1="10" y1="0.5" x2="10" y2="19.5" stroke="#FF007F" strokeWidth="1" />
      <line x1="0.5" y1="10" x2="19.5" y2="10" stroke="#FF007F" strokeWidth="1" />
    </svg>
    <span>Artello</span>
  </div>
</header>

    <svg className="landing-doodles landing-doodles-desktop" viewBox="0 0 1600 420" preserveAspectRatio="none" aria-hidden="true">
      <rect x="60" y="120" width="90" height="60" fill="none" stroke="#2fd9c4" strokeWidth="1.8" opacity="0.8" />
      <circle cx="150" cy="180" r="2.5" fill="#2fd9c4" />
      <rect x="156" y="173" width="125" height="16" fill="#2fd9c4" />
      <text x="161" y="185" fontFamily="Space Grotesk" fontSize="15" fill="#18181B">caffeinated-fox</text>

      <path d="M 1380 100 C 1500 55, 1540 85, 1520 130 S 1470 190, 1500 330" stroke="#ff007f" strokeWidth="2.2" fill="none" strokeLinecap="round" opacity="0.8" vectorEffect="non-scaling-stroke" />
      <circle cx="1500" cy="330" r="2.5" fill="#ff007f" />
      <rect x="1506" y="323" width="66" height="16" fill="#ff007f" />
      <text x="1511" y="335" fontFamily="Space Grotesk" fontSize="15" fill="#18181B">panda</text>
    </svg>

    <svg className="landing-doodles landing-doodles-mobile" viewBox="0 0 400 210" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
  <rect x="18" y="55" width="80" height="54" fill="none" stroke="#2fd9c4" strokeWidth="2" opacity="0.85" />
  <circle cx="98" cy="109" r="3" fill="#2fd9c4" />
  <rect x="104" y="101" width="88" height="17" fill="#2fd9c4" />
  <text x="109" y="113" fontFamily="Space Grotesk" fontSize="10" fill="#18181B">sleepy-panda</text>

  <path d="M 320 15 C 345 8, 365 25, 355 48 S 325 78, 340 100" stroke="#ff007f" strokeWidth="2.4" fill="none" strokeLinecap="round" opacity="0.85" vectorEffect="non-scaling-stroke" />
  <circle cx="340" cy="100" r="3" fill="#ff007f" />
  <rect x="248" y="107" width="98" height="17" fill="#ff007f" />
  <text x="253" y="119" fontFamily="Space Grotesk" fontSize="10" fill="#18181B">caffeinated-fox</text>
</svg>

    <div className="landing-hero">
      <p className="landing-eyebrow">// boards sync in real time</p>

      <h1 className="landing-headline">
        Draw together. <span className="landing-headline-accent">Live.</span>
      </h1>

      <p className="landing-tagline">
        Every stroke, cursor, and shape moves the instant you draw it — just an open canvas to play a game, plan with your team, or show up as "swift-otter" and "sharp-tiger".
      </p>
        <div className="code-header-container">
          <div className="window-header">
            <div className="window-controls">
              <span className="dot red"></span>
              <span className="dot yellow"></span>
              <span className="dot green"></span>
            </div>
            <span className="window-title">artello.config.js</span>
          </div>
          <pre>
            <code className="code-content">
              <span className="comment">// No signup. Instant sketch board.</span>
              {"\n"}
              <span className="keyword">const</span> <span className="variable">artello</span> = () =&gt; <span className="string">'sketch'</span>;
            </code>
          </pre>
        </div>

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
              placeholder="Board title"
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
              placeholder="Room code"
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
    </div>
  );
}