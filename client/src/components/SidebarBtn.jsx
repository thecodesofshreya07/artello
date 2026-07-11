import React from "react";

export default function SidebarBtn({ icon, label, active, onClick }) {
  return (
    <button
      className={`wb-tool-btn ${active ? "active" : ""}`}
      onClick={onClick}
    >
      {icon}
      <span className="wb-tooltip">{label}</span>
    </button>
  );
}