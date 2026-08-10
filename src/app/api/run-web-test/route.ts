import { NextResponse } from "next/server";
import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, type Page } from "playwright-core";

export const maxDuration = 60;

async function runAction(page: Page, step: any) {
  const selector = step.selector;
  if (selector && step.action !== "goto") {
    await page.waitForSelector(selector, { timeout: 8000, state: "attached" });
  }

  switch (step.action) {
    case "goto":
      await page.goto(step.url, { waitUntil: "domcontentloaded", timeout: 15000 });
      break;
    case "click":
      await page.click(selector, { timeout: 8000 });
      break;
    case "dblclick":
      await page.dblclick(selector, { timeout: 8000 });
      break;
    case "fill":
      await page.fill(selector, step.value || "", { timeout: 8000 });
      break;
    case "clear":
      await page.fill(selector, "", { timeout: 8000 });
      break;
    case "press":
      await page.press(selector, step.value || "Enter", { timeout: 8000 });
      break;
    case "check":
      await page.check(selector, { timeout: 8000 });
      break;
    case "uncheck":
      await page.uncheck(selector, { timeout: 8000 });
      break;
    case "selectOption":
      await page.selectOption(selector, step.value || "", { timeout: 8000 });
      break;
    case "hover":
      await page.hover(selector, { timeout: 8000 });
      break;
    case "dragTo":
      await page.dragAndDrop(selector, step.value || "", { timeout: 8000 });
      break;
    case "setInputFiles":
      await page.setInputFiles(selector, step.value || "");
      break;
    default:
      throw new Error(`Unsupported action: ${step.action}`);
  }
}

async function runAssertion(page: Page, step: any) {
  const selector = step.selector;
  const locator = selector ? page.locator(selector).first() : null;

  switch (step.assertionType) {
    case "toBeVisible": {
      if (!locator) throw new Error("Selector is required for toBeVisible");
      await locator.waitFor({ state: "visible", timeout: 8000 });
      break;
    }
    case "toBeHidden": {
      if (!locator) throw new Error("Selector is required for toBeHidden");
      const visible = await locator.isVisible().catch(() => false);
      if (visible) throw new Error(`Element "${selector}" is visible, expected hidden`);
      break;
    }
    case "toHaveText": {
      if (!locator) throw new Error("Selector is required for toHaveText");
      await locator.waitFor({ state: "attached", timeout: 8000 });
      const text = ((await locator.textContent()) || "").trim();
      if (text !== (step.value || "").trim()) {
        throw new Error(`Expected text "${step.value}" but got "${text}"`);
      }
      break;
    }
    case "toContainText": {
      if (!locator) throw new Error("Selector is required for toContainText");
      await locator.waitFor({ state: "attached", timeout: 8000 });
      const text = (await locator.textContent()) || "";
      if (!text.includes(step.value || "")) {
        throw new Error(`Expected text to contain "${step.value}" but got "${text}"`);
      }
      break;
    }
    case "toHaveValue": {
      if (!locator) throw new Error("Selector is required for toHaveValue");
      await locator.waitFor({ state: "attached", timeout: 8000 });
      const value = await locator.inputValue();
      if (value !== (step.value || "")) {
        throw new Error(`Expected value "${step.value}" but got "${value}"`);
      }
      break;
    }
    case "toHaveAttribute": {
      if (!locator) throw new Error("Selector is required for toHaveAttribute");
      await locator.waitFor({ state: "attached", timeout: 8000 });
      const attrValue = await locator.getAttribute(step.attributeName || "");
      if (attrValue !== (step.value || "")) {
        throw new Error(
          `Expected attribute "${step.attributeName}" to be "${step.value}" but got "${attrValue}"`
        );
      }
      break;
    }
    case "toBeEnabled": {
      if (!locator) throw new Error("Selector is required for toBeEnabled");
      const enabled = await locator.isEnabled();
      if (!enabled) throw new Error(`Element "${selector}" is disabled, expected enabled`);
      break;
    }
    case "toBeDisabled": {
      if (!locator) throw new Error("Selector is required for toBeDisabled");
      const enabled = await locator.isEnabled();
      if (enabled) throw new Error(`Element "${selector}" is enabled, expected disabled`);
      break;
    }
    case "toHaveURL": {
      const url = page.url();
      if (!url.includes(step.value || "")) {
        throw new Error(`Expected URL to contain "${step.value}" but got "${url}"`);
      }
      break;
    }
    default:
      throw new Error(`Unsupported assertion type: ${step.assertionType}`);
  }
}

export async function POST(request: Request) {
  let browser;
  try {
    const body = await request.json();
    const steps = body.steps || (body.test && body.test.steps) || [];
    const mode: "headless" | "headed" = body.mode === "headed" ? "headed" : "headless";

    if (!Array.isArray(steps) || steps.length === 0) {
      return NextResponse.json({ error: "No executable web test steps provided" }, { status: 400 });
    }

    // Determine environment to dynamically set binary launch options
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
          await runAssertion(page, step);
        } else {
          await runAction(page, step);
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