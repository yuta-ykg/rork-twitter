import { useSyncExternalStore } from "react";

export type SpeechSpeed = "slow" | "standard" | "fast";
const key = "iruka-speech-speed";
const listeners = new Set<() => void>();
function stored(): SpeechSpeed {
  try {
    const value = localStorage.getItem(key);
    if (value === "slow" || value === "fast") return value;
  } catch { /* Use the default when storage is unavailable. */ }
  return "standard";
}
let speed = stored();
export function speechRate(): number {
  return speed === "slow" ? 0.75 : speed === "fast" ? 1.25 : 1;
}
function notify() { listeners.forEach((listener) => listener()); }
function setSpeechSpeed(next: SpeechSpeed) {
  speed = next;
  try { localStorage.setItem(key, next); } catch { /* Keep the selection in memory. */ }
  notify();
}
window.addEventListener("storage", (event) => {
  if (event.key === key || event.key === null) { speed = stored(); notify(); }
});
export function useSpeechSpeed() {
  const speechSpeed = useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => speed,
    () => "standard" as SpeechSpeed,
  );
  return { speechSpeed, setSpeechSpeed };
}
