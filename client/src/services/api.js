// Vite: uses VITE_API_URL. If your project uses CRA instead, swap this line
// for: const API_BASE = process.env.REACT_APP_API_URL || "http://localhost:5000/api";
const API_BASE = import.meta.env?.VITE_API_URL || "http://localhost:5000/api";

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Request failed");
  return data;
}

export function createBoard(title) {
  return request("/boards", { method: "POST", body: JSON.stringify({ title }) });
}

export function getBoard(roomCode) {
  return request(`/boards/${roomCode}`);
}
