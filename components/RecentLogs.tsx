"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { RecentLogItem } from "@/components/DashboardShell";

interface Props {
  logs: RecentLogItem[];
}

function formatTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "Unknown time";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function humanDose(dose: RecentLogItem["dose"]) {
  switch (dose) {
    case "half_pea":
      return "½ pea";
    case "pea":
      return "pea";
    case "dime":
      return "dime";
    case "one_pump":
      return "1 pump";
    case "two_pumps":
      return "2 pumps";
    default:
      return dose;
  }
}

function activeBadge(category: RecentLogItem["productCategory"]) {
  if (category === "retinoid") {
    return (
      <span className="ml-1 inline-flex items-center rounded-full bg-rose-500/20 px-2 py-[1px] text-[9px] font-medium text-rose-200">
        Strong active
      </span>
    );
  }
  if (category === "aha" || category === "bha") {
    return (
      <span className="ml-1 inline-flex items-center rounded-full bg-sky-500/20 px-2 py-[1px] text-[9px] font-medium text-sky-200">
        Exfoliating
      </span>
    );
  }
  return null;
}

export default function RecentLogs({ logs }: Props) {
  const router = useRouter();
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDelete(id: string) {
    if (deletingId) return;
    setDeletingId(id);
    setDeleteError(null);
    try {
      const res = await fetch(`/api/usages/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        router.refresh();
      } else {
        const raw = await res.text();
        let message = `Delete failed (${res.status})`;
        try {
          const json = JSON.parse(raw) as { error?: string; message?: string };
          message = json.error ?? json.message ?? message;
        } catch {
          if (raw) message = raw;
        }
        setDeleteError(message);
      }
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="card h-full p-5 sm:p-6">
      <h2 className="text-sm font-semibold tracking-tight text-slate-50">
        Recent logs
      </h2>
      {deleteError && (
        <p className="mt-2 rounded-md bg-red-500/20 px-3 py-2 text-xs text-red-200">
          {deleteError}
        </p>
      )}
      {logs.length === 0 ? (
        <p className="mt-3 text-sm text-slate-300">
          No usage logged yet. Start by adding a product and logging tonight&apos;s
          routine.
        </p>
      ) : (
        <ul className="mt-3 space-y-3 text-xs text-slate-200">
          {logs.map((log) => (
            <li
              key={log.id}
              className="flex items-start justify-between gap-3 rounded-md bg-black/20 px-3 py-2"
            >
              <div className="min-w-0">
                <p className="truncate font-medium text-slate-50">
                  {log.productName}
                  {activeBadge(log.productCategory)}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-400">
                  {log.routineSlot.toUpperCase()} • {humanDose(log.dose)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-[11px] text-slate-400">
                  {formatTime(log.usedAt)}
                </p>
                <button
                  type="button"
                  aria-label="Delete log"
                  className="rounded-full border border-white/10 px-2 py-1 text-[10px] text-slate-300 hover:bg-red-500/20 hover:text-red-100 disabled:opacity-40"
                  onClick={() => handleDelete(log.id)}
                  disabled={deletingId === log.id}
                >
                  {deletingId === log.id ? "Deleting…" : "Delete"}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

