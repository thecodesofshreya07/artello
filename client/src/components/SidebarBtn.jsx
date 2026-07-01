import React from "react";

export default function SidebarBtn({ icon, label, active, onClick }) {
  const [hovered, setHovered] = React.useState(false);

  const btnStyle = {
    position: "relative",
    width: 40,
    height: 40,
    borderRadius: 10,
    border: "none",
    background: active ? "#3D1428" : hovered ? "#303033" : "transparent",
    color: active ? "#FF007F" : hovered ? "#FFFFFF" : "#A1A1AA",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    outline: "none",
    flexShrink: 0,
  };

  const tooltipStyle = {
    position: "absolute",
    left: 52,
    top: "50%",
    transform: "translateY(-50%)",
    background: "#18181B",
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: 500,
    padding: "5px 10px",
    borderRadius: 6,
    whiteSpace: "nowrap",
    pointerEvents: "none",
    opacity: hovered ? 1 : 0,
    zIndex: 100,
    fontFamily: "Inter, sans-serif",
  };

  return (
    <button
      style={btnStyle}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {active && (
        <div style={{
          position: "absolute",
          left: 0,
          top: "50%",
          transform: "translateY(-50%)",
          width: 3,
          height: 20,
          background: "#FF007F",
          borderRadius: "0 3px 3px 0",
        }} />
      )}
      {icon}
      <span style={tooltipStyle}>{label}</span>
    </button>
  );
}