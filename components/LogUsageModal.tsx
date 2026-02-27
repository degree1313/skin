"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];

interface Props {
  open: boolean;
  onClose: () => void;
  products: Product[];
}

const DOSE_OPTIONS: {
  value: Database["public"]["Enums"]["dose"];
  label: string;
}[] = [
  { value: "half_pea", label: "Half pea" },
  { value: "pea", label: "Pea" },
  { value: "dime", label: "Dime" },
  { value: "one_pump", label: "1 pump" },
  { value: "two_pumps", label: "2 pumps" },
];

const ROUTINE_OPTIONS: {
  value: Database["public"]["Enums"]["routine_slot"];
  label: string;
}[] = [
  { value: "am", label: "AM" },
  { value: "pm", label: "PM" },
];

export default function LogUsageModal({ open, onClose, products }: Props) {
  const router = useRouter();
  const [productId, setProductId] = useState<string>(
    products[0]?.id ?? "",
  );
  const [dose, setDose] = useState<Database["public"]["Enums"]["dose"]>("pea");
  const [routineSlot, setRoutineSlot] =
    useState<Database["public"]["Enums"]["routine_slot"]>("pm");
  const [usedAt, setUsedAt] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const hasProducts = products.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!hasProducts) {
      setError("Add a product before logging usage.");
      return;
    }

    const selectedProductId = productId || products[0]?.id;
    if (!selectedProductId) {
      setError("Select a product to log.");
      return;
    }

    const payload: {
      product_id: string;
      routine_slot: Database["public"]["Enums"]["routine_slot"];
      dose: Database["public"]["Enums"]["dose"];
      used_at?: string;
    } = {
      product_id: selectedProductId,
      routine_slot: routineSlot,
      dose,
    };

    if (usedAt) {
      payload.used_at = new Date(usedAt).toISOString();
    }

    setLoading(true);
    try {
      const res = await fetch("/api/usages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json().catch(() => null);

      if (!res.ok) {
        setError(json?.error ?? "Unable to log usage. Please try again.");
        setLoading(false);
        return;
      }

      setLoading(false);
      setUsedAt("");
      onClose();
      router.refresh();
    } catch (err) {
      setLoading(false);
      setError("Network error while logging usage. Please try again.");
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
          Log product usage
        </h2>
        <p className="mt-1 text-xs text-slate-300">
          Track when and how much you applied so Barrier Autopilot can compute
          your irritation load.
        </p>

        {!hasProducts ? (
          <p className="mt-4 rounded-md bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            You don&apos;t have any products yet. Add a product first, then log
            usage.
          </p>
        ) : null}

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-200">
              Product
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-400"
              value={productId}
              onChange={(e) => setProductId(e.target.value)}
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-200">
                Routine
              </label>
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-400"
                value={routineSlot}
                onChange={(e) =>
                  setRoutineSlot(
                    e.target.value as Database["public"]["Enums"]["routine_slot"],
                  )
                }
              >
                {ROUTINE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-200">
                Dose
              </label>
              <select
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-400"
                value={dose}
                onChange={(e) =>
                  setDose(e.target.value as Database["public"]["Enums"]["dose"])
                }
              >
                {DOSE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-200">
              When did you apply it?
            </label>
            <input
              type="datetime-local"
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-50 outline-none placeholder:text-slate-500 focus:border-sky-400"
              value={usedAt}
              onChange={(e) => setUsedAt(e.target.value)}
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Leave blank to use the current time.
            </p>
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
              disabled={loading || !hasProducts}
            >
              {loading ? "Logging..." : "Log usage"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

