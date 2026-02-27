import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

interface Params {
  params: Promise<{ id: string }>;
}

export async function DELETE(_request: Request, { params }: Params) {
  const supabase = await createClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  if (!id) {
    return NextResponse.json({ error: "Missing id." }, { status: 400 });
  }

  const { error } = await supabase
    .from("product_usage_logs")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) {
    const payload =
      process.env.NODE_ENV === "development"
        ? {
            error: error.message,
            code: error.code,
            details: error.details,
            hint: error.hint,
          }
        : { error: "Failed to delete usage log." };
    return NextResponse.json(payload, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}

