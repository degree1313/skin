import { NextResponse } from "next/server";
import type { PostgrestError } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProfileRow = Database["public"]["Tables"]["user_profiles"]["Row"];
type SkinType = Database["public"]["Enums"]["skin_type"];

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_profiles")
    .select("*")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (error) {
    const err = error as PostgrestError;
    // eslint-disable-next-line no-console
    console.error("user_profiles GET error", err);
    const payload =
      process.env.NODE_ENV !== "production"
        ? { error: err.message, code: err.code }
        : { error: "Failed to load profile." };
    return NextResponse.json(payload, { status: 400 });
  }

  const profile: ProfileRow | null = data;
  return NextResponse.json<ProfileRow | null>(profile, { status: 200 });
}

export async function PUT(req: Request) {
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
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const { skin_type } = body as { skin_type?: SkinType | null };

  const validSkinTypes: (SkinType | null)[] = [
    "oily",
    "combination",
    "dry",
    "normal",
    null,
  ];
  if (skin_type !== undefined && !validSkinTypes.includes(skin_type)) {
    return NextResponse.json(
      { error: "skin_type must be oily, combination, dry, normal, or null." },
      { status: 400 },
    );
  }

  const now = new Date().toISOString();

  const { data: existing } = await supabase
    .from("user_profiles")
    .select("id")
    .eq("user_id", user.id)
    .limit(1)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("user_profiles")
      // @ts-expect-error Supabase infers never for update
      .update({ skin_type: skin_type ?? null, updated_at: now })
      .eq("user_id", user.id);

    if (error) {
      const err = error as PostgrestError;
      // eslint-disable-next-line no-console
      console.error("user_profiles update error", err);
      return NextResponse.json(
        process.env.NODE_ENV !== "production"
          ? { error: err.message }
          : { error: "Failed to update profile." },
        { status: 400 },
      );
    }
  } else {
    const { error } = await supabase
      .from("user_profiles")
      // @ts-expect-error Supabase infers never for insert
      .insert({
        user_id: user.id,
        skin_type: skin_type ?? null,
        created_at: now,
        updated_at: now,
      });

    if (error) {
      const err = error as PostgrestError;
      // eslint-disable-next-line no-console
      console.error("user_profiles insert error", err);
      return NextResponse.json(
        process.env.NODE_ENV !== "production"
          ? { error: err.message }
          : { error: "Failed to create profile." },
        { status: 400 },
      );
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
