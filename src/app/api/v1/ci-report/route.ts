// src/app/api/v1/ci-report/route.ts
import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get("authorization");
    const apiKey = authHeader?.replace("Bearer ", "");

    if (!apiKey || apiKey !== process.env.ASSERTGRID_CI_API_KEY) {
      return NextResponse.json(
        { error: "Unauthorized: Invalid or missing CI API key" },
        { status: 401 }
      );
    }

    const { projectId, status, durationMs, details } = await request.json();

    if (!projectId || !status) {
      return NextResponse.json(
        { error: "Missing required fields: projectId, status" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Store CI Test Run result in database
    const { data, error } = await supabase
      .from("test_runs")
      .insert({
        project_id: projectId,
        status: status, // 'passed' | 'failed'
        duration_ms: durationMs || 0,
        logs: details || "Executed via Woodpecker CI",
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: "CI test run record updated successfully",
      run: data,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}