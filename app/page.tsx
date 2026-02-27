import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";
import {
  computeDailyIrritationLoad,
  type IrritationWarning,
  type ActiveCategory,
  type Dose,
  type RoutineSlot,
  type RecoveryStatus,
} from "@/lib/scoring";
import DashboardShell from "@/components/DashboardShell";

type Product = Database["public"]["Tables"]["products"]["Row"];
type DailyCheckin = Database["public"]["Tables"]["daily_checkins"]["Row"];

type RecentLog = {
  id: string;
  usedAt: string;
  routineSlot: RoutineSlot;
  dose: Dose;
  productName: string;
  productCategory: ActiveCategory;
};

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    redirect("/login");
  }

  const { data: productsData } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  const { data: logsData } = await supabase
    .from("product_usage_logs")
    .select("*")
    .order("used_at", { ascending: false })
    .limit(50);

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { data: checkinsData } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  const products: Product[] = productsData ?? [];
  const logs = logsData ?? [];
  const todayCheckin: DailyCheckin | null =
    checkinsData && checkinsData.length > 0 ? checkinsData[0] : null;

  const { cil, rc, rcSource, status, warnings } = computeDailyIrritationLoad(
    products,
    logs,
    todayCheckin,
    now,
  );

  const productById = new Map(products.map((p) => [p.id, p]));

  const recentLogs: RecentLog[] = logs
    .slice()
    .sort(
      (a, b) =>
        new Date(b.used_at).getTime() - new Date(a.used_at).getTime(),
    )
    .slice(0, 10)
    .map((log) => {
      const product = productById.get(log.product_id);

      return {
        id: log.id,
        usedAt: log.used_at,
        routineSlot: log.routine_slot as RoutineSlot,
        dose: log.dose as Dose,
        productName: product?.name ?? "Unknown product",
        productCategory: (product?.active_category ??
          "other") as ActiveCategory,
      };
    });

  return (
    <DashboardShell
      products={products}
      recentLogs={recentLogs}
      load={cil}
      rc={rc}
      rcSource={rcSource}
      status={status as RecoveryStatus}
      warnings={warnings as IrritationWarning[]}
    />
  );
}

