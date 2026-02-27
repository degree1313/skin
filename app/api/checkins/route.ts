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
    console.error("daily_checkins GET error", err);

    const payload =
      process.env.NODE_ENV !== "production"
        ? {
            error: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint,
          }
        : { error: "Failed to load check-ins." };

    return NextResponse.json(payload, { status: 400 });
  }

  const checkin: CheckinRow | null = data && data.length > 0 ? data[0] : null;

  return NextResponse.json<CheckinRow | null>(checkin, { status: 200 });
}

export async function POST(req: Request) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body." },
      { status: 400 },
    );
  }

  const {
    stinging_level = 0,
    stinging_minutes = 0,
    tightness = false,
    flaking_severity = 0,
    itchiness_level = 0,
  } = body as {
    stinging_level?: number;
    stinging_minutes?: number;
    tightness?: boolean;
    flaking_severity?: number;
    itchiness_level?: number;
  };

  if (
    !Number.isFinite(stinging_level) ||
    stinging_level < 0 ||
    stinging_level > 10
  ) {
    return NextResponse.json(
      { error: "stinging_level must be between 0 and 10." },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(stinging_minutes) ||
    stinging_minutes < 0 ||
    stinging_minutes > 240
  ) {
    return NextResponse.json(
      { error: "stinging_minutes must be between 0 and 240." },
      { status: 400 },
    );
  }

  if (!Number.isFinite(flaking_severity) || flaking_severity < 0 || flaking_severity > 3) {
    return NextResponse.json(
      { error: "flaking_severity must be between 0 and 3." },
      { status: 400 },
    );
  }

  if (
    !Number.isFinite(itchiness_level) ||
    itchiness_level < 0 ||
    itchiness_level > 10
  ) {
    return NextResponse.json(
      { error: "itchiness_level must be between 0 and 10." },
      { status: 400 },
    );
  }

  if (typeof tightness !== "boolean") {
    return NextResponse.json(
      { error: "tightness must be a boolean." },
      { status: 400 },
    );
  }

  const { error } = await supabase.from("daily_checkins").insert({
    user_id: user.id,
    stinging_level,
    stinging_minutes,
    tightness,
    flaking_severity,
    itchiness_level,
  });

  if (error) {
    const err = error as PostgrestError;
    // eslint-disable-next-line no-console
    console.error("daily_checkins insert error", err);
    if (process.env.NODE_ENV !== "production") {
      // eslint-disable-next-line no-console
      console.error("daily_checkins insert full error", JSON.stringify(err, null, 2));
    }

    const payload =
      process.env.NODE_ENV !== "production"
        ? {
            error: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint,
          }
        : { error: "Failed to save check-in." };

    return NextResponse.json(payload, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

