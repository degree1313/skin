"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SkinType = "oily" | "combination" | "dry" | "normal";

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function SkinTypeOnboardingModal({ open, onClose }: Props) {
  const router = useRouter();
  const [skinType, setSkinType] = useState<SkinType | "">("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) return null;

  async function handleSubmit(skip: boolean) {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skin_type: skip ? null : skinType || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError((data.error as string) || "Failed to save.");
        setLoading(false);
        return;
      }
      onClose();
      router.refresh();
    } catch {
      setError("Network error.");
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm">
      <div
        className="card w-full max-w-md p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="text-sm font-semibold tracking-tight text-slate-50">
          What’s your skin type?
        </h2>
        <p className="mt-1 text-xs text-slate-300">
          This helps us tailor your skin photo analysis (e.g. shine map). You can
          skip or change it later.
        </p>

        <div className="mt-4 space-y-2">
          {(
            [
              "oily",
              "combination",
              "dry",
              "normal",
            ] as const
          ).map((type) => (
            <label
              key={type}
              className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                skinType === type
                  ? "border-sky-400 bg-sky-500/20 text-slate-50"
                  : "border-white/10 bg-black/20 text-slate-200 hover:border-white/20"
              }`}
            >
              <input
                type="radio"
                name="skinType"
                value={type}
                checked={skinType === type}
                onChange={() => setSkinType(type)}
                className="sr-only"
              />
              <span className="capitalize">{type}</span>
            </label>
          ))}
        </div>

        {error && (
          <p className="mt-3 text-xs text-rose-300" role="alert">
            {error}
          </p>
        )}

        <div className="mt-4 flex justify-end gap-2">
          <button
            type="button"
            className="btn-secondary px-3 py-1 text-xs"
            onClick={() => handleSubmit(true)}
            disabled={loading}
          >
            Skip
          </button>
          <button
            type="button"
            className="btn-primary px-4 py-1 text-xs disabled:opacity-60"
            onClick={() => handleSubmit(false)}
            disabled={loading || !skinType}
          >
            {loading ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
