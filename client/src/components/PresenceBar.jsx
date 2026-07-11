import React from "react";

export default function PresenceBar({ presenceList, currentUser }) {
  const all = currentUser ? [{ ...currentUser, isYou: true }, ...presenceList] : presenceList;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {all.map((u) => (
        <div
          key={u.id}
          title={u.isYou ? `${u.name} (you)` : u.name}
          style={{
            width: 28,
            height: 28,
            borderRadius: "50%",
            background: u.color,
            color: "white",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            border: u.isYou ? "2px solid #FF007F" : "2px solid white",
            boxShadow: "0 0 0 1px rgba(0,0,0,0.1)",
          }}
        >
          {u.name.slice(0, 1)}
        </div>
      ))}
    </div>
  );
}