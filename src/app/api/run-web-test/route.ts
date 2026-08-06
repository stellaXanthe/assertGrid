import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { chromium } from "playwright";

export async function POST(request: Request) {
  try {
    const { testCaseId } = await request.json();
    const supabase = await createClient();

    const { data: testCase, error } = await supabase
      .from("test_cases")
      .select("*")
      .eq("id", testCaseId)
      .single();

    if (error || !testCase) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 });
    }

    const steps = testCase.steps || [];
    const stepResults = [];
    let overallPassed = true;
    const startTime = Date.now();

    // Launch headless Chromium browser
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      const stepStartTime = Date.now();
      let stepPassed = true;
      let errorMsg = "";

      try {
        switch (step.action) {
          case "goto":
            await page.goto(step.url, { waitUntil: "networkidle", timeout: 10000 });
            break;

          case "fill":
            await page.fill(step.selector, step.value || "");
            break;

          case "click":
            await page.click(step.selector, { timeout: 5000 });
            break;

          case "assert_text":
            const content = await page.textContent("body");
            if (!content || !content.includes(step.value || "")) {
              throw new Error(`Text "${step.value}" not found on page.`);
            }
            break;

          default:
            throw new Error(`Unknown browser action: ${step.action}`);
        }
      } catch (err: any) {
        stepPassed = false;
        errorMsg = err.message || "Action failed";
      }

      if (!stepPassed) overallPassed = false;

      stepResults.push({
        stepIndex: i + 1,
        name: step.name || `Step ${i + 1}`,
        action: step.action,
        status: stepPassed ? "passed" : "failed",
        durationMs: Date.now() - stepStartTime,
        error: errorMsg,
      });

      if (!stepPassed) break; // Stop execution on failure
    }

    await browser.close();

    const totalDuration = Date.now() - startTime;

    // Log the Web Run execution
    await supabase.from("test_runs").insert({
      project_id: testCase.project_id,
      test_case_id: testCase.id,
      status: overallPassed ? "passed" : "failed",
      duration_ms: totalDuration,
      results: stepResults,
      started_at: new Date().toISOString(),
    });

    return NextResponse.json({
      success: true,
      result: {
        status: overallPassed ? "passed" : "failed",
        durationMs: totalDuration,
        results: stepResults,
      },
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}