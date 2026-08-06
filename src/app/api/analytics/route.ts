import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    // Fetch test runs from the last 30 days
    const { data: runs, error } = await supabase
      .from("test_runs")
      .select("id, status, duration_ms, started_at, project_id, test_case_id")
      .order("started_at", { ascending: false })
      .limit(500);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const totalRuns = runs?.length || 0;
    const passedRuns = runs?.filter((r) => r.status === "passed").length || 0;
    const failedRuns = runs?.filter((r) => r.status === "failed").length || 0;

    // Calculate Uptime / Success Rate
    const passRate = totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 100;

    // Calculate Average Latency (MS)
    const validDurations = runs?.filter((r) => typeof r.duration_ms === "number" && r.duration_ms > 0) || [];
    const avgLatency =
      validDurations.length > 0
        ? Math.round(
            validDurations.reduce((acc, r) => acc + (r.duration_ms || 0), 0) / validDurations.length
          )
        : 0;

    return NextResponse.json({
      metrics: {
        totalRuns,
        passedRuns,
        failedRuns,
        passRate,
        avgLatency,
      },
      recentRuns: runs?.slice(0, 10) || [],
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}