import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: projectId } = await params;
    const supabase = await createClient();

    const { data: testCases } = await supabase
      .from("test_cases")
      .select("id")
      .eq("project_id", projectId);

    const testCaseIds = testCases?.map((tc) => tc.id) || [];

    if (testCaseIds.length === 0) {
      return NextResponse.json({ runs: [] });
    }

    const { data: runs, error } = await supabase
      .from("test_runs")
      .select(`
        id,
        status,
        started_at,
        duration_ms,
        test_cases ( name )
      `)
      .in("test_case_id", testCaseIds)
      .order("started_at", { ascending: false })
      .limit(20);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ runs });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch runs";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}