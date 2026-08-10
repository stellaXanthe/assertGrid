import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium } from "playwright-core";

export const maxDuration = 30;
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let browser = null;

  try {
    const body = await req.json().catch(() => ({}));
    const steps =
      Array.isArray(body.steps) && body.steps.length > 0
        ? body.steps
        : [
            {
              action: "navigate",
              value: body.url || "https://www.saucedemo.com/",
              title: "Default Navigation",
            },
          ];

    const isVercel = process.env.VERCEL === "1";

    if (isVercel) {
      chromium.setGraphicsMode = false;
      const executablePath = await chromium.executablePath();

      browser = await playwrightChromium.launch({
        args: [
          ...chromium.args,
          "--disable-gpu",
          "--disable-dev-shm-usage",
          "--disable-setuid-sandbox",
          "--no-first-run",
          "--no-sandbox",
          "--no-zygote",
          "--single-process",
        ],
        executablePath,
        headless: true,
      });
    } else {
      browser = await playwrightChromium.launch({ headless: true });
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
            timeout: 10000,
          });
          statusCode = res?.status() || 200;
        } else if (action === "fill" || action === "type") {
          if (step.selector) {
            await page.waitForSelector(step.selector, { timeout: 4000 });
            await page.fill(step.selector, step.value || "");
          }
        } else if (action === "click") {
          if (step.selector) {
            await page.waitForSelector(step.selector, { timeout: 4000 });
            await page.click(step.selector);
          }
        }

        const imageBuffer = await page.screenshot({ type: "png" });
        evaluatedSteps.push({
          step: i + 1,
          title: step.title || `${step.action || "action"} ${step.selector || ""}`,
          statusReturned: statusCode,
          passed: true,
          screenshot: `data:image/png;base64,${imageBuffer.toString("base64")}`,
        });
      } catch (stepErr: any) {
        overallPassed = false;
        evaluatedSteps.push({
          step: i + 1,
          title: step.title || `Step #${i + 1}`,
          statusReturned: 500,
          passed: false,
          error: stepErr.message,
        });
      }
    }

    await browser.close();
    return NextResponse.json({ passed: overallPassed, steps: evaluatedSteps });
  } catch (error: any) {
    if (browser) await (browser as any).close().catch(() => {});

    console.error("Vercel Execution Error:", error);

    return NextResponse.json(
      { error: error?.message || "Execution engine failure", details: String(error) },
      { status: 500 }
    );
  }
}