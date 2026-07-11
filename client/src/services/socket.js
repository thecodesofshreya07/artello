import { io } from "socket.io-client";

const getSocketUrl = () => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  const origin = window.location.origin;
  // If the browser was loaded from a local IP address (like http://192.168.1.100:5173),
  // connect the socket to that same IP on port 5000!
  const ipMatch = origin.match(/http:\/\/(\d+\.\d+\.\d+\.\d+)/);
  if (ipMatch) {
    return `http://${ipMatch[1]}:5000`;
  }
  return "http://localhost:5000";
};

export const socket = io(getSocketUrl());

socket.on("connect", () => {
  console.log("Connected to server:", socket.id);
});
