import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/client";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const projectId = params.id;

  try {
    const body = await request.json();
    const { status, duration_ms, latency } = body;

    const runPayload = {
      project_id: projectId,
      status: status || "passed",
      duration_ms: duration_ms ?? latency ?? 0,
    };

    const { data, error } = await supabase
      .from("runs")
      .insert([runPayload])
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const projectId = params.id;

  try {
    const { data, error } = await supabase
      .from("runs")
      .select("*")
      .or(`project_id.eq.${projectId},project_id.ilike.${projectId}`)
      .order("created_at", { ascending: false });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ runs: data });
  } catch (err: unknown) {
    const errorMsg =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}