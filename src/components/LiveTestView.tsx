"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";

interface LiveStep {
  name: string;
  mode?: string;
}

interface LiveTestViewProps {
  steps: LiveStep[];
  testTitle?: string;
  onClose: () => void;
  onComplete?: (result: {
    success: boolean;
    stepsEvaluated: number;
    targetUrl?: string;
    details: any[];
  }) => void;
}

type StepState = "pending" | "running" | "passed" | "failed";

export function LiveTestView({ steps, testTitle, onClose, onComplete }: LiveTestViewProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [stepStatus, setStepStatus] = useState<Record<number, StepState>>({});
  const [stepErrors, setStepErrors] = useState<Record<number, string>>({});
  const [done, setDone] = useState(false);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [frameReceived, setFrameReceived] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/run-web-test-live", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ steps }),
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          setConnectionError(`Failed to start live run (status ${res.status})`);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { value, done: streamDone } = await reader.read();
          if (streamDone) break;
          buffer += decoder.decode(value, { stream: true });

          const chunks = buffer.split("\n\n");
          buffer = chunks.pop() || "";

          for (const chunk of chunks) {
            if (!chunk.trim()) continue;
            const eventMatch = chunk.match(/event: ([\w-]+)/);
            // Avoid the "s" (dotAll) regex flag — it requires ES2018+ and this
            // project's tsconfig targets ES2017. [\s\S]* matches across
            // newlines without needing that flag.
            const dataMatch = chunk.match(/data: ([\s\S]*)/);
            if (!eventMatch || !dataMatch) continue;

            const event = eventMatch[1];
            let data: any;
            try {
              data = JSON.parse(dataMatch[1]);
            } catch {
              continue;
            }

            if (event === "frame" && imgRef.current) {
              imgRef.current.src = `data:image/jpeg;base64,${data.data}`;
              setFrameReceived(true);
            } else if (event === "step-start") {
              setStepStatus((s) => ({ ...s, [data.index]: "running" }));
            } else if (event === "step-done") {
              setStepStatus((s) => ({ ...s, [data.index]: data.passed ? "passed" : "failed" }));
              if (data.error) {
                setStepErrors((s) => ({ ...s, [data.index]: data.error }));
              }
            } else if (event === "complete") {
              setSuccess(data.success);
              setDone(true);
              onComplete?.(data);
            } else if (event === "fatal-error") {
              setConnectionError(data.error || "Execution failed");
              setDone(true);
            }
          }
        }
      } catch (err: unknown) {
        if ((err as any)?.name !== "AbortError") {
          setConnectionError(err instanceof Error ? err.message : "Connection lost");
        }
      }
    })();

    return () => controller.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stepIcon = (state: StepState | undefined) => {
    if (state === "running") return "⏳";
    if (state === "passed") return "✅";
    if (state === "failed") return "❌";
    return "○";
  };

  return (
    <div className="fixed inset-0 z-50 bg-[#0a0e17] text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span
            className={`w-2.5 h-2.5 rounded-full ${
              done ? (success ? "bg-emerald-400" : "bg-red-500") : "bg-blue-400 animate-pulse"
            }`}
          />
          <h2 className="text-lg font-semibold">{testTitle || "Live Test Run"}</h2>
          <span className="text-white/40 text-sm">•</span>
          <span className="text-sm text-white/70">Live Headed Session</span>
        </div>

        <div className="flex items-center gap-3">
          {done && (
            <span
              className={`px-3 py-1 rounded-full text-xs font-bold ${
                success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
              }`}
            >
              {success ? "PASSED" : "FAILED"}
            </span>
          )}
          <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white text-sm">
            ✕ Close
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[300px] border-r border-white/10 overflow-y-auto p-4 space-y-2">
          <div className="text-xs font-semibold uppercase text-white/50 mb-3">
            Steps ({steps.length})
          </div>

          {steps.map((step, idx) => (
            <div key={idx} className="p-3 rounded-lg border border-white/10 bg-white/[0.02] space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">{step.name || `Step ${idx + 1}`}</span>
                <span>{stepIcon(stepStatus[idx])}</span>
              </div>
              {stepErrors[idx] && (
                <div className="text-xs text-red-400 bg-red-500/10 rounded p-1.5">
                  {stepErrors[idx]}
                </div>
              )}
            </div>
          ))}

          {connectionError && (
            <div className="mt-4 p-3 rounded bg-red-500/10 border border-red-500/30 text-sm text-red-400">
              {connectionError}
            </div>
          )}
        </div>

        <div className="flex-1 flex items-center justify-center bg-black relative">
          {!frameReceived && !connectionError && (
            <div className="text-white/40 text-sm flex flex-col items-center gap-2">
              <span className="animate-spin text-2xl">⚙️</span>
              Connecting to live session...
            </div>
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            ref={imgRef}
            alt="Live browser view"
            className={`max-w-full max-h-full ${frameReceived ? "block" : "hidden"}`}
          />
        </div>
      </div>
    </div>
  );
}