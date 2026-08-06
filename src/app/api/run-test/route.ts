import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

interface TestStep {
  name?: string;
  method: string;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  expected_status?: number;
  extract?: Record<string, string>; // e.g. { auth_token: "token" } or { user_id: "data.user.id" }
}

// Utility to replace {{var_name}} inside strings with values from variable state
function interpolateVariables(target: any, envVars: Record<string, any>): any {
  if (typeof target === "string") {
    return target.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, key) => {
      return envVars[key] !== undefined ? String(envVars[key]) : `{{${key}}}`;
    });
  }

  if (Array.isArray(target)) {
    return target.map((item) => interpolateVariables(item, envVars));
  }

  if (target !== null && typeof target === "object") {
    const result: Record<string, any> = {};
    for (const [k, v] of Object.entries(target)) {
      result[k] = interpolateVariables(v, envVars);
    }
    return result;
  }

  return target;
}

// Safely extract a nested property using dot notation (e.g. "data.token")
function extractValueByPath(obj: any, path: string): any {
  if (!obj || !path) return undefined;
  return path.split(".").reduce((acc, part) => acc && acc[part], obj);
}

export async function POST(request: Request) {
  try {
    const { testCaseId } = await request.json();
    const supabase = await createClient();

    if (!testCaseId) {
      return NextResponse.json({ error: "testCaseId is required" }, { status: 400 });
    }

    const { data: testCase, error } = await supabase
      .from("test_cases")
      .select("*")
      .eq("id", testCaseId)
      .single();

    if (error || !testCase) {
      return NextResponse.json({ error: "Test case not found" }, { status: 404 });
    }

    const steps: TestStep[] = testCase.steps || [];
    const stepResults = [];
    const executionContext: Record<string, any> = {}; // Shared context across chained steps
    let overallPassed = true;
    const startTime = Date.now();

    for (let i = 0; i < steps.length; i++) {
      const originalStep = steps[i];

      // Interpolate any {{vars}} stored in earlier steps into this step's URL, headers, and body
      const resolvedUrl = interpolateVariables(originalStep.url, executionContext);
      const resolvedHeaders = interpolateVariables(originalStep.headers || {}, executionContext);
      const resolvedBody = originalStep.body
        ? interpolateVariables(originalStep.body, executionContext)
        : undefined;

      const stepStartTime = Date.now();
      let actualStatus = 0;
      let stepPassed = false;
      let errorMsg: string | undefined = undefined;
      let responseData: any = null;

      try {
        const fetchOptions: RequestInit = {
          method: originalStep.method || "GET",
          headers: {
            "Content-Type": "application/json",
            ...resolvedHeaders,
          },
        };

        if (["POST", "PUT", "PATCH"].includes(originalStep.method.toUpperCase()) && resolvedBody) {
          fetchOptions.body =
            typeof resolvedBody === "string" ? resolvedBody : JSON.stringify(resolvedBody);
        }

        const res = await fetch(resolvedUrl, fetchOptions);
        actualStatus = res.status;

        const rawText = await res.text();
        try {
          responseData = JSON.parse(rawText);
        } catch {
          responseData = rawText;
        }

        const expectedStatus = originalStep.expected_status ?? 200;
        stepPassed = actualStatus === expectedStatus;

        // Perform variable extractions if step passed and extract rules exist
        if (stepPassed && originalStep.extract && typeof responseData === "object") {
          for (const [varName, path] of Object.entries(originalStep.extract)) {
            const extractedVal = extractValueByPath(responseData, path);
            if (extractedVal !== undefined) {
              executionContext[varName] = extractedVal;
            }
          }
        }
      } catch (err: any) {
        stepPassed = false;
        errorMsg = err.message || "Failed to make request";
      }

      if (!stepPassed) overallPassed = false;

      stepResults.push({
        stepIndex: i + 1,
        name: originalStep.name || `Step ${i + 1}`,
        resolvedUrl,
        actualStatus,
        expectedStatus: originalStep.expected_status ?? 200,
        status: stepPassed ? "passed" : "failed",
        durationMs: Date.now() - stepStartTime,
        error: errorMsg,
        extractedContext: { ...executionContext },
      });

      // Stop chain execution on failure
      if (!stepPassed) break;
    }

    const totalDuration = Date.now() - startTime;

    // Log the run to test_runs table
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
        context: executionContext,
      },
    });
  } catch (err: any) {
    console.error("Test execution error:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}