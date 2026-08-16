// Kurznachrichten der Redaktionsoberfläche („Gespeichert.", „Hochgeladen.").
// Absender und Anzeige sind entkoppelt: wer etwas gespeichert hat, feuert ein
// Fensterereignis; `components/admin/Toaster` zeigt es an. So braucht es keinen
// Context-Provider um jedes Formular herum.

export const TOAST_EVENT = "admin:toast";

export interface ToastDetail {
  message: string;
  kind?: "ok" | "err";
}

/** Zeigt eine kurze Rückmeldung oben rechts. Nur im Browser wirksam. */
export function showToast(message: string, kind: ToastDetail["kind"] = "ok"): void {
  if (typeof window === "undefined" || !message) return;
  window.dispatchEvent(new CustomEvent<ToastDetail>(TOAST_EVENT, { detail: { message, kind } }));
}
