import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

// Remote binary fallback for Vercel Serverless
const REMOTE_CHROMIUM_URL =
  "https://github.com/Sparticuz/chromium/releases/download/v123.0.0/chromium-v123.0.0-pack.tar";

export async function POST(req: Request) {
  let browser = null;

  try {
    const body = await req.json().catch(() => ({}));
    const steps = Array.isArray(body.steps) ? body.steps : [];

    if (steps.length === 0) {
      steps.push({
        action: "navigate",
        value: body.url || "https://www.saucedemo.com/",
        title: "Default Navigation",
      });
    }

    const isVercel = process.env.VERCEL === "1";

    if (isVercel) {
      // Clean executable path retrieval with fallback URL
      const executablePath = await chromium.executablePath(REMOTE_CHROMIUM_URL);

      browser = await playwrightChromium.launch({
        args: chromium.args,
        executablePath: executablePath,
        headless: true,
      });
    } else {
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
          const targetUrl = step.value || step.url || "https://www.saucedemo.com/";
          const res = await page.goto(targetUrl, {
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

        const imageBuffer = await page.screenshot({ type: "png" });
        const stepBase64 = `data:image/png;base64,${imageBuffer.toString("base64")}`;

        evaluatedSteps.push({
          step: i + 1,
          title: step.title || `${step.action || "action"} ${step.selector || ""}`,
          action: step.action || "navigate",
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
          action: step.action || "error",
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
    if (browser) {
      await (browser as any).close().catch(() => {});
    }
    console.error("Vercel Execution Error:", error);
    return NextResponse.json(
      { error: error?.message || "Execution engine failure" },
      { status: 500 }
    );
  }
}