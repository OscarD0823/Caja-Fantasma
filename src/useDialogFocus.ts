import { useEffect, type RefObject } from "react";

/** Keep keyboard focus inside the active dialog and return it on dismissal. */
export default function useDialogFocus(ref: RefObject<HTMLElement | null>, onEscape?: () => void) {
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    const root = ref.current;
    root?.focus();
    const handle = (event: KeyboardEvent) => {
      if (event.key === "Escape" && onEscape) { event.preventDefault(); onEscape(); }
      if (event.key !== "Tab" || !root) return;
      const elements = [...root.querySelectorAll<HTMLElement>('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), summary, [tabindex="0"]')].filter(element => element.getClientRects().length > 0);
      const first = elements[0];
      const last = elements.at(-1);
      if (!first) { event.preventDefault(); root.focus(); }
      else if (event.shiftKey && (document.activeElement === first || document.activeElement === root)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && (document.activeElement === last || document.activeElement === root)) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handle);
    return () => { document.removeEventListener("keydown", handle); if (previous?.isConnected) previous.focus(); };
  }, [ref, onEscape]);
}
