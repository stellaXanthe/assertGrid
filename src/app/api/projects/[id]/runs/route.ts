import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json(
        { error: "Project ID is required" },
        { status: 400 }
      );
    }

    const { data: runs, error } = await supabase
      .from("test_runs")
      .select("*, test_cases(name)")
      .eq("project_id", projectId)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      console.error("Fetch runs error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ runs: runs || [] });
  } catch (err: any) {
    console.error("Runs history error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}