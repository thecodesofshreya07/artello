import { useEffect, useState } from "react";
import { useParams, useLocation, useNavigate } from "react-router-dom";
import { getBoard } from "../services/api";
import CanvasBoard from "../components/CanvasBoard";
import ShareBoardModal from "../components/ShareBoardModal";

export default function BoardPage() {
  const { roomCode } = useParams();
  const location = useLocation();
  const navigate = useNavigate();

  const [board, setBoard] = useState(null);
  const [notFound, setNotFound] = useState(false);
  const [showShare, setShowShare] = useState(Boolean(location.state?.justCreated));

  useEffect(() => {
    let cancelled = false;
    setBoard(null);
    setNotFound(false);

    getBoard(roomCode)
      .then((data) => { if (!cancelled) setBoard(data); })
      .catch(() => { if (!cancelled) setNotFound(true); });

    return () => { cancelled = true; };
  }, [roomCode]);

  if (notFound) {
    return (
      <div className="board-not-found">
        <p>No board found for code "{roomCode}".</p>
        <button onClick={() => navigate("/")}>Back to home</button>
      </div>
    );
  }

  if (!board) return <div className="board-loading">Loading board...</div>;

  return (
    <>
      <CanvasBoard roomCode={roomCode} title={board.title} />
      {showShare && (
        <ShareBoardModal roomCode={roomCode} title={board.title} onClose={() => setShowShare(false)} />
      )}
    </>
  );
}
