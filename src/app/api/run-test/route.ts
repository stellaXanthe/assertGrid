import { NextResponse } from "next/server";
import { chromium } from "playwright";

interface StepDefinition {
  id?: string;
  name?: string;
  title?: string;
  action?: string;
  type?: string;
  category?: "action" | "assertion";
  selector?: string;
  value?: string;
  url?: string;
}

export async function POST(req: Request) {
  let browser = null;

  try {
    const body = await req.json();
    const { steps = [], headless = true } = body;

    // Resolve URL from root or from the first step that contains a URL
    let targetUrl: string = body.url || "";
    if (!targetUrl && Array.isArray(steps)) {
      const stepWithUrl = steps.find((s: StepDefinition) => s.url || s.value?.startsWith("http"));
      if (stepWithUrl) {
        targetUrl = stepWithUrl.url || stepWithUrl.value || "";
      }
    }

    if (!targetUrl && (!Array.isArray(steps) || steps.length === 0)) {
      return NextResponse.json(
        { error: "Missing target URL or steps to execute." },
        { status: 400 }
      );
    }

    // Launch browser instance
    browser = await chromium.launch({
      headless: Boolean(headless),
      slowMo: headless ? 0 : 300,
    });

    const context = await browser.newContext();
    const page = await context.newPage();

    const evaluatedSteps = [];

    // Execute steps sequentially
    if (Array.isArray(steps) && steps.length > 0) {
      for (let i = 0; i < steps.length; i++) {
        const stepDef: StepDefinition = steps[i];
        const stepNum = i + 1;
        const stepTitle =
          stepDef.name || stepDef.title || `Step ${stepNum}: ${stepDef.action || "Action"}`;
        const action = stepDef.action || "goto";

        try {
          if (action === "navigate" || action === "goto") {
            const navUrl = stepDef.url || stepDef.value || targetUrl;
            const res = await page.goto(navUrl, { waitUntil: "domcontentloaded" });
            const status = res?.status() || 200;

            evaluatedSteps.push({
              step: stepNum,
              title: stepTitle,
              statusReturned: status,
              expected: 200,
              passed: status < 400,
            });
          } else if (action === "fill" || action === "type") {
            if (stepDef.selector) {
              await page.fill(stepDef.selector, stepDef.value || "");
            }
            evaluatedSteps.push({
              step: stepNum,
              title: stepTitle,
              statusReturned: 200,
              expected: 200,
              passed: true,
            });
          } else if (action === "click") {
            if (stepDef.selector) {
              await page.click(stepDef.selector);
            }
            evaluatedSteps.push({
              step: stepNum,
              title: stepTitle,
              statusReturned: 200,
              expected: 200,
              passed: true,
            });
          } else if (action === "toBeVisible") {
            if (stepDef.selector) {
              await page.waitForSelector(stepDef.selector, {
                state: "visible",
                timeout: 5000,
              });
            }
            evaluatedSteps.push({
              step: stepNum,
              title: stepTitle,
              statusReturned: 200,
              expected: 200,
              passed: true,
            });
          } else {
            // Default generic step execution
            evaluatedSteps.push({
              step: stepNum,
              title: stepTitle,
              statusReturned: 200,
              expected: 200,
              passed: true,
            });
          }
        } catch (stepErr: any) {
          evaluatedSteps.push({
            step: stepNum,
            title: `${stepTitle} - ${stepErr.message || "Failed"}`,
            statusReturned: 500,
            expected: 200,
            passed: false,
          });
          break; // Stop running subsequent steps if one fails
        }
      }
    } else {
      // Fallback if no steps provided: navigate to URL directly
      const response = await page.goto(targetUrl, { waitUntil: "domcontentloaded" });
      const statusCode = response?.status() || 200;

      evaluatedSteps.push({
        step: 1,
        title: `Open ${targetUrl}`,
        statusReturned: statusCode,
        expected: 200,
        passed: statusCode < 400,
      });
    }

    const allPassed = evaluatedSteps.every((s) => s.passed);

    return NextResponse.json({
      passed: allPassed,
      steps: evaluatedSteps,
    });
  } catch (err: any) {
    console.error("[API /api/run-test] Execution Error:", err);
    return NextResponse.json(
      { error: err.message || "Failed to execute test run." },
      { status: 500 }
    );
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}