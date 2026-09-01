import { STORE_LINKS } from "@/lib/businessTypes";

export function StoreBadges({ compact }: { compact?: boolean }) {
  return (
    <div className={`flex flex-wrap items-center ${compact ? "gap-2" : "gap-3"}`}>
      <a
        href={STORE_LINKS.appStore}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-10 items-center rounded-lg bg-black px-3 text-white"
      >
        <span className="leading-tight">
          <span className="block text-[9px] tracking-wide">Download on the</span>
          <span className={`block ${compact ? "text-sm" : "text-[15px]"} font-saveful-semibold`}>App Store</span>
        </span>
      </a>
      <a
        href={STORE_LINKS.playStore}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-10 items-center rounded-lg bg-black px-3 text-white"
      >
        <span className="leading-tight">
          <span className="block text-[9px] tracking-wide">GET IT ON</span>
          <span className={`block ${compact ? "text-sm" : "text-[15px]"} font-saveful-semibold`}>Google Play</span>
        </span>
      </a>
    </div>
  );
}
