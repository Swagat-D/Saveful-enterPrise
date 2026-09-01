"use client";

import { useEffect, useState } from "react";
import { Star, X } from "lucide-react";
import { LISTING_ICONS, ListingIcon } from "@/components/business/ListingIcon";
import { submitProviderFeedback } from "@/lib/businessApi";
import { cn } from "@/lib/utils";

type SurveyItem = {
  id: string;
  name: string;
  quantity: number;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  onComplete: (id: string, status: "completed" | "cancelled") => void;
  selectedId: string | null;
  claimId: number | null;
  partnerName?: string;
  items?: SurveyItem[];
  initialAnswer?: "yes" | "no" | null;
};

const REASONS = ["No show", "Delayed pickup", "Quality issue", "Cancelled", "Other"] as const;

export function PostPickupSurveyModal({
  visible,
  onClose,
  onComplete,
  selectedId,
  claimId,
  partnerName = "your partner",
  items = [],
  initialAnswer = null,
}: Props) {
  const [step, setStep] = useState(1);
  const [reason, setReason] = useState("");
  const [otherReason, setOtherReason] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!visible) return;
    if (initialAnswer === "yes") setStep(2);
    else if (initialAnswer === "no") setStep(5);
    else setStep(1);
    setReason("");
    setOtherReason("");
    setRating(0);
    setComment("");
    setError("");
  }, [visible, initialAnswer, claimId]);

  if (!visible) return null;

  const totalKg = items.reduce((sum, item) => sum + Number(item.quantity || 0), 0);

  const reset = () => {
    setStep(1);
    setReason("");
    setOtherReason("");
    setRating(0);
    setComment("");
    setError("");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const submitYes = async () => {
    if (!claimId || rating < 1) {
      setError("Please rate your collection partner.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitProviderFeedback(claimId, {
        didCollect: true,
        rating,
        ratingNote: comment.trim() || undefined,
      });
      onComplete(selectedId || String(claimId), "completed");
      reset();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const submitNo = async () => {
    if (!claimId) return;
    if (!reason) {
      setError("Please select a reason.");
      return;
    }
    if (reason === "Other" && !otherReason.trim()) {
      setError("Please describe what happened.");
      return;
    }
    setSubmitting(true);
    setError("");
    try {
      await submitProviderFeedback(claimId, {
        didCollect: false,
        ratingNote: reason === "Other" ? otherReason.trim() : reason,
      });
      onComplete(selectedId || String(claimId), "cancelled");
      handleClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit feedback. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <div className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-[20px] bg-white p-5 shadow-xl">
        <div className="flex justify-end">
          <button type="button" onClick={handleClose} className="rounded-full p-1 text-gray-500 hover:bg-gray-100" aria-label="Close">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex flex-col items-center gap-3 px-1 pb-2 text-center">
          <ListingIcon src={LISTING_ICONS.basket} className="h-[72px] w-[72px]" />

          {step === 1 ? (
            <>
              <h2 className="font-saveful-semibold text-lg text-gray-900">Did {partnerName} collect from you?</h2>
              <div className="mt-2 flex w-full gap-3">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="flex-1 rounded-xl bg-[#40925B] py-3.5 font-saveful-semibold text-white"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setStep(5)}
                  className="flex-1 rounded-xl border border-[#D0D0D0] py-3.5 font-saveful-semibold text-gray-900"
                >
                  No
                </button>
              </div>
            </>
          ) : null}

          {step === 2 ? (
            <>
              <h2 className="font-saveful-semibold text-lg text-gray-900">How was the collection?</h2>
              <p className="font-saveful text-sm text-gray-500">Rate {partnerName}</p>
              {totalKg > 0 ? <p className="font-saveful text-sm text-gray-500">{totalKg} kg claimed</p> : null}
              <div className="my-1 flex gap-2">
                {[1, 2, 3, 4, 5].map((num) => (
                  <button key={num} type="button" onClick={() => setRating(num)} aria-label={`Rate ${num} stars`}>
                    <Star
                      className={cn("h-8 w-8", rating >= num ? "fill-[#F99C46] text-[#F99C46]" : "text-[#C9C9C9]")}
                    />
                  </button>
                ))}
              </div>
              <textarea
                className="min-h-20 w-full rounded-xl border border-[#E0E0E0] p-3 font-saveful text-sm text-gray-900 outline-none focus:border-[#40925B]"
                placeholder="Add a note (optional)"
                value={comment}
                onChange={(event) => setComment(event.target.value)}
              />
              <button
                type="button"
                disabled={submitting || rating < 1}
                onClick={() => void submitYes()}
                className="w-full rounded-xl bg-[#40925B] py-3.5 font-saveful-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </>
          ) : null}

          {step === 5 ? (
            <>
              <h2 className="font-saveful-semibold text-lg text-gray-900">What went wrong?</h2>
              <div className="w-full space-y-1 text-left">
                {REASONS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setReason(item)}
                    className="flex w-full items-center gap-2.5 py-2 font-saveful text-[15px] text-gray-900"
                  >
                    <span
                      className={cn(
                        "flex h-5 w-5 items-center justify-center rounded-full border-2",
                        reason === item ? "border-[#40925B]" : "border-gray-300",
                      )}
                    >
                      {reason === item ? <span className="h-2.5 w-2.5 rounded-full bg-[#40925B]" /> : null}
                    </span>
                    {item}
                  </button>
                ))}
              </div>
              {reason === "Other" ? (
                <textarea
                  className="min-h-20 w-full rounded-xl border border-[#E0E0E0] p-3 font-saveful text-sm text-gray-900 outline-none focus:border-[#40925B]"
                  placeholder="Tell us more"
                  value={otherReason}
                  onChange={(event) => setOtherReason(event.target.value)}
                />
              ) : null}
              <button
                type="button"
                disabled={submitting}
                onClick={() => void submitNo()}
                className="w-full rounded-xl bg-[#40925B] py-3.5 font-saveful-semibold text-white disabled:opacity-60"
              >
                {submitting ? "Submitting…" : "Submit"}
              </button>
            </>
          ) : null}

          {error ? <p className="w-full rounded-xl bg-amber-50 px-3 py-2 font-saveful text-sm text-amber-800">{error}</p> : null}
        </div>
      </div>
    </div>
  );
}
