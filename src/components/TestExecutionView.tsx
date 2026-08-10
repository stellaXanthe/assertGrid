"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

interface StepResult {
  stepName: string;
  action?: string;
  mode?: string;
  statusReturned: number;
  expectedStatus: number;
  passed: boolean;
  latency: number;
  error: string | null;
  screenshot: string | null;
}

interface ExecutionResult {
  success: boolean;
  totalLatency: number;
  stepsEvaluated: number;
  mode?: string;
  details: StepResult[];
  testTitle?: string;
  targetUrl?: string;
}

interface TestExecutionViewProps {
  result: ExecutionResult;
  onClose: () => void;
}

export function TestExecutionView({ result, onClose }: TestExecutionViewProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const steps = result.details || [];
  const active = steps[selectedIndex];

 return (
    <div className="fixed inset-0 z-50 bg-[#0a0e17] text-white flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
        <div className="flex items-center gap-3">
          <span className={`w-2.5 h-2.5 rounded-full ${result.success ? "bg-blue-400" : "bg-red-500"}`} />
          <h2 className="text-lg font-semibold">{result.testTitle || "Test Execution"}</h2>
          <span className="text-white/40 text-sm">•</span>
          <span className="text-sm text-white/70">
            Mode: <span className="font-bold text-white">{result.mode === "headed" ? "Headed" : "Headless"}</span>
          </span>
          <span className="text-white/40 text-sm">•</span>
          <span className="text-sm text-white/70">
            Duration: <span className="font-bold text-white">{result.totalLatency}ms</span>
          </span>
          <span className="text-white/40 text-sm">•</span>
          <span className="text-sm text-white/70">
            Steps: <span className="font-bold text-white">{result.stepsEvaluated}</span>
          </span>
        </div>

        <div className="flex items-center gap-3">
          <span
            className={`px-3 py-1 rounded-full text-xs font-bold ${
              result.success ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
            }`}
          >
            {result.success ? "PASSED" : "FAILED"}
          </span>
          {result.targetUrl && (
            <a
              href={result.targetUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm px-3 py-1.5 rounded-md bg-white/10 hover:bg-white/20 transition-colors"
            >
              🌐 Open Target Webpage ↗
            </a>
          )}
          <Button onClick={onClose} className="bg-red-600 hover:bg-red-700 text-white text-sm">
            ✕ Close Workspace
          </Button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-[300px] border-r border-white/10 overflow-y-auto p-4 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold uppercase text-white/50 mb-2">
            <span>Execution Flow</span>
            <span className="px-2 py-0.5 rounded-full bg-white/10">{steps.length} Steps</span>
          </div>

          {steps.map((step, idx) => (
            <button
              key={idx}
              onClick={() => setSelectedIndex(idx)}
              className={`w-full text-left p-3 rounded-lg border transition-colors ${
                idx === selectedIndex ? "border-blue-500 bg-blue-500/10" : "border-white/10 bg-white/[0.02] hover:bg-white/[0.06]"
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-blue-400 text-xs font-bold">STEP #{idx + 1}</span>
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    step.passed ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                  }`}
                >
                  {step.passed ? "PASSED" : "FAILED"}
                </span>
              </div>
              <div className="font-bold text-sm mb-1">{step.action || step.stepName}</div>
              <div className="flex items-center justify-between text-xs text-white/50">
                <span>HTTP {step.statusReturned}</span>
                {step.screenshot && <span className="text-blue-400">📷 Frame Captured</span>}
              </div>
            </button>
          ))}
        </div>

        <div className="flex-1 flex flex-col">
          <div className="flex items-center justify-between px-6 py-3 border-b border-white/10">
            <div className="flex items-center gap-3">
              <span className="px-2 py-1 rounded bg-blue-500/20 text-blue-400 text-xs font-bold">
                STEP {selectedIndex + 1}
              </span>
              <span className="font-semibold">{active?.action || active?.stepName}</span>
            </div>
            <span className="text-sm text-white/50">
              Status Code: <span className="text-emerald-400 font-bold">{active?.statusReturned}</span>
            </span>
          </div>

          <div className="flex-1 overflow-auto p-8 flex items-center justify-center">
            {active?.screenshot ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={active.screenshot}
                alt={`Step ${selectedIndex + 1} screenshot`}
                className="max-w-full max-h-full rounded-xl shadow-2xl"
              />
            ) : (
              <div className="text-white/40 text-sm">
                {active?.error ? `⚠ ${active.error}` : "No frame captured for this step."}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}