import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";
import { runActionStep, runAssertionStep } from "@/lib/test-runner/web-steps";

export const maxDuration = 60;

export async function POST(request: Request) {
  let browser;
  try {
    const body = await request.json();
    const steps = body.steps || (body.test && body.test.steps) || [];
    const mode: "headless" | "headed" = body.mode === "headed" ? "headed" : "headless";

    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: "No executable web test steps provided" }, { status: 400 });
    }

    const isLocal = process.env.NODE_ENV === "development";

    browser = await playwrightChromium.launch({
      args: isLocal ? [] : chromium.args,
      executablePath: isLocal ? undefined : await chromium.executablePath(),
      headless: true,
    });

    const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
    const page = await context.newPage();

    const results = [];
    let totalLatency = 0;
    let overallSuccess = true;
    let targetUrl = "";

    for (const step of steps) {
      const startTime = Date.now();
      let passed = true;
      let error: string | null = null;

      try {
        if (step.mode === "assertion") {
          await runAssertionStep(page, step);
        } else {
          await runActionStep(page, step);
          if (step.action === "goto" && step.url) targetUrl = step.url;
        }
      } catch (err: unknown) {
        passed = false;
        overallSuccess = false;
        error = err instanceof Error ? err.message : "Step execution failed";
      }

      const latency = Date.now() - startTime;
      totalLatency += latency;

      let screenshot: string | null = null;
      try {
        const buffer = await page.screenshot({ type: "jpeg", quality: 60 });
        screenshot = `data:image/jpeg;base64,${buffer.toString("base64")}`;
      } catch {
        screenshot = null;
      }

      results.push({
        stepName: step.name || "Unnamed Web Step",
        action: step.mode === "assertion" ? step.assertionType : step.action,
        mode: step.mode || "action",
        statusReturned: passed ? 200 : 500,
        expectedStatus: 200,
        passed,
        latency,
        error,
        screenshot,
      });
    }

    await browser.close();

    return NextResponse.json({
      success: overallSuccess,
      totalLatency,
      stepsEvaluated: steps.length,
      mode,
      targetUrl,
      details: results,
    });
  } catch (err: unknown) {
    if (browser) await browser.close().catch(() => {});
    const errorMessage = err instanceof Error ? err.message : "Internal Server Error";
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}