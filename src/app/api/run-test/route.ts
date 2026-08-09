import { NextResponse } from "next/server";
import { chromium } from "playwright";

export async function POST(req: Request) {
  try {
    const { steps, headless = true } = await req.json();

    const browser = await chromium.launch({ headless });
    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    const evaluatedSteps = [];
    let overallPassed = true;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let stepPassed = true;
      let statusCode = 200;

      try {
        const action = (step.action || step.type || "").toLowerCase();

        if (action === "goto" || action === "navigate") {
          const res = await page.goto(step.value || step.url, {
            waitUntil: "networkidle",
          });
          statusCode = res?.status() || 200;
        } else if (action === "fill" || action === "type") {
          if (step.selector) {
            await page.waitForSelector(step.selector, { timeout: 5000 });
            await page.fill(step.selector, step.value || "");
          }
        } else if (action === "click") {
          if (step.selector) {
            await page.waitForSelector(step.selector, { timeout: 5000 });
            await page.click(step.selector);
            // Brief pause to capture DOM changes after click
            await page.waitForTimeout(500);
          }
        }

        // CAPTURE UNIQUE SCREENSHOT IMMEDIATELY AFTER THIS STEP
        const imageBuffer = await page.screenshot({ type: "png" });
        const stepBase64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;

        evaluatedSteps.push({
          step: i + 1,
          title: step.title || `${step.action} ${step.selector || ""}`,
          action: step.action,
          selector: step.selector,
          value: step.value,
          statusReturned: statusCode,
          expected: step.expected_status || 200,
          passed: true,
          screenshot: stepBase64, // UNIQUE PER STEP
        });
      } catch (err) {
        stepPassed = false;
        overallPassed = false;

        const errorBuffer = await page.screenshot({ type: "png" }).catch(() => null);
        const errorBase64 = errorBuffer
          ? `data:image/png;base64,${errorBuffer.toString("base64")}`
          : null;

        evaluatedSteps.push({
          step: i + 1,
          title: step.title || `Step #${i + 1}`,
          action: step.action,
          selector: step.selector,
          value: step.value,
          statusReturned: 500,
          expected: step.expected_status || 200,
          passed: false,
          screenshot: errorBase64,
        });
      }
    }

    await browser.close();

    return NextResponse.json({
      passed: overallPassed,
      steps: evaluatedSteps,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}