import { useEffect, useMemo, useRef, useState, PointerEvent as ReactPointerEvent } from "react";
import { createPortal } from "react-dom";
import { Check, X } from "lucide-react";
import { Button } from "./ui/Button";

const VIEWPORT = 280;
const EXPORT_SIZE = 512;

/**
 * No fixed CSS crop position (object-top, object-center, ...) can work for
 * every uploaded photo — a close-up selfie and a full-body shot with the
 * face taking up 15% of the frame need completely different crops. Instead
 * of guessing, this lets the person drag their own photo so their face ends
 * up inside the circular guide before it's ever uploaded — the crop
 * confirmed here is exactly what gets saved as the avatar. No zoom control —
 * scaling the image up past its own resolution just made it look blurry.
 */
export function AvatarCropModal({ file, onCancel, onConfirm }: { file: File; onCancel: () => void; onConfirm: (blob: Blob) => void }) {
  const [bitmap, setBitmap] = useState<ImageBitmap | null>(null);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [exporting, setExporting] = useState(false);
  const dragRef = useRef<{ startX: number; startY: number; startOffset: { x: number; y: number } } | null>(null);

  // Created AND revoked inside the same effect (not useMemo + a separate
  // effect) — otherwise StrictMode's dev-only mount/cleanup/remount cycle
  // revokes the URL a render after it was handed to <img>, leaving it broken.
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  useEffect(() => {
    const url = URL.createObjectURL(file);
    setObjectUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  useEffect(() => {
    let cancelled = false;
    createImageBitmap(file, { imageOrientation: "from-image" }).then((bmp) => {
      if (!cancelled) setBitmap(bmp);
    });
    return () => {
      cancelled = true;
    };
  }, [file]);

  // The scale at which the image's SHORTER side exactly covers the square
  // viewport — fixed, never scaled up further, so the photo is never shown
  // above its own native resolution (that's what read as "stretched").
  const scale = useMemo(() => {
    if (!bitmap) return 1;
    return VIEWPORT / Math.min(bitmap.width, bitmap.height);
  }, [bitmap]);

  function clampOffset(next: { x: number; y: number }) {
    if (!bitmap) return next;
    const halfW = (bitmap.width * scale) / 2;
    const halfH = (bitmap.height * scale) / 2;
    const maxX = Math.max(0, halfW - VIEWPORT / 2);
    const maxY = Math.max(0, halfH - VIEWPORT / 2);
    return { x: Math.min(maxX, Math.max(-maxX, next.x)), y: Math.min(maxY, Math.max(-maxY, next.y)) };
  }

  useEffect(() => {
    setOffset({ x: 0, y: 0 });
  }, [bitmap]);

  function handlePointerDown(e: ReactPointerEvent<HTMLDivElement>) {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { startX: e.clientX, startY: e.clientY, startOffset: offset };
  }

  function handlePointerMove(e: ReactPointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setOffset(clampOffset({ x: dragRef.current.startOffset.x + dx, y: dragRef.current.startOffset.y + dy }));
  }

  function handlePointerUp() {
    dragRef.current = null;
  }

  async function handleConfirm() {
    if (!bitmap) return;
    setExporting(true);
    try {
      // The visible viewport, translated back into the original image's own
      // pixel coordinates, is exactly the region the person chose to keep.
      const cropW = VIEWPORT / scale;
      const cropH = cropW;
      const cropX = bitmap.width / 2 - cropW / 2 - offset.x / scale;
      const cropY = bitmap.height / 2 - cropH / 2 - offset.y / scale;

      const canvas = document.createElement("canvas");
      canvas.width = EXPORT_SIZE;
      canvas.height = EXPORT_SIZE;
      const ctx = canvas.getContext("2d")!;
      ctx.drawImage(bitmap, cropX, cropY, cropW, cropH, 0, 0, EXPORT_SIZE, EXPORT_SIZE);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
      if (blob) onConfirm(blob);
    } finally {
      setExporting(false);
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-brand-950/80 p-4 backdrop-blur-sm">
      <div className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">Position your photo</h2>
          <button type="button" onClick={onCancel} className="rounded-full p-1.5 text-slate-400 hover:bg-slate-100" aria-label="Cancel">
            <X className="h-4.5 w-4.5" />
          </button>
        </div>
        <p className="mb-4 text-sm text-slate-500">Drag the photo so your face sits inside the circle.</p>

        <div
          className="relative mx-auto touch-none select-none overflow-hidden rounded-xl bg-slate-900"
          style={{ width: VIEWPORT, height: VIEWPORT, cursor: dragRef.current ? "grabbing" : "grab" }}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
        >
          {bitmap && objectUrl && (
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              className="absolute left-1/2 top-1/2"
              style={{
                width: bitmap.width * scale,
                height: bitmap.height * scale,
                transform: `translate(-50%, -50%) translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
          {/* Circular guide: a transparent circle whose oversized box-shadow
              darkens everything outside it, clipped to the viewport by the
              parent's own overflow-hidden. */}
          <div
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]"
            style={{ width: VIEWPORT * 0.92, height: VIEWPORT * 0.92 }}
          />
        </div>

        <div className="mt-5 flex justify-end gap-3">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button type="button" onClick={handleConfirm} loading={exporting} disabled={!bitmap}>
            <Check className="h-4 w-4" /> Use Photo
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
}
