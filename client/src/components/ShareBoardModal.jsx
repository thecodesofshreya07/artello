import { useState } from "react";

export default function ShareBoardModal({ roomCode, title, onClose }) {
  const [copied, setCopied] = useState(false);
  const link = `${window.location.origin}/room/${roomCode}`;

  const copy = () => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="share-modal-overlay">
      <div className="share-modal">
        <h2>"{title}" is ready</h2>
        <p>Share this code or link so others can join instantly - no account needed.</p>

        <div className="share-code">{roomCode}</div>

        <div className="share-link-row">
          <input readOnly value={link} onFocus={(e) => e.target.select()} />
          <button onClick={copy}>{copied ? "Copied!" : "Copy link"}</button>
        </div>

        <button className="share-modal-close" onClick={onClose}>
          Start drawing
        </button>
      </div>
    </div>
  );
}
