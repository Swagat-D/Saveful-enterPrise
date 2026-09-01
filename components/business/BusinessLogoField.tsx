"use client";

import { useEffect, useRef, useState } from "react";
import { CircularImageCropModal } from "@/components/business/CircularImageCropModal";

type Props = {
  file: File | null;
  existingUrl?: string | null;
  onFile: (file: File | null) => void;
};

export function BusinessLogoField({ file, existingUrl, onFile }: Props) {
  const libraryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState("");
  const [picking, setPicking] = useState(false);
  const [cropSrc, setCropSrc] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!file) {
      setPreview(existingUrl ?? "");
      return;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [existingUrl, file]);

  useEffect(() => {
    return () => {
      if (cropSrc) URL.revokeObjectURL(cropSrc);
    };
  }, [cropSrc]);

  const openPicker = (source: "library" | "camera") => {
    setPicking(false);
    setError("");
    (source === "camera" ? cameraRef : libraryRef).current?.click();
  };

  const onPicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const next = event.target.files?.[0];
    event.target.value = "";
    if (!next) return;
    if (!next.type.startsWith("image/")) {
      setError("Please use a JPEG or PNG photo for the logo.");
      return;
    }
    if (cropSrc) URL.revokeObjectURL(cropSrc);
    setCropSrc(URL.createObjectURL(next));
  };

  const shown = preview;
  const startAdd = () => {
    setError("");
    setPicking(true);
  };

  return (
    <div>
      <span className="mb-1.5 block font-saveful-semibold text-sm text-gray-800">Logo (optional)</span>
      <p className="mb-2 font-saveful text-xs text-gray-500">
        Centre your subject — the logo displays as a circle in the app
      </p>
      <input ref={libraryRef} type="file" accept="image/*" className="sr-only" onChange={onPicked} />
      <input
        ref={(node) => {
          cameraRef.current = node;
          node?.setAttribute("capture", "environment");
        }}
        type="file"
        accept="image/*"
        className="sr-only"
        onChange={onPicked}
      />

      {!shown ? (
        <button
          type="button"
          onClick={startAdd}
          className="flex h-11 w-full items-center rounded-[10px] border border-[#D9D9D9] bg-white px-3.5 text-left font-saveful text-sm text-gray-500"
        >
          Upload
        </button>
      ) : (
        <div className="flex items-center gap-3">
          <img src={shown} alt="Logo preview" className="h-11 w-11 rounded-full object-cover" />
          <div className="flex gap-3">
            <button type="button" onClick={startAdd} className="font-saveful text-sm text-saveful-green">
              Change
            </button>
            <button type="button" onClick={() => onFile(null)} className="font-saveful text-sm text-saveful-green">
              Remove
            </button>
          </div>
        </div>
      )}

      {error ? <p className="mt-2 font-saveful text-sm text-amber-700">{error}</p> : null}

      {picking ? (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/40 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-2xl bg-white p-5">
            <p className="font-saveful-bold text-lg text-gray-900">Add logo</p>
            <p className="mt-1 font-saveful text-sm text-gray-500">
              Take a photo, or pick one photo from your library.
            </p>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => openPicker("camera")}
                className="h-11 w-full rounded-xl bg-saveful-green font-saveful-semibold text-white"
              >
                Take photo
              </button>
              <button
                type="button"
                onClick={() => openPicker("library")}
                className="h-11 w-full rounded-xl border border-saveful-green/20 font-saveful-semibold text-saveful-green"
              >
                Choose photo
              </button>
              <button type="button" onClick={() => setPicking(false)} className="h-11 w-full font-saveful text-sm text-gray-500">
                Cancel
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {cropSrc ? (
        <CircularImageCropModal
          src={cropSrc}
          onCancel={() => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc("");
          }}
          onCropped={(next) => {
            URL.revokeObjectURL(cropSrc);
            setCropSrc("");
            onFile(next);
          }}
        />
      ) : null}
    </div>
  );
}
