"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { foodItemIcon, ListingIcon } from "@/components/business/ListingIcon";
import type { ApiFoodItem, ApiFoodListing } from "@/lib/api";
import { formatKg, getListingAudience, resolveListingStatus } from "@/lib/businessListings";

export function ListingItemsModal({
  listing,
  items,
  loading,
  onClose,
}: {
  listing: ApiFoodListing;
  items: ApiFoodItem[];
  loading?: boolean;
  onClose: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const partial = resolveListingStatus(listing) === "PARTIAL";
  const farm = getListingAudience(listing) === "animal";

  useEffect(() => {
    setMounted(true);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  const totals = items.reduce(
    (sum, item) => {
      const total = Number(item.totalQtyKg || 0);
      const remaining = Number(item.remainingQtyKg ?? total);
      sum.total += total;
      sum.remaining += remaining;
      sum.claimed += Math.max(0, total - remaining);
      return sum;
    },
    { total: 0, remaining: 0, claimed: 0 },
  );

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center sm:p-4">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-5 pb-6 pt-3 shadow-2xl sm:rounded-2xl sm:px-6 sm:pb-5 sm:pt-5"
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-[#E8E2D6] sm:hidden" />
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="font-saveful-bold text-lg text-gray-900">
              {partial ? "Claim breakdown" : "Listed food"}
            </h2>
            {partial ? (
              <p className="mt-1 font-saveful text-xs leading-relaxed text-gray-500">
                How much has been claimed and what is still available per item.
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#EBEBEB] text-gray-700 hover:bg-[#E0E0E0]"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {loading ? (
          <p className="py-8 text-center font-saveful text-sm text-gray-500">Loading latest quantities…</p>
        ) : (
          <>
            <div
              className={
                partial
                  ? "grid grid-cols-[minmax(0,1.3fr)_4.25rem_4.75rem] gap-2 border-b border-[#EDE8DC] pb-2"
                  : "grid grid-cols-[minmax(0,1fr)_auto] gap-2 border-b border-[#EDE8DC] pb-2"
              }
            >
              <p className="font-saveful-semibold text-xs text-gray-500">Item</p>
              {partial ? (
                <>
                  <p className="text-center font-saveful-semibold text-xs text-gray-500">Claimed</p>
                  <p className="text-center font-saveful-semibold text-xs text-gray-500">Remaining</p>
                </>
              ) : (
                <p className="text-right font-saveful-semibold text-xs text-gray-500">Quantity</p>
              )}
            </div>

            {items.length ? (
              <ul>
                {items.map((item, index) => {
                  const total = Number(item.totalQtyKg || 0);
                  const remaining = Number(item.remainingQtyKg ?? total);
                  const claimed = Math.max(0, total - remaining);
                  return (
                    <li
                      key={`${item.id ?? item.name}-${index}`}
                      className={
                        partial
                          ? "grid grid-cols-[minmax(0,1.3fr)_4.25rem_4.75rem] items-center gap-2 border-b border-[#F3F0E8] py-2.5"
                          : "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 border-b border-[#F3F0E8] py-2.5"
                      }
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <ListingIcon src={foodItemIcon(item.name, farm)} className="h-7 w-7 shrink-0" />
                        <span className="truncate font-saveful-semibold text-sm text-gray-900">
                          {item.name || "Food item"}
                        </span>
                      </span>
                      {partial ? (
                        <>
                          <span className="text-center font-saveful text-sm text-[#B8860B]">{formatKg(claimed)} kg</span>
                          <span className="text-center font-saveful text-sm text-saveful-green">{formatKg(remaining)} kg</span>
                        </>
                      ) : (
                        <span className="text-right font-saveful text-sm text-gray-800">{formatKg(total)} kg</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="py-8 text-center font-saveful text-sm text-gray-500">No items available</p>
            )}

            <div className="mt-3 space-y-2">
              {partial ? (
                <>
                  <div className="flex items-center justify-between font-saveful-semibold text-sm">
                    <span className="text-gray-500">Total claimed</span>
                    <span className="text-[#B8860B]">{formatKg(totals.claimed)} kg</span>
                  </div>
                  <div className="flex items-center justify-between font-saveful-semibold text-sm">
                    <span className="text-gray-500">Total remaining</span>
                    <span className="text-saveful-green">{formatKg(totals.remaining)} kg</span>
                  </div>
                </>
              ) : (
                <div className="flex items-center justify-between font-saveful-semibold text-sm">
                  <span className="text-gray-500">Total quantity</span>
                  <span className="text-gray-900">{formatKg(totals.total)} kg</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  );
}
