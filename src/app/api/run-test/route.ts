import { NextResponse } from "next/server";
import { chromium } from "playwright";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { method, url, steps, headless, type } = body;

    // Detect if running on Vercel or in production mode
    const isProduction =
      process.env.VERCEL || process.env.NODE_ENV === "production";

    // Vercel serverless environments must run headless
    const runHeadless = isProduction ? true : (headless ?? true);

    // -------------------------------------------------------------
    // 1. Direct API Test Execution (if type === 'api' or steps empty)
    // -------------------------------------------------------------
    if (type === "api" || (!steps || steps.length === 0)) {
      if (!url) {
        return NextResponse.json(
          { error: "Target URL is required for API tests." },
          { status: 400 }
        );
      }

      const fetchMethod = (method || "GET").toUpperCase();
      const startTime = performance.now();

      const apiResponse = await fetch(url, {
        method: fetchMethod,
        headers: body.headers || {},
        body: ["POST", "PUT", "PATCH"].includes(fetchMethod) && body.body
          ? JSON.stringify(body.body)
          : undefined,
      });

      const endTime = performance.now();
      const status = apiResponse.status;
      const expectedStatus = body.expected_status || 200;

      return NextResponse.json({
        passed: status === expectedStatus,
        steps: [
          {
            step: 1,
            title: `${fetchMethod} Request to ${url}`,
            statusReturned: status,
            expected: expectedStatus,
            passed: status === expectedStatus,
          },
        ],
        duration_ms: Math.round(endTime - startTime),
      });
    }

    // -------------------------------------------------------------
    // 2. Playwright Browser Automation Test Execution
    // -------------------------------------------------------------
    let browser;
    try {
      browser = await chromium.launch({
        headless: runHeadless,
      });
    } catch (launchErr: unknown) {
      const msg =
        launchErr instanceof Error ? launchErr.message : String(launchErr);
      return NextResponse.json(
        {
          error: `Browser launch failed: ${msg}. Note: Headed mode is only supported in local development environments.`,
        },
        { status: 500 }
      );
    }

    const context = await browser.newContext();
    const page = await context.newPage();
    const evaluatedSteps = [];

    for (const step of steps) {
      const action = step.action || step.type;

      if (action === "navigate" || step.url || step.value?.startsWith("http")) {
        const targetUrl = step.value || step.url || url;
        const response = await page.goto(targetUrl, {
          waitUntil: "domcontentloaded",
        });

        const status = response?.status() || 200;
        const expected = step.expected_status || 200;

        evaluatedSteps.push({
          step: evaluatedSteps.length + 1,
          title: step.title || step.name || `Navigate to ${targetUrl}`,
          statusReturned: status,
          expected: expected,
          passed: status === expected,
        });
      } else if (action === "fill" && step.selector) {
        await page.fill(step.selector, step.value || "");
        evaluatedSteps.push({
          step: evaluatedSteps.length + 1,
          title: step.title || step.name || `Fill ${step.selector}`,
          statusReturned: 200,
          expected: 200,
          passed: true,
        });
      } else if (action === "click" && step.selector) {
        await page.click(step.selector);
        evaluatedSteps.push({
          step: evaluatedSteps.length + 1,
          title: step.title || step.name || `Click ${step.selector}`,
          statusReturned: 200,
          expected: 200,
          passed: true,
        });
      } else if (action === "assert_text" && step.selector) {
        const textContent = await page.textContent(step.selector);
        const expectedText = step.value || "";
        const passed = textContent?.includes(expectedText) ?? false;

        evaluatedSteps.push({
          step: evaluatedSteps.length + 1,
          title: step.title || step.name || `Assert text at ${step.selector}`,
          statusReturned: passed ? 200 : 400,
          expected: 200,
          passed,
        });
      }
    }

    await browser.close();

    return NextResponse.json({
      passed: evaluatedSteps.every((s) => s.passed),
      steps: evaluatedSteps,
    });
  } catch (error: unknown) {
    const errMessage =
      error instanceof Error ? error.message : "Automation execution failed.";
    console.error("Playwright execution error:", errMessage);

    return NextResponse.json(
      { error: errMessage },
      { status: 500 }
    );
  }
}