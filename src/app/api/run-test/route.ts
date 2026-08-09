import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

// Vercel serverless function runtime configuration
export const maxDuration = 30; // Max execution time for Vercel Hobby/Pro
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let browser = null;

  try {
    const { steps, headless = true } = await req.json();

    // Check if running on Vercel or locally
    const isVercel = process.env.VERCEL === "1";

    if (isVercel) {
      // Vercel Serverless Environment
      const executablePath = await chromium.executablePath();
      browser = await playwrightChromium.launch({
        args: chromium.args,
        defaultViewport: chromium.defaultViewport,
        executablePath: executablePath,
        headless: chromium.headless === "shell" ? true : chromium.headless,
      });
    } else {
      // Local Development Environment
      browser = await playwrightChromium.launch({
        headless: true,
      });
    }

    const context = await browser.newContext({
      viewport: { width: 1280, height: 720 },
    });
    const page = await context.newPage();

    const evaluatedSteps = [];
    let overallPassed = true;

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      let statusCode = 200;

      try {
        const action = (step.action || step.type || "").toLowerCase();

        if (action === "goto" || action === "navigate") {
          const res = await page.goto(step.value || step.url, {
            waitUntil: "domcontentloaded",
            timeout: 15000,
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
            await page.waitForTimeout(500);
          }
        }

        // Capture step frame screenshot
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
          screenshot: stepBase64,
        });
      } catch (err: any) {
        overallPassed = false;

        const errorBuffer = await page
          .screenshot({ type: "png" })
          .catch(() => null);
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
    if (browser) await browser.close();
    console.error("Vercel Execution Error:", error);
    return NextResponse.json(
      { error: error.message || "Execution engine failure" },
      { status: 500 }
    );
  }
}