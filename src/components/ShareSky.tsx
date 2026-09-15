import { useEffect, useId, useRef, useState } from "react";
import {
  formatShareHeadline,
  shareCardCopy,
  shareHref,
  type ShareState,
} from "../lib/share";

type Props = {
  state: ShareState;
};

export function ShareSky({ state }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "copied" | "shared">("idle");
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();
  const copy = shareCardCopy(state.date);
  const url = shareHref(state);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    const onDown = (e: PointerEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("pointerdown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("pointerdown", onDown);
    };
  }, [open]);

  useEffect(() => {
    if (status === "idle") return;
    const t = window.setTimeout(() => setStatus("idle"), 1800);
    return () => window.clearTimeout(t);
  }, [status]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("idle");
    }
  };

  const onNativeShare = async () => {
    if (typeof navigator.share !== "function") {
      await onCopy();
      return;
    }
    try {
      await navigator.share({ title: copy.title, text: copy.text, url });
      setStatus("shared");
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      await onCopy();
    }
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="border border-ink/25 px-4 py-2 text-[10px] font-medium uppercase tracking-[0.26em] text-ink/90 transition hover:border-rust/70 hover:text-ink"
      >
        Share
      </button>
      {open && (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[min(18.5rem,calc(100vw-2.5rem))] border border-ink/20 bg-dusk/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm"
        >
          <p
            id={titleId}
            className="font-serif text-lg leading-snug tracking-tight text-ink"
          >
            {copy.title}
          </p>
          <p className="mt-1 text-[13px] text-ink/80">{formatShareHeadline(state.date)}</p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
            Jezero · local midnight
            {state.view === "surface" ? " · standing on Mars" : ""}
          </p>
          <p className="mt-3 break-all text-[10px] leading-relaxed text-mute/90">{url}</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void onCopy()}
              className="border border-ink/25 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-ink/90 transition hover:border-rust/70"
            >
              {status === "copied" ? "Copied" : "Copy link"}
            </button>
            <button
              type="button"
              onClick={() => void onNativeShare()}
              className="border border-rust/50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-ink/90 transition hover:border-rust"
            >
              {status === "shared" ? "Shared" : "Share"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
