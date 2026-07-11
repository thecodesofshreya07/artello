import React from "react";

export default function CursorLayer({ remoteUsers, canvasRef }) {
  const canvas = canvasRef.current;
  if (!canvas) return null;

  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const offsetLeft = canvas.offsetLeft || 0;
  const offsetTop = canvas.offsetTop || 0;

  return (
    <div style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}>
      {Object.entries(remoteUsers).map(([userId, u]) => (
        <div
          key={userId}
          style={{
            position: "absolute",
            left: u.x / scaleX + offsetLeft,
            top: u.y / scaleY + offsetTop,
            transform: "translate(-2px, -2px)",
            transition: "left 60ms linear, top 60ms linear",
            zIndex: 20,
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" style={{ display: "block" }}>
            <path d="M4 2 L20 12 L12 13 L9 20 Z" fill={u.color} stroke="white" strokeWidth="1" />
          </svg>
          <div
            style={{
              marginTop: 2,
              padding: "2px 6px",
              background: u.color,
              color: "white",
              fontSize: 11,
              fontWeight: 600,
              borderRadius: 4,
              whiteSpace: "nowrap",
            }}
          >
            {u.name}
            {u.tool ? <span style={{ opacity: 0.85, fontWeight: 400 }}> · {u.tool}</span> : null}
          </div>
        </div>
      ))}
    </div>
  );
}