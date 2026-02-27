"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onClose: () => void;
}

const ACTIVE_OPTIONS = [
  { value: "retinoid", label: "Retinoid" },
  { value: "aha", label: "AHA (glycolic, lactic, etc.)" },
  { value: "bha", label: "BHA (salicylic, etc.)" },
  { value: "other", label: "Other / barrier safe" },
] as const;

export default function AddProductModal({ open, onClose }: Props) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [category, setCategory] =
    useState<(typeof ACTIVE_OPTIONS)[number]["value"]>("other");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError("Product name is required.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: trimmedName,
          active_category: category,
        }),
      });

      if (res.status === 201) {
        setName("");
        setCategory("other");
        setLoading(false);
        onClose();
        router.refresh();
        return;
      }

      const text = await res.text().catch(() => "");
      let message = "Unable to save product. Please try again.";
      try {
        const json = text ? JSON.parse(text) : null;
        if (json && typeof json.error === "string") message = json.error;
        else if (text) message = text;
      } catch {
        if (text) message = text;
      }
      setError(message);
      setLoading(false);
    } catch (err) {
      setLoading(false);
      setError("Network error while saving product. Please try again.");
    }
  }

  function handleBackdropClick(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="card w-full max-w-md p-6 shadow-2xl">
        <h2 className="text-sm font-semibold tracking-tight text-slate-50">
          Add product
        </h2>
        <p className="mt-1 text-xs text-slate-300">
          Keep this simple: just name and active category. No ingredient
          parsing.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-200">
              Product name
            </label>
            <input
              type="text"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-400"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={120}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-200">
              Active category
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-400"
              value={category}
              onChange={(e) =>
                setCategory(e.target.value as (typeof ACTIVE_OPTIONS)[number]["value"])
              }
            >
              {ACTIVE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {error && (
            <p className="text-xs text-rose-300" role="alert">
              {error}
            </p>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-1 text-xs"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary px-4 py-1 text-xs disabled:opacity-60"
              disabled={loading}
            >
              {loading ? "Saving..." : "Save product"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

