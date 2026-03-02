"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface Props {
  open: boolean;
  onClose: () => void;
  initialFlakingSeverity?: 0 | 1 | 2 | 3;
}

export default function DailyCheckinModal({
  open,
  onClose,
  initialFlakingSeverity,
}: Props) {
  const router = useRouter();
  const [stingingLevel, setStingingLevel] = useState(0);
  const [stingingMinutes, setStingingMinutes] = useState(0);
  const [tightness, setTightness] = useState(false);
  const [flakingSeverity, setFlakingSeverity] = useState(
    initialFlakingSeverity ?? 0,
  );
  const [itchiness, setItchiness] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && initialFlakingSeverity !== undefined) {
      setFlakingSeverity(initialFlakingSeverity);
    }
  }, [open, initialFlakingSeverity]);

  if (!open) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    setLoading(true);
    try {
      const res = await fetch("/api/checkins", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stinging_level: stingingLevel,
          stinging_minutes: stingingMinutes,
          tightness,
          flaking_severity: flakingSeverity,
          itchiness_level: itchiness,
        }),
      });

      if (res.status === 201) {
        setLoading(false);
        onClose();
        router.refresh();
        return;
      }

      const text = await res.text().catch(() => "");
      let message = "Unable to save check-in. Please try again.";
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
      setError("Network error while saving check-in. Please try again.");
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
          Daily check-in
        </h2>
        <p className="mt-1 text-xs text-slate-300">
          Tell Barrier Autopilot how your skin feels today so it can adjust
          your recovery capacity.
        </p>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <label className="font-medium">Stinging level</label>
              <span>{stingingLevel} / 10</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={stingingLevel}
              onChange={(e) => setStingingLevel(Number(e.target.value))}
              className="mt-1 w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <label className="font-medium">Stinging minutes today</label>
              <span>{stingingMinutes} min</span>
            </div>
            <input
              type="range"
              min={0}
              max={60}
              value={stingingMinutes}
              onChange={(e) => setStingingMinutes(Number(e.target.value))}
              className="mt-1 w-full"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Roughly how many minutes total did your skin sting today?
            </p>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-xs font-medium text-slate-200">
              Skin feels tight
            </label>
            <button
              type="button"
              onClick={() => setTightness((v) => !v)}
              className={`inline-flex h-6 w-10 items-center rounded-full border border-white/10 px-1 text-[10px] transition ${
                tightness ? "bg-sky-500/80" : "bg-black/40"
              }`}
            >
              <span
                className={`h-4 w-4 rounded-full bg-white transition ${
                  tightness ? "translate-x-4" : ""
                }`}
              />
            </button>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-200">
              Flaking / peeling
            </label>
            <select
              className="mt-1 w-full rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-slate-50 outline-none focus:border-sky-400"
              value={flakingSeverity}
              onChange={(e) =>
                setFlakingSeverity(
                  Math.min(3, Math.max(0, Number(e.target.value))) as
                    | 0
                    | 1
                    | 2
                    | 3,
                )
              }
            >
              <option value={0}>0 – none</option>
              <option value={1}>1 – mild (small patches)</option>
              <option value={2}>2 – moderate (visible)</option>
              <option value={3}>3 – heavy (sheeting)</option>
            </select>
          </div>

          <div className="relative z-10">
            <div className="flex items-center justify-between text-[11px] text-slate-300 pointer-events-none">
              <label className="font-medium">Itchiness</label>
              <span>{itchiness} / 10</span>
            </div>
            <input
              type="range"
              min={0}
              max={10}
              value={itchiness}
              onChange={(e) => setItchiness(Number(e.target.value))}
              className="mt-1 w-full"
            />
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
              {loading ? "Saving..." : "Save check-in"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

