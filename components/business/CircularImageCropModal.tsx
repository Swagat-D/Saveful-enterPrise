"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { RotateCw, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cropImageToSignupLogo, rotateImageSrc } from "@/lib/businessLogo";

const OVERLAY = "rgba(0, 0, 0, 0.55)";
const HANDLE = 16;
const HIT = 36;

type Props = {
  src: string;
  onCancel: () => void;
  onCropped: (file: File) => void;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function CircularImageCropModal({ src, onCancel, onCropped }: Props) {
  const maskId = `logo-crop-mask-${useId().replace(/:/g, "")}`;
  const stageRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [imageSrc, setImageSrc] = useState(src);
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const [stage, setStage] = useState({ width: 0, height: 0 });
  const [cropSize, setCropSize] = useState(0);
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [saving, setSaving] = useState(false);
  const [rotating, setRotating] = useState(false);
  const [error, setError] = useState("");

  const scaleRef = useRef(1);
  const txRef = useRef(0);
  const tyRef = useRef(0);
  const cropRef = useRef(0);
  const dragRef = useRef<
    | { kind: "pan"; x: number; y: number; startX: number; startY: number }
    | { kind: "resize"; corner: "tl" | "tr" | "bl" | "br"; x: number; y: number; startCrop: number }
    | { kind: "pinch"; distance: number; startScale: number }
    | null
  >(null);
  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const rotatedUrls = useRef<string[]>([]);
  const fittedSrc = useRef("");

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    setImageSrc(src);
    setNatural(null);
    setError("");
    fittedSrc.current = "";
  }, [src]);

  useEffect(() => {
    const image = new Image();
    image.onload = () => setNatural({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => setError("Please use a JPEG or PNG photo for the logo.");
    image.src = imageSrc;
  }, [imageSrc]);

  useEffect(() => {
    const node = stageRef.current;
    if (!node) return;
    const update = () => {
      const width = node.clientWidth;
      const height = node.clientHeight;
      setStage({ width, height });
      const minSide = Math.min(width, height);
      if (minSide <= 0) return;
      const nextCrop = clamp(cropRef.current || minSide * 0.72, minSide * 0.34, minSide - 28);
      cropRef.current = nextCrop;
      setCropSize(nextCrop);
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    const onWheelNative = (event: WheelEvent) => event.preventDefault();
    node.addEventListener("wheel", onWheelNative, { passive: false });
    return () => {
      observer.disconnect();
      node.removeEventListener("wheel", onWheelNative);
    };
  }, [mounted]);

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
      rotatedUrls.current.forEach((url) => URL.revokeObjectURL(url));
    };
  }, []);

  const minCrop = Math.min(stage.width, stage.height) * 0.34;
  const maxCrop = Math.max(minCrop, Math.min(stage.width, stage.height) - 28);
  const contain =
    natural && stage.width && stage.height
      ? Math.min(stage.width / natural.width, stage.height / natural.height)
      : 0;
  const baseWidth = natural && contain ? natural.width * contain : 0;
  const baseHeight = natural && contain ? natural.height * contain : 0;

  const minZoomForCrop = useCallback(
    (nextCrop: number) => {
      if (!baseWidth || !baseHeight) return 1;
      return Math.max(nextCrop / baseWidth, nextCrop / baseHeight);
    },
    [baseHeight, baseWidth],
  );

  const applyPanScale = (nextScale: number, nextTx: number, nextTy: number, nextCrop: number) => {
    const maxX = Math.max(0, (baseWidth * nextScale - nextCrop) / 2);
    const maxY = Math.max(0, (baseHeight * nextScale - nextCrop) / 2);
    const clampedX = clamp(nextTx, -maxX, maxX);
    const clampedY = clamp(nextTy, -maxY, maxY);
    scaleRef.current = nextScale;
    txRef.current = clampedX;
    tyRef.current = clampedY;
    cropRef.current = nextCrop;
    setScale(nextScale);
    setTx(clampedX);
    setTy(clampedY);
    setCropSize(nextCrop);
  };

  useEffect(() => {
    if (!baseWidth || !baseHeight || !cropSize) return;
    const fitKey = `${imageSrc}:${Math.round(stage.width)}x${Math.round(stage.height)}`;
    if (fittedSrc.current === fitKey) return;
    fittedSrc.current = fitKey;
    applyPanScale(minZoomForCrop(cropSize), 0, 0, cropSize);
  }, [baseHeight, baseWidth, cropSize, imageSrc, minZoomForCrop]);

  const onPointerDown = (event: React.PointerEvent, corner?: "tl" | "tr" | "bl" | "br") => {
    if (saving || rotating) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (corner) {
      dragRef.current = { kind: "resize", corner, x: event.clientX, y: event.clientY, startCrop: cropRef.current };
      return;
    }
    if (pointersRef.current.size === 2) {
      const points = [...pointersRef.current.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      dragRef.current = { kind: "pinch", distance, startScale: scaleRef.current };
      return;
    }
    dragRef.current = { kind: "pan", x: event.clientX, y: event.clientY, startX: txRef.current, startY: tyRef.current };
  };

  const onPointerMove = (event: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    if (drag.kind === "pinch" && pointersRef.current.size >= 2) {
      const points = [...pointersRef.current.values()];
      const distance = Math.hypot(points[0].x - points[1].x, points[0].y - points[1].y);
      const nextScale = clamp(drag.startScale * (distance / Math.max(1, drag.distance)), minZoomForCrop(cropRef.current), 6);
      applyPanScale(nextScale, txRef.current, tyRef.current, cropRef.current);
      return;
    }
    if (drag.kind === "pan") {
      applyPanScale(scaleRef.current, drag.startX + (event.clientX - drag.x), drag.startY + (event.clientY - drag.y), cropRef.current);
      return;
    }
    if (drag.kind !== "resize") return;
    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;
    const delta =
      drag.corner === "tl" ? -dx - dy : drag.corner === "tr" ? dx - dy : drag.corner === "bl" ? -dx + dy : dx + dy;
    const nextCrop = clamp(drag.startCrop + delta, minCrop, maxCrop);
    applyPanScale(Math.max(scaleRef.current, minZoomForCrop(nextCrop)), txRef.current, tyRef.current, nextCrop);
  };

  const endPointer = (event: React.PointerEvent) => {
    pointersRef.current.delete(event.pointerId);
    dragRef.current = null;
  };

  const onWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (saving || rotating) return;
    const factor = event.deltaY > 0 ? 0.92 : 1.08;
    applyPanScale(clamp(scaleRef.current * factor, minZoomForCrop(cropRef.current), 6), txRef.current, tyRef.current, cropRef.current);
  };

  const handleRotate = async () => {
    if (saving || rotating) return;
    setRotating(true);
    setError("");
    try {
      const next = await rotateImageSrc(imageSrc);
      rotatedUrls.current.push(next);
      fittedSrc.current = "";
      setImageSrc(next);
      setNatural(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not rotate the logo.");
    } finally {
      setRotating(false);
    }
  };

  const handleCrop = async () => {
    if (!natural || !baseWidth || !baseHeight || saving || rotating) return;
    setSaving(true);
    setError("");
    const currentScale = scaleRef.current;
    const currentX = txRef.current;
    const currentY = tyRef.current;
    const currentCrop = cropRef.current;
    const scaledW = baseWidth * currentScale;
    const scaledH = baseHeight * currentScale;
    const imgLeft = stage.width / 2 + currentX - scaledW / 2;
    const imgTop = stage.height / 2 + currentY - scaledH / 2;
    const circleLeft = (stage.width - currentCrop) / 2;
    const circleTop = (stage.height - currentCrop) / 2;
    let originX = ((circleLeft - imgLeft) / scaledW) * natural.width;
    let originY = ((circleTop - imgTop) / scaledH) * natural.height;
    let size = (currentCrop / scaledW) * natural.width;
    originX = Math.max(0, Math.min(originX, natural.width - 1));
    originY = Math.max(0, Math.min(originY, natural.height - 1));
    size = Math.max(1, Math.min(size, natural.width - originX, natural.height - originY));
    try {
      const file = await cropImageToSignupLogo({ src: imageSrc, originX, originY, size });
      onCropped(file);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not crop the logo.");
      setSaving(false);
    }
  };

  const radius = cropSize / 2;
  const cx = stage.width / 2;
  const cy = stage.height / 2;
  const boxLeft = cx - radius;
  const boxTop = cy - radius;
  const corners = [
    { key: "tl" as const, left: boxLeft, top: boxTop },
    { key: "tr" as const, left: boxLeft + cropSize, top: boxTop },
    { key: "bl" as const, left: boxLeft, top: boxTop + cropSize },
    { key: "br" as const, left: boxLeft + cropSize, top: boxTop + cropSize },
  ];
  const minZoom = cropSize ? minZoomForCrop(cropSize) : 1;
  const zoomValue = minZoom ? scale / minZoom : 1;

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/60 p-4 sm:p-6">
      <div className="flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-4 py-3">
          <div>
            <p className="font-saveful-bold text-lg text-gray-900">Crop logo</p>
            <p className="font-saveful text-xs text-gray-500">Drag to move. Scroll or pinch to zoom.</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={saving}
            className="rounded-full p-1.5 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="bg-[#111] p-3 sm:p-4">
          <div
            ref={stageRef}
            className="relative mx-auto touch-none overflow-hidden rounded-xl bg-black"
            style={{ width: "min(100%, 62vh, 28rem)", aspectRatio: "1 / 1" }}
            onWheel={onWheel}
            onPointerDown={(event) => onPointerDown(event)}
            onPointerMove={onPointerMove}
            onPointerUp={endPointer}
            onPointerCancel={endPointer}
          >
            {natural && baseHeight ? (
              <img
                src={imageSrc}
                alt=""
                draggable={false}
                className="absolute max-w-none select-none"
                style={{
                  left: stage.width / 2,
                  top: stage.height / 2,
                  width: baseWidth,
                  height: baseHeight,
                  marginLeft: -baseWidth / 2,
                  marginTop: -baseHeight / 2,
                  transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
                }}
              />
            ) : (
              <div className="flex h-full items-center justify-center">
                <span className="font-saveful text-sm text-white/80">{error || "Opening photo…"}</span>
              </div>
            )}

            {stage.width > 0 && cropSize > 0 ? (
              <svg className="pointer-events-none absolute inset-0 h-full w-full">
                <defs>
                  <mask id={maskId}>
                    <rect width="100%" height="100%" fill="#fff" />
                    <circle cx={cx} cy={cy} r={radius} fill="#000" />
                  </mask>
                </defs>
                <rect width="100%" height="100%" fill={OVERLAY} mask={`url(#${maskId})`} />
                <circle cx={cx} cy={cy} r={radius} fill="none" stroke="#fff" strokeWidth="2" strokeDasharray="6 5" />
              </svg>
            ) : null}

            {corners.map((corner) => (
              <button
                key={corner.key}
                type="button"
                aria-label="Resize crop"
                className="absolute z-10 flex items-center justify-center"
                style={{ left: corner.left - HIT / 2, top: corner.top - HIT / 2, width: HIT, height: HIT }}
                onPointerDown={(event) => {
                  event.stopPropagation();
                  onPointerDown(event, corner.key);
                }}
                onPointerMove={onPointerMove}
                onPointerUp={endPointer}
                onPointerCancel={endPointer}
              >
                <span className="rounded-[3px] border border-black/25 bg-white" style={{ width: HANDLE, height: HANDLE }} />
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 px-4 py-3">
          <label className="flex items-center gap-3">
            <span className="w-12 font-saveful text-xs text-gray-500">Zoom</span>
            <input
              type="range"
              min={1}
              max={4}
              step={0.01}
              value={clamp(zoomValue, 1, 4)}
              disabled={!natural || saving || rotating}
              onChange={(event) => {
                const next = minZoom * Number(event.target.value);
                applyPanScale(clamp(next, minZoom, 6), txRef.current, tyRef.current, cropRef.current);
              }}
              className="h-1.5 flex-1 accent-saveful-green"
            />
          </label>
          {error && natural ? <p className="font-saveful text-sm text-amber-700">{error}</p> : null}
          <div className="flex flex-wrap items-center justify-end gap-2">
            <Button type="button" variant="secondary" size="sm" disabled={saving} onClick={onCancel}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={saving || rotating || !natural}
              onClick={() => void handleRotate()}
            >
              <RotateCw className={`h-3.5 w-3.5 ${rotating ? "animate-spin" : ""}`} />
              Rotate
            </Button>
            <Button type="button" size="sm" disabled={saving || rotating || !natural} onClick={() => void handleCrop()}>
              {saving ? "Cropping…" : "Crop"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
