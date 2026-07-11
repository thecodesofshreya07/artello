import { useRef } from "react";

const ADJECTIVES = ["Swift", "Calm", "Bold", "Bright", "Quiet", "Sharp", "Cosmic", "Amber"];
const ANIMALS = ["Fox", "Otter", "Falcon", "Panda", "Wolf", "Lynx", "Heron", "Tiger"];
const COLORS = ["#FF007F", "#3b82f6", "#22c55e", "#f97316", "#a855f7", "#eab308", "#ec4899", "#06b6d4"];

function randomFrom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateIdentity() {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    name: `${randomFrom(ADJECTIVES)} ${randomFrom(ANIMALS)}`,
    color: randomFrom(COLORS),
  };
}

export function useUserIdentity() {
  const identityRef = useRef(null);

  if (!identityRef.current) {
    const stored = sessionStorage.getItem("artello-identity");
    if (stored) {
      identityRef.current = JSON.parse(stored);
    } else {
      const identity = generateIdentity();
      sessionStorage.setItem("artello-identity", JSON.stringify(identity));
      identityRef.current = identity;
    }
  }

  return identityRef.current;
}