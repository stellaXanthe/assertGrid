import chromium from "@sparticuz/chromium";
import { chromium as playwrightChromium, type Page, type CDPSession } from "playwright-core";
import { runActionStep, runAssertionStep } from "@/lib/test-runner/web-steps";

export const maxDuration = 60;
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const steps = Array.isArray(body.steps) ? body.steps : [];

  const encoder = new TextEncoder();
  let browser: any = null;
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          // controller already closed, ignore
        }
      };

      if (!Array.isArray(steps) || steps.length === 0) {
        send("fatal-error", { error: "No executable web test steps provided" });
        controller.close();
        return;
      }

      try {
        const isLocal = process.env.NODE_ENV === "development";

        browser = await playwrightChromium.launch({
          args: isLocal ? [] : chromium.args,
          executablePath: isLocal ? undefined : await chromium.executablePath(),
          headless: true,
        });

        const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
        const page: Page = await context.newPage();
        const cdp: CDPSession = await context.newCDPSession(page);

        await cdp.send("Page.startScreencast", {
          format: "jpeg",
          quality: 60,
          maxWidth: 1280,
          maxHeight: 800,
          everyNthFrame: 1,
        });

        cdp.on("Page.screencastFrame", async (frame: any) => {
          send("frame", { data: frame.data });
          try {
            await cdp.send("Page.screencastFrameAck", { sessionId: frame.sessionId });
          } catch {
            // session may have ended, ignore
          }
        });

        let overallSuccess = true;
        let targetUrl = "";
        const results: any[] = [];

        for (let i = 0; i < steps.length; i++) {
          const step = steps[i];
          const startTime = Date.now();
          send("step-start", { index: i, name: step.name || `Step ${i + 1}` });

          let passed = true;
          let error: string | null = null;

          try {
            if (step.mode === "assertion") {
              await runAssertionStep(page, step);
            } else {
              await runActionStep(page, step);
              if (step.action === "goto" && (step.url || step.targetUrl)) {
                targetUrl = step.url || step.targetUrl;
              }
            }
          } catch (err: unknown) {
            passed = false;
            overallSuccess = false;
            error = err instanceof Error ? err.message : "Step execution failed";
          }

          const latency = Date.now() - startTime;
          results.push({
            stepName: step.name || `Step ${i + 1}`,
            action: step.mode === "assertion" ? step.assertionType : step.action,
            mode: step.mode || "action",
            passed,
            latency,
            error,
          });

          send("step-done", { index: i, passed, error, latency });
        }

        send("complete", {
          success: overallSuccess,
          stepsEvaluated: steps.length,
          targetUrl,
          details: results,
        });
      } catch (err: unknown) {
        send("fatal-error", {
          error: err instanceof Error ? err.message : "Execution engine failure",
        });
      } finally {
        if (browser) {
          await browser.close().catch(() => {});
        }
        closed = true;
        try {
          controller.close();
        } catch {
          // already closed
        }
      }
    },
    cancel() {
      closed = true;
      if (browser) browser.close().catch(() => {});
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}