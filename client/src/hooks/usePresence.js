import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "../services/socket";

const THROTTLE_MS = 40; // ~25 updates/sec, plenty smooth without flooding the socket

export function usePresence(roomId, identity, tool) {
  const [remoteUsers, setRemoteUsers] = useState({}); // { [userId]: { name, color, x, y, tool } }
  const [presenceList, setPresenceList] = useState([]); // [{ id, name, color }]
  const lastSentRef = useRef(0);

  // Announce presence on join, and whenever tool changes, including socket reconnections
  useEffect(() => {
    if (!roomId || !identity) return;

    const handleConnect = () => {
      socket.emit("presence-join", { roomId, user: identity });
      socket.emit("presence-tool", { roomId, userId: identity.id, tool });
    };

    if (socket.connected) {
      handleConnect();
    }

    socket.on("connect", handleConnect);

    return () => {
      socket.off("connect", handleConnect);
    };
  }, [roomId, identity, tool]);

  useEffect(() => {
    const handlePresenceList = (users) => {
      setPresenceList(users.filter((u) => u.id !== identity?.id));
    };

    const handleCursor = (data) => {
      if (data.userId === identity?.id) return; // never render our own cursor
      setRemoteUsers((prev) => ({
        ...prev,
        [data.userId]: {
          name: data.name,
          color: data.color,
          x: data.x,
          y: data.y,
          tool: data.tool,
        },
      }));
    };

    const handleUserLeft = (userId) => {
      setRemoteUsers((prev) => {
        const next = { ...prev };
        delete next[userId];
        return next;
      });
    };

    socket.on("presence-list", handlePresenceList);
    socket.on("cursor-move", handleCursor);
    socket.on("presence-left", handleUserLeft);

    return () => {
      socket.off("presence-list", handlePresenceList);
      socket.off("cursor-move", handleCursor);
      socket.off("presence-left", handleUserLeft);
    };
  }, [identity]);

  // Call this from onMouseMove with canvas-space (getPos) coordinates —
  // same coordinate space as everything else on the board, so CursorLayer
  // only has to do the DOM-space conversion once, in one place.
  const sendCursor = useCallback(
    (x, y) => {
      if (!roomId || !identity) return;
      const now = Date.now();
      if (now - lastSentRef.current < THROTTLE_MS) return;
      lastSentRef.current = now;
      socket.emit("cursor-move", { roomId, userId: identity.id, name: identity.name, color: identity.color, x, y, tool });
    },
    [roomId, identity, tool]
  );

  return { remoteUsers, presenceList, sendCursor };
}