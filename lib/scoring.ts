import type { Database } from "@/lib/supabase/types";

type Product = Database["public"]["Tables"]["products"]["Row"];
type UsageLog = Database["public"]["Tables"]["product_usage_logs"]["Row"];
type DailyCheckin = Database["public"]["Tables"]["daily_checkins"]["Row"];

export type ActiveCategory = Product["active_category"];
export type Dose = UsageLog["dose"];
export type RoutineSlot = UsageLog["routine_slot"];

export const ACTIVE_WEIGHTS: Record<ActiveCategory, number> = {
  retinoid: 3,
  aha: 2,
  bha: 2,
  other: 1,
};

export const DOSE_MULTIPLIERS: Record<Dose, number> = {
  half_pea: 0.5,
  pea: 1,
  dime: 1.2,
  one_pump: 1.5,
  two_pumps: 2,
};

export type RecoveryStatus = "stable" | "caution" | "unstable";

export type IrritationWarningType =
  | "strong_actives_stack"
  | "retinoid_plus_acid_same_routine"
  | "aha_plus_bha_24h"
  | "near_limit"
  | "cil_over_rc"
  | "INFO";

export interface IrritationWarning {
  type: IrritationWarningType;
  ruleId: string;
  message: string;
  detail: string;
}

export type RcSource = "default" | "checkin";

export interface LoadComputationResult {
  cil: number;
  rc: number;
  rcSource: RcSource;
  status: RecoveryStatus;
  warnings: IrritationWarning[];
}

interface LogWithProduct {
  log: UsageLog;
  product: Product | undefined;
}

export function computeEntryScore(
  category: ActiveCategory,
  dose: Dose,
): number {
  const baseWeight = ACTIVE_WEIGHTS[category] ?? 1;
  const multiplier = DOSE_MULTIPLIERS[dose] ?? 1;
  return baseWeight * multiplier;
}

export function computeRecoveryCapacity(
  checkin: DailyCheckin | null | undefined,
): number | null {
  if (!checkin) {
    return null;
  }

  let rc = 10;
  rc -= checkin.stinging_level * 0.5;
  rc -= checkin.itchiness_level * 0.3;
  rc -= checkin.flaking_severity * 1.5;
  rc -= checkin.tightness ? 2 : 0;
  rc -= Math.min(checkin.stinging_minutes, 60) / 60;

  rc = Math.max(0, Math.min(rc, 10));
  return Math.round(rc * 10) / 10;
}

export function computeDailyIrritationLoad(
  products: Product[],
  logs: UsageLog[],
  checkin: DailyCheckin | null | undefined,
  now = new Date(),
): LoadComputationResult {
  const cutoff = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const productById = new Map(products.map((p) => [p.id, p]));

  const relevantLogs: LogWithProduct[] = logs
    .filter((log) => new Date(log.used_at) >= cutoff)
    .map((log) => ({
      log,
      product: productById.get(log.product_id),
    }));

  let total = 0;
  for (const { log, product } of relevantLogs) {
    const category = product?.active_category ?? "other";
    total += computeEntryScore(category, log.dose);
  }

  const cil = Math.round(total * 10) / 10;
  const rcRaw = computeRecoveryCapacity(checkin);

  let rc: number;
  let rcSource: "default" | "checkin";
  const warnings: IrritationWarning[] = [];

  if (rcRaw === null) {
    rc = 6.0;
    rcSource = "default";
    warnings.push({
      type: "INFO",
      ruleId: "NO_CHECKIN",
      message: "No daily check-in yet.",
      detail:
        "Using default recovery capacity (RC 6.0). Complete a check-in to personalize RC.",
    });
  } else {
    rc = rcRaw;
    rcSource = "checkin";
  }

  let status: RecoveryStatus = "stable";
  if (cil > rc + 1) {
    status = "unstable";
  } else if (cil > rc) {
    status = "caution";
  }

  const ruleWarnings = generateWarnings(relevantLogs, cil, rc, status);
  warnings.push(...ruleWarnings);

  return {
    cil,
    rc,
    rcSource,
    status,
    warnings,
  };
}

export function generateWarnings(
  logs: LogWithProduct[],
  cil: number,
  rc: number,
  status: RecoveryStatus,
): IrritationWarning[] {
  const warnings: IrritationWarning[] = [];

  if (logs.length === 0) {
    return warnings;
  }

  // 1) 3+ strong actives (base_weight >= 3) in 24h
  const strongActivesEntries = logs.filter(({ product }) => {
    if (!product) return false;
    const baseWeight = ACTIVE_WEIGHTS[product.active_category] ?? 1;
    return baseWeight >= 3;
  });
  const strongActivesCount = strongActivesEntries.length;

  if (strongActivesCount >= 3) {
    const parts = strongActivesEntries.map(
      ({ product }) => `${product!.name} (${product!.active_category})`,
    );
    const detail =
      `Triggered: ${strongActivesCount} strong-active uses in 24h (base_weight ≥ 3): ${parts.join(", ")}.`;

    warnings.push({
      type: "strong_actives_stack",
      ruleId: "STRONG_ACTIVES_STACK",
      message:
        "You’ve used 3+ strong actives in the last 24 hours. Consider a recovery-only night.",
      detail,
    });
  }

  // 2) retinoid + AHA/BHA in the same routine (same AM or same PM)
  const routines = new Map<
    string,
    { retinoidNames: string[]; acidNames: string[] }
  >();

  for (const { log, product } of logs) {
    if (!product) continue;
    const slot = log.routine_slot;
    const dateKey = new Date(log.used_at).toISOString().slice(0, 10);
    const key = `${dateKey}-${slot}`;
    const bucket = routines.get(key) ?? {
      retinoidNames: [],
      acidNames: [],
    };

    if (product.active_category === "retinoid") {
      bucket.retinoidNames.push(product.name);
    }
    if (
      product.active_category === "aha" ||
      product.active_category === "bha"
    ) {
      bucket.acidNames.push(`${product.name} (${product.active_category})`);
    }

    routines.set(key, bucket);
  }

  const routinePairs = Array.from(routines.entries()).filter(
    ([_, b]) => b.retinoidNames.length > 0 && b.acidNames.length > 0,
  );

  if (routinePairs.length > 0) {
    const parts = routinePairs.map(([key, b]) => {
      const segments = key.split("-");
      const date =
        segments.length >= 3
          ? `${segments[0]}-${segments[1]}-${segments[2]}`
          : key;
      const slot = segments.length > 3 ? segments[3] : "";
      return `${date} ${slot.toUpperCase()}: retinoid (${b.retinoidNames.join(", ")}) with acid (${b.acidNames.join(", ")})`;
    });
    const detail = `Same routine used: ${parts.join("; ")}.`;

    warnings.push({
      type: "retinoid_plus_acid_same_routine",
      ruleId: "RETINOID_PLUS_ACID_SAME_ROUTINE",
      message:
        "You combined a retinoid with an AHA/BHA in the same routine. This combo is high risk for redness and stinging.",
      detail,
    });
  }

  // 3) AHA + BHA within 24h
  const ahaProducts = logs
    .filter(({ product }) => product?.active_category === "aha")
    .map(({ product }) => product!.name);
  const bhaProducts = logs
    .filter(({ product }) => product?.active_category === "bha")
    .map(({ product }) => product!.name);

  if (ahaProducts.length > 0 && bhaProducts.length > 0) {
    const ahaList = [...new Set(ahaProducts)].join(", ");
    const bhaList = [...new Set(bhaProducts)].join(", ");
    const detail = `Both AHA and BHA used in last 24h: AHA (${ahaList}); BHA (${bhaList}).`;

    warnings.push({
      type: "aha_plus_bha_24h",
      ruleId: "AHA_PLUS_BHA_24H",
      message:
        "You’ve used both an AHA and a BHA within 24 hours. Consider spacing your acids further apart.",
      detail,
    });
  }

  // 4) Capacity-based warnings
  const cilRounded = Math.round(cil * 10) / 10;
  const rcRounded = Math.round(rc * 10) / 10;

  if (status === "caution") {
    warnings.push({
      type: "near_limit",
      ruleId: "NEAR_LIMIT",
      message:
        "Your irritation load is brushing up against your recovery capacity.",
      detail: `CIL ${cilRounded} is within 1.0 of RC ${rcRounded}.`,
    });
  } else if (status === "unstable") {
    const excess = Math.round((cil - rc) * 10) / 10;
    warnings.push({
      type: "cil_over_rc",
      ruleId: "CIL_OVER_RC",
      message:
        "Your irritation load is higher than your recovery capacity. Recovery mode is recommended.",
      detail: `CIL ${cilRounded} exceeds RC ${rcRounded} by ${excess}.`,
    });
  }

  return warnings;
}


