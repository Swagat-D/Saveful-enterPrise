"use client";

import Image from "next/image";

type SavefulPageLoaderProps = {
  message?: string;
  fullScreen?: boolean;
  className?: string;
};

export function SavefulPageLoader({
  message = "Loading…",
  fullScreen = true,
  className = "",
}: SavefulPageLoaderProps) {
  return (
    <div
      className={`${
        fullScreen ? "flex min-h-screen" : "flex min-h-[280px]"
      } items-center justify-center bg-[#FAF7F0] px-6 ${className}`}
      role="status"
      aria-live="polite"
      aria-busy="true"
    >
      <div className="flex w-full max-w-xs flex-col items-center text-center">
        <Image
          src="/logo@2x.png"
          alt="Saveful"
          width={160}
          height={48}
          className="h-11 w-auto object-contain sm:h-12"
          priority
        />
        <p className="mt-5 font-saveful text-sm leading-relaxed text-gray-600">
          {message}
        </p>
        <div
          className="mt-5 h-9 w-9 animate-spin rounded-full border-[3px] border-[#E8E2D6] border-t-[#2D5F4F]"
          aria-hidden
        />
      </div>
    </div>
  );
}
