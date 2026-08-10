import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function GET() {
  const supabase = createClient();

  try {
    const { data: runs, error: runsError } = await supabase
      .from("runs")
      .select("*");

    if (runsError) {
      console.error("Analytics fetch error:", runsError);
      return NextResponse.json({ error: runsError.message }, { status: 500 });
    }

    const { data: projects, error: projError } = await supabase
      .from("projects")
      .select("*");

    if (projError) {
      console.error("Projects fetch error:", projError);
      return NextResponse.json({ error: projError.message }, { status: 500 });
    }

    const totalRuns = runs?.length || 0;
    const passedRuns =
      runs?.filter((r) => String(r.status).toLowerCase() === "passed").length || 0;
    const failedRuns =
      runs?.filter((r) => String(r.status).toLowerCase() === "failed").length || 0;

    const passRate =
      totalRuns > 0 ? Math.round((passedRuns / totalRuns) * 100) : 0;

    const totalLatency =
      runs?.reduce(
        (acc, r) => acc + (Number(r.duration_ms) || Number(r.latency) || 0),
        0
      ) || 0;

    const avgLatency =
      totalRuns > 0 ? Math.round(totalLatency / totalRuns) : 0;

    return NextResponse.json({
      passRate,
      avgLatency,
      totalExecutions: totalRuns,
      failedExecutions: failedRuns,
      totalProjects: projects?.length || 0,
    });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}