import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { id: testId } = await params;

    if (!testId) {
      return NextResponse.json(
        { error: "Test ID is required" },
        { status: 400 }
      );
    }

    // Delete associated test runs first
    await supabase.from("test_runs").delete().eq("test_case_id", testId);

    // Delete the test case
    const { error } = await supabase
      .from("test_cases")
      .delete()
      .eq("id", testId);

    if (error) {
      console.error("Delete test error:", error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Delete test server error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}