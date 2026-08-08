import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const steps = body.steps || (body.test && body.test.steps) || [];

    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json(
        { error: "No executable test steps provided" },
        { status: 400 }
      );
    }

    // Determine fallback URL from step 1 or body payload
    const defaultUrl =
      steps[0]?.url || steps[0]?.targetUrl || body.url || body.targetUrl || "";

    const results = [];
    let totalLatency = 0;
    let overallSuccess = true;

    for (const step of steps) {
      const startTime = Date.now();

      const method = (step.method || step.action || "GET").toString().toUpperCase();
      const targetUrl = step.url || step.targetUrl || defaultUrl;

      if (!targetUrl) {
        results.push({
          stepName: step.name || "Unnamed Step",
          statusReturned: 0,
          expectedStatus: step.expectedStatus || 200,
          passed: false,
          latency: 0,
          error: "Target URL is missing for this step",
        });
        overallSuccess = false;
        continue;
      }

      try {
        let parsedHeaders: Record<string, string> = {};
        if (typeof step.headers === "string" && step.headers.trim()) {
          parsedHeaders = JSON.parse(step.headers);
        } else if (typeof step.headers === "object" && step.headers !== null) {
          parsedHeaders = step.headers;
        }

        // Spoof standard browser headers to prevent Vercel / Cloudflare 403 Forbidden anti-bot errors
        const headers: Record<string, string> = {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          "Accept":
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
          ...parsedHeaders,
        };

        const fetchOptions: RequestInit = {
          method,
          headers,
          redirect: "follow",
        };

        if (["POST", "PUT", "PATCH"].includes(method) && step.body) {
          fetchOptions.body =
            typeof step.body === "string" ? step.body : JSON.stringify(step.body);
        }

        const response = await fetch(targetUrl, fetchOptions);
        const latency = Date.now() - startTime;
        totalLatency += latency;

        const expectedStatus = Number(step.expectedStatus || step.expected_status) || 200;
        const passed = response.status === expectedStatus;

        if (!passed) {
          overallSuccess = false;
        }

        results.push({
          stepName: step.name || step.step_name || "Unnamed Step",
          statusReturned: response.status,
          expectedStatus: expectedStatus,
          passed: passed,
          latency: latency,
          error: passed
            ? null
            : `Expected status ${expectedStatus} but received ${response.status}`,
        });
      } catch (err: unknown) {
        const latency = Date.now() - startTime;
        totalLatency += latency;
        overallSuccess = false;

        const errorMessage =
          err instanceof Error ? err.message : "Network/Execution Error";

        results.push({
          stepName: step.name || step.step_name || "Unnamed Step",
          statusReturned: 0,
          expectedStatus: step.expectedStatus || 200,
          passed: false,
          latency: latency,
          error: errorMessage,
        });
      }
    }

    return NextResponse.json({
      success: overallSuccess,
      totalLatency: totalLatency,
      stepsEvaluated: steps.length,
      details: results,
    });
  } catch (err: unknown) {
    const errorMessage =
      err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}