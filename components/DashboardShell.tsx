"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Database } from "@/lib/supabase/types";
import type {
  IrritationWarning,
  RecoveryStatus,
  RcSource,
} from "@/lib/scoring";
import DashboardCards from "@/components/DashboardCards";
import RecentLogs from "@/components/RecentLogs";
import AddProductModal from "@/components/AddProductModal";
import LogUsageModal from "@/components/LogUsageModal";
import DailyCheckinModal from "@/components/DailyCheckinModal";
import SkinTypeOnboardingModal from "@/components/SkinTypeOnboardingModal";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

type Product = Database["public"]["Tables"]["products"]["Row"];
type Profile = Database["public"]["Tables"]["user_profiles"]["Row"] | null;

export type RecentLogItem = {
  id: string;
  usedAt: string;
  routineSlot: Database["public"]["Enums"]["routine_slot"];
  dose: Database["public"]["Enums"]["dose"];
  productName: string;
  productCategory: Database["public"]["Enums"]["active_category"];
};

interface Props {
  products: Product[];
  recentLogs: RecentLogItem[];
  load: number;
  warnings: IrritationWarning[];
  rc: number;
  rcSource: RcSource;
  status: RecoveryStatus;
  profile: Profile;
  openCheckin?: boolean;
  initialFlakingSeverity?: 0 | 1 | 2 | 3;
}

export default function DashboardShell({
  products,
  recentLogs,
  load,
  rc,
  rcSource,
  status,
  warnings,
  profile,
  openCheckin = false,
  initialFlakingSeverity,
}: Props) {
  const router = useRouter();
  const supabase = createClient();

  const [isAddProductOpen, setIsAddProductOpen] = useState(false);
  const [isLogUsageOpen, setIsLogUsageOpen] = useState(false);
  const [isCheckinOpen, setIsCheckinOpen] = useState(openCheckin);

  async function handleSignOut() {
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen px-4 py-6 sm:px-6 sm:py-8">
      <div className="mx-auto flex max-w-5xl flex-col gap-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
              Barrier Autopilot
            </h1>
            <p className="text-xs text-slate-300 sm:text-sm">
              Daily “barrier autopilot” that keeps you safely below your
              irritation threshold.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Link
              href="/analyze"
              className="btn-secondary text-xs sm:text-sm"
            >
              Analyze skin
            </Link>
            <button
              type="button"
              onClick={() => setIsCheckinOpen(true)}
              className="btn-secondary text-xs sm:text-sm"
            >
              Daily check-in
            </button>
            <button
              type="button"
              onClick={handleSignOut}
              className="btn-secondary text-xs sm:text-sm"
            >
              Sign out
            </button>
          </div>
        </header>

        <main className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1.2fr)]">
          <section className="space-y-4">
            <DashboardCards
              load={load}
              rc={rc}
              rcSource={rcSource}
              status={status}
              warnings={warnings}
              onAddProduct={() => setIsAddProductOpen(true)}
              onLogUsage={() => setIsLogUsageOpen(true)}
              hasProducts={products.length > 0}
            />
          </section>

          <aside className="space-y-4">
            <RecentLogs logs={recentLogs} />
          </aside>
        </main>
      </div>

      <AddProductModal
        open={isAddProductOpen}
        onClose={() => setIsAddProductOpen(false)}
      />

      <LogUsageModal
        open={isLogUsageOpen}
        onClose={() => setIsLogUsageOpen(false)}
        products={products}
      />

      <DailyCheckinModal
        open={isCheckinOpen}
        onClose={() => setIsCheckinOpen(false)}
        initialFlakingSeverity={initialFlakingSeverity}
      />

      <SkinTypeOnboardingModal
        open={profile === null}
        onClose={() => {}}
      />
    </div>
  );
}

