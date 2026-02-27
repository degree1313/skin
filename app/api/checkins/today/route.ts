import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type CheckinRow = Database["public"]["Tables"]["daily_checkins"]["Row"];

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("daily_checkins")
    .select("*")
    .eq("user_id", user.id)
    .gte("created_at", startOfDay.toISOString())
    .order("created_at", { ascending: false })
    .limit(1);

  if (error) {
    const err = error as PostgrestError;
    // eslint-disable-next-line no-console
    console.error("daily_checkins GET /today error", err);

    const payload =
      process.env.NODE_ENV !== "production"
        ? {
            error: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint,
          }
        : { error: "Failed to load today’s check-in." };

    return NextResponse.json(payload, { status: 400 });
  }

  const checkin: CheckinRow | null = data && data.length > 0 ? data[0] : null;

  return NextResponse.json<CheckinRow | null>(checkin, { status: 200 });
}

