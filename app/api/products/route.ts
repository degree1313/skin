import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/supabase/types";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];

export async function GET() {
  const supabase = createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json(
      { error: "Failed to load products." },
      { status: 500 },
    );
  }

  return NextResponse.json<ProductRow[]>(data ?? []);
}

export async function POST(req: Request) {
  const supabase = createClient();

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

  const { name, active_category } = body as {
    name?: string;
    active_category?: Database["public"]["Enums"]["active_category"];
  };

  const trimmedName = (name ?? "").trim();

  if (!trimmedName) {
    return NextResponse.json(
      { error: "Product name is required." },
      { status: 400 },
    );
  }

  const allowedCategories: Database["public"]["Enums"]["active_category"][] = [
    "retinoid",
    "aha",
    "bha",
    "other",
  ];

  if (!active_category || !allowedCategories.includes(active_category)) {
    return NextResponse.json(
      { error: "Active category is invalid." },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("products")
    .insert({
      name: trimmedName,
      active_category,
      user_id: user.id,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json(
      { error: "Failed to create product." },
      { status: 500 },
    );
  }

  return NextResponse.json<ProductRow>(data, { status: 201 });
}

