import { useEffect, useId, useRef, useState } from "react";
import {
  formatShareHeadline,
  shareCardCopy,
  shareHref,
  type ShareState,
} from "../lib/share";
import {
  canShareImageFile,
  canvasToJpegBlob,
  composeShareImage,
  downloadBlob,
  shareImageFilename,
} from "../lib/shareImage";
import type { SkyModel } from "../lib/sky";
import { outlineControlClass } from "./outlineControl";

type Props = {
  state: ShareState;
  sky: SkyModel;
};

export function ShareSky({ state, sky }: Props) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<"idle" | "copied" | "saved" | "shared">("idle");
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [imageError, setImageError] = useState<string | null>(null);
  const [building, setBuilding] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const blobRef = useRef<Blob | null>(null);
  const titleId = useId();
  const copy = shareCardCopy(state.date);
  const url = shareHref(state);
  const filename = shareImageFilename(state.date);

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

  useEffect(() => {
    if (!open) {
      blobRef.current = null;
      setPreviewUrl(null);
      setImageError(null);
      setBuilding(false);
      return;
    }

    let cancelled = false;
    let objectUrl: string | null = null;
    setBuilding(true);
    setImageError(null);
    setPreviewUrl(null);
    blobRef.current = null;

    void (async () => {
      try {
        if (cancelled) return;
        const poster = await composeShareImage(sky, state.date);
        const blob = await canvasToJpegBlob(poster);
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
          return;
        }
        blobRef.current = blob;
        setPreviewUrl(objectUrl);
      } catch {
        if (!cancelled) {
          blobRef.current = null;
          setPreviewUrl(null);
          setImageError("Could not draw the sky chart. You can still copy the link.");
        }
      } finally {
        if (!cancelled) setBuilding(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, sky, state.date]);

  const onCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("copied");
    } catch {
      setStatus("idle");
    }
  };

  const onSaveImage = async () => {
    const blob = blobRef.current;
    if (!blob) return;
    const file = new File([blob], filename, { type: blob.type || "image/jpeg" });
    try {
      if (canShareImageFile(file) && typeof navigator.share === "function") {
        await navigator.share({ files: [file], title: copy.title, text: copy.text });
        setStatus("shared");
        return;
      }
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
    downloadBlob(blob, filename);
    setStatus("saved");
  };

  return (
    <div ref={panelRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        aria-haspopup="dialog"
        className={outlineControlClass}
      >
        Share
      </button>
      {open && (
        <div
          role="dialog"
          aria-labelledby={titleId}
          className="absolute right-0 top-[calc(100%+0.75rem)] z-20 w-[min(21rem,calc(100vw-2.5rem))] border border-ink/20 bg-dusk/95 p-4 shadow-[0_12px_40px_rgba(0,0,0,0.45)] backdrop-blur-sm"
        >
          <p id={titleId} className="font-serif text-lg leading-snug tracking-tight text-ink">
            {copy.title}
          </p>
          <p className="mt-1 text-[13px] text-ink/80">{formatShareHeadline(state.date)}</p>
          <p className="mt-2 text-[10px] font-medium uppercase tracking-[0.22em] text-mute">
            Jezero midnight sky · save to photos
          </p>

          <div className="mt-3 overflow-hidden border border-ink/15 bg-black">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={`Whole-sky chart over Jezero on ${formatShareHeadline(state.date)}`}
                className="mx-auto block max-h-72 w-full bg-black object-contain"
              />
            ) : (
              <div className="flex h-44 items-center justify-center px-4 text-center text-[11px] leading-relaxed text-mute">
                {building ? "Drawing the sky…" : (imageError ?? "No image yet.")}
              </div>
            )}
          </div>

          <div className="mt-4 flex flex-wrap gap-2">
            <button
              type="button"
              disabled={!previewUrl}
              onClick={() => void onSaveImage()}
              className="border border-rust/50 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-ink/90 transition hover:border-rust disabled:opacity-40"
            >
              {status === "saved" ? "Saved" : status === "shared" ? "Shared" : "Save image"}
            </button>
            <button
              type="button"
              onClick={() => void onCopy()}
              className="border border-ink/25 px-3 py-1.5 text-[10px] font-medium uppercase tracking-[0.22em] text-ink/90 transition hover:border-rust/70"
            >
              {status === "copied" ? "Copied" : "Copy link"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
