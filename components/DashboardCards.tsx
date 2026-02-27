"use client";

import { useState } from "react";
import type {
  IrritationWarning,
  RecoveryStatus,
  RcSource,
} from "@/lib/scoring";

interface Props {
  load: number;
  rc: number;
  rcSource: RcSource;
  status: RecoveryStatus;
  warnings: IrritationWarning[];
  onAddProduct: () => void;
  onLogUsage: () => void;
  hasProducts: boolean;
}

export default function DashboardCards({
  load,
  rc,
  rcSource,
  status,
  warnings,
  onAddProduct,
  onLogUsage,
  hasProducts,
}: Props) {
  const roundedLoad = Number.isFinite(load) ? load.toFixed(1) : "0.0";
  const roundedRc = Number.isFinite(rc) ? rc.toFixed(1) : "10.0";
  const hasWarnings = warnings.length > 0;

  const showFirstRunHelper = !hasProducts && !hasWarnings && load === 0;

  const clampedLoad = Math.max(0, Math.min(load, 10));
  const clampedRc = Math.max(0, Math.min(rc, 10));
  const loadBarPercent = (clampedLoad / 10) * 100;
  const rcMarkerPercent = (clampedRc / 10) * 100;

  let loadBarColor = "bg-emerald-500";
  if (status === "unstable") {
    loadBarColor = "bg-rose-500";
  } else if (status === "caution") {
    loadBarColor = "bg-amber-400";
  }

  const statusLabel =
    status === "stable"
      ? "Stable"
      : status === "caution"
        ? "Caution"
        : "Unstable";

  const statusBadgeClass =
    status === "stable"
      ? "bg-emerald-500/20 text-emerald-300"
      : status === "caution"
        ? "bg-amber-500/20 text-amber-200"
        : "bg-rose-500/20 text-rose-200";

  const guidanceCopy =
    status === "stable"
      ? "You’re below your recovery limit. You can stay on plan or enjoy a recovery night."
      : status === "caution"
        ? "Near your limit. Consider skipping strong actives tonight."
        : "Above your recovery limit. Recovery-only recommended 24–48h.";

  const [expandedWhy, setExpandedWhy] = useState<string | null>(null);

  function toggleWhy(key: string) {
    setExpandedWhy((k) => (k === key ? null : key));
  }

  return (
    <div className="space-y-4">
      <div className="card flex flex-col gap-4 p-5 sm:p-6">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Load & recovery
            </p>
            <div className="mt-2 flex flex-wrap items-baseline gap-x-4 gap-y-1">
              <p className="text-4xl font-semibold tracking-tight sm:text-5xl">
                {roundedLoad}
                <span className="text-base font-normal text-slate-400"> / 10</span>
              </p>
              <p className="text-lg text-slate-300">
                RC{" "}
                <span className="font-medium text-slate-100">{roundedRc}</span>
                <span className="text-slate-400"> / 10</span>
              </p>
              <span
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${statusBadgeClass}`}
              >
                {statusLabel}
              </span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              className="btn-primary w-full whitespace-nowrap"
              onClick={onLogUsage}
            >
              Log usage
            </button>
            <button
              type="button"
              className="btn-secondary w-full whitespace-nowrap"
              onClick={onAddProduct}
            >
              Add product
            </button>
          </div>
        </div>

        <div className="mt-2">
          {rcSource === "default" && (
            <p className="mb-2 text-xs text-amber-200/90">
              Using default recovery capacity — do a Daily check-in to
              personalize.
            </p>
          )}
          <div className="flex items-center justify-between text-[11px] text-slate-400">
            <span>{statusLabel}</span>
            <span>Load {clampedLoad.toFixed(1)} · RC {clampedRc.toFixed(1)}</span>
          </div>
          <div className="relative mt-1 h-3 rounded-full bg-slate-800">
            <div
              className={`absolute inset-y-0 left-0 rounded-full ${loadBarColor}`}
              style={{ width: `${loadBarPercent}%` }}
            />
            {rcMarkerPercent > 0 && rcMarkerPercent < 100 && (
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-slate-100 shadow-sm"
                style={{ left: `${rcMarkerPercent}%` }}
                title={`RC = ${roundedRc}`}
              />
            )}
          </div>
        </div>

        <p className="text-xs text-slate-400">
          Load = irritation from actives (24h). RC = recovery capacity from
          today’s check-in. Keep load at or below RC.
        </p>
        {showFirstRunHelper && (
          <p className="mt-1 text-xs text-slate-300">
            Add your first product and log tonight&apos;s routine to see your
            first 24-hour irritation load.
          </p>
        )}
      </div>

      <div className="card p-5 sm:p-6">
        <h2 className="text-sm font-semibold tracking-tight text-slate-50">
          Barrier warnings
        </h2>
        {!hasWarnings ? (
          <p className="mt-3 text-sm text-emerald-300">{guidanceCopy}</p>
        ) : (
          <>
            <p className="mt-2 text-xs text-slate-300">{guidanceCopy}</p>
            <ul className="mt-3 space-y-2 text-sm text-amber-200">
              {warnings.map((warning, i) => {
                const key = `${warning.type}-${warning.ruleId}-${i}`;
                const isExpanded = expandedWhy === key;
                return (
                  <li
                    key={key}
                    className="rounded-md bg-amber-500/10 px-3 py-2"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <span className="flex-1">{warning.message}</span>
                      <button
                        type="button"
                        className="shrink-0 text-[10px] text-amber-200/80 underline-offset-2 hover:underline"
                        onClick={() => toggleWhy(key)}
                        aria-expanded={isExpanded}
                      >
                        {isExpanded ? "Hide" : "Why?"}
                      </button>
                    </div>
                    {isExpanded && (
                      <div className="mt-2 border-t border-amber-500/20 pt-2 text-[11px] text-slate-300">
                        <span className="font-mono font-medium text-slate-200">
                          {warning.ruleId}
                        </span>
                        <p className="mt-1">{warning.detail}</p>
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}


