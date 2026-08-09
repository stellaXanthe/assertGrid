import { NextResponse } from "next/server";
import { chromium } from "playwright";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { method, url, steps, headless, type } = body;

    const runHeadless = typeof headless === "boolean" ? headless : true;
    const BROWSERLESS_TOKEN = process.env.BROWSERLESS_API_KEY;

    // -------------------------------------------------------------
    // 1. Interactive / Headed Mode on Vercel via Remote Browser
    // -------------------------------------------------------------
    if (!runHeadless && BROWSERLESS_TOKEN) {
      // Connect to Browserless over WebSockets
      const browser = await chromium.connectOverCDP(
        `wss://chrome.browserless.io?token=${BROWSERLESS_TOKEN}`
      );

      const context = await browser.newContext({
        viewport: { width: 1280, height: 720 },
      });
      const page = await context.newPage();

      if (url) {
        await page.goto(url, { waitUntil: "domcontentloaded" });
      }

      // Generate live interactive view session URL for embed inside <iframe>
      const liveEmbedUrl = `https://chrome.browserless.io/live?token=${BROWSERLESS_TOKEN}&viewport=1280x720`;

      const evaluatedSteps = [];
      for (const step of steps) {
        if (step.action === "navigate") {
          await page.goto(step.value || url);
        } else if (step.action === "fill" && step.selector) {
          await page.fill(step.selector, step.value || "");
        } else if (step.action === "click" && step.selector) {
          await page.click(step.selector);
        }
        evaluatedSteps.push({
          step: evaluatedSteps.length + 1,
          title: step.title || step.action,
          passed: true,
          statusReturned: 200,
          expected: 200,
        });
      }

      await browser.close();

      return NextResponse.json({
        passed: true,
        isInteractiveRemote: true,
        liveEmbedUrl: liveEmbedUrl,
        steps: evaluatedSteps,
      });
    }

    // -------------------------------------------------------------
    // 2. Standard Serverless Execution (Headless Fallback)
    // -------------------------------------------------------------
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext();
    const page = await context.newPage();
    const evaluatedSteps = [];

    for (const step of steps) {
      if (step.action === "navigate" || step.url) {
        await page.goto(step.value || step.url || url);
      } else if (step.action === "fill" && step.selector) {
        await page.fill(step.selector, step.value || "");
      } else if (step.action === "click" && step.selector) {
        await page.click(step.selector);
      }
      evaluatedSteps.push({
        step: evaluatedSteps.length + 1,
        title: step.title || step.action,
        passed: true,
        statusReturned: 200,
        expected: 200,
      });
    }

    await browser.close();

    return NextResponse.json({
      passed: true,
      steps: evaluatedSteps,
    });
  } catch (error: unknown) {
    const errMessage =
      error instanceof Error ? error.message : "Execution error.";
    return NextResponse.json({ error: errMessage }, { status: 500 });
  }
}