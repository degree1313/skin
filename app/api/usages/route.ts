import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

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

  const { product_id, routine_slot, dose, used_at } = body as {
    product_id?: string;
    routine_slot?: Database["public"]["Enums"]["routine_slot"];
    dose?: Database["public"]["Enums"]["dose"];
    used_at?: string;
  };

  if (!product_id) {
    return NextResponse.json(
      { error: "product_id is required." },
      { status: 400 },
    );
  }

  const allowedSlots: Database["public"]["Enums"]["routine_slot"][] = [
    "am",
    "pm",
  ];

  if (!routine_slot || !allowedSlots.includes(routine_slot)) {
    return NextResponse.json(
      { error: "routine_slot is invalid." },
      { status: 400 },
    );
  }

  const allowedDoses: Database["public"]["Enums"]["dose"][] = [
    "half_pea",
    "pea",
    "dime",
    "one_pump",
    "two_pumps",
  ];

  if (!dose || !allowedDoses.includes(dose)) {
    return NextResponse.json(
      { error: "dose is invalid." },
      { status: 400 },
    );
  }

  let usedAtValue: string | undefined;
  if (used_at) {
    const parsed = new Date(used_at);
    if (Number.isNaN(parsed.getTime())) {
      return NextResponse.json(
        { error: "used_at must be a valid datetime." },
        { status: 400 },
      );
    }
    usedAtValue = parsed.toISOString();
  }

  const { error } = await supabase.from("product_usage_logs").insert({
    product_id,
    routine_slot,
    dose,
    user_id: user.id,
    used_at: usedAtValue,
  });

  if (error) {
    const err = error as PostgrestError;
    // eslint-disable-next-line no-console
    console.error("product_usage_logs insert error", err);

    const payload =
      process.env.NODE_ENV !== "production"
        ? {
            error: err.message,
            code: err.code,
            details: err.details,
            hint: err.hint,
          }
        : { error: "Failed to log usage." };

    return NextResponse.json(payload, { status: 400 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}

