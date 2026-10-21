import { useSyncExternalStore } from "react";
import { toast } from "sonner";
import { t } from "@/lib/language";

const listeners = new Set<() => void>();
let activeId: string | null = null;
let current: SpeechSynthesisUtterance | null = null;
const supported = () => typeof window !== "undefined" && "speechSynthesis" in window && "SpeechSynthesisUtterance" in window;
function publish(id: string | null) {
  activeId = id;
  listeners.forEach((listener) => listener());
}
export function stopPostSpeech() {
  current = null;
  if (supported()) window.speechSynthesis.cancel();
  publish(null);
}
export function togglePostSpeech(id: string, body: string, language: string) {
  if (activeId === id) { stopPostSpeech(); return; }
  if (!supported()) { toast.error(t("このブラウザは読み上げに対応していません。")); return; }
  stopPostSpeech();
  if (!body.trim()) return;
  const utterance = new SpeechSynthesisUtterance(body);
  utterance.lang = /[ぁ-んァ-ヶ一-龠]/u.test(body) ? "ja-JP" : ({ ja: "ja-JP", en: "en-US", ko: "ko-KR", zh: "zh-CN" }[language] ?? language);
  utterance.rate = 1;
  current = utterance;
  utterance.onend = () => { if (current === utterance) { current = null; publish(null); } };
  utterance.onerror = (event) => {
    if (current !== utterance) return;
    current = null; publish(null);
    if (event.error !== "canceled" && event.error !== "interrupted") toast.error(t("読み上げを開始できませんでした。"));
  };
  publish(id);
  try { window.speechSynthesis.speak(utterance); }
  catch { current = null; publish(null); toast.error(t("読み上げを開始できませんでした。")); }
}
if (typeof window !== "undefined") {
  window.addEventListener("pagehide", stopPostSpeech);
  document.addEventListener("visibilitychange", () => { if (document.hidden) stopPostSpeech(); });
}
export function usePostSpeech() {
  return useSyncExternalStore(
    (listener) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    () => activeId,
    () => null,
  );
}
