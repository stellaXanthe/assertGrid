"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface StepDefinition {
  id?: string;
  action?: string;
  type?: string;
  title?: string;
  name?: string;
  selector?: string;
  value?: string;
  url?: string;
  method?: string;
  headers?: Record<string, string>;
  body?: Record<string, unknown>;
  expected_status?: number;
}

interface TestStepResult {
  step: number;
  title: string;
  statusReturned: number;
  expected: number;
  passed: boolean;
  screenshot?: string | null;
}

interface TestRunResult {
  testName: string;
  overallStatus: "passed" | "failed";
  executionMode: "headed" | "headless";
  totalLatency: number;
  stepsEvaluated: number;
  steps: TestStepResult[];
  targetUrl?: string | null;
}

interface TestItem {
  id: string;
  name: string;
  type?: string;
  method?: string;
  url?: string;
  steps?: StepDefinition[];
  expected_status?: number;
}

interface ProjectMetrics {
  passRate: number;
  avgLatency: number;
  totalExecutions: number;
  failedExecutions: number;
}

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const supabase = createClient();

  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const projectId = resolvedParams?.id;

  const [loading, setLoading] = useState(false);
  const [fetchingTests, setFetchingTests] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);

  // Active step index for viewing individual step screenshots
  const [activeStepIndex, setActiveStepIndex] = useState<number>(0);

  // Execution Mode Selection
  const [isHeaded, setIsHeaded] = useState(false);

  // Workspace Test Cases
  const [tests, setTests] = useState<TestItem[]>([]);

  // Project Metrics
  const [metrics, setMetrics] = useState<ProjectMetrics>({
    passRate: 0,
    avgLatency: 0,
    totalExecutions: 0,
    failedExecutions: 0,
  });

  const loadProjectMetrics = useCallback(async () => {
    if (!projectId) return;

    const { data: runsData, error } = await supabase
      .from("test_runs")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      console.error("Error loading project metrics:", error.message);
      return;
    }

    if (runsData && runsData.length > 0) {
      const totalExecutions = runsData.length;
      const passedRuns = runsData.filter(
        (r) => r.status?.toLowerCase() === "passed"
      ).length;
      const failedExecutions = runsData.filter(
        (r) => r.status?.toLowerCase() === "failed"
      ).length;

      const passRate = Math.round((passedRuns / totalExecutions) * 100);

      const totalMs = runsData.reduce((acc: number, r) => {
        const val = r.duration_ms ?? r.latency ?? 0;
        return acc + Number(val);
      }, 0);

      const avgLatency = Math.round(totalMs / totalExecutions);

      setMetrics({
        passRate,
        avgLatency,
        totalExecutions,
        failedExecutions,
      });
    } else {
      setMetrics({
        passRate: 0,
        avgLatency: 0,
        totalExecutions: 0,
        failedExecutions: 0,
      });
    }
  }, [projectId, supabase]);

  useEffect(() => {
    async function loadWorkspaceData() {
      if (!projectId) return;
      setFetchingTests(true);

      const { data, error } = await supabase
        .from("test_cases")
        .select("*")
        .eq("project_id", projectId);

      if (error) {
        console.error("Error fetching test cases:", error.message);
      } else if (data && data.length > 0) {
        const mappedData: TestItem[] = data.map((t) => ({
          id: t.id,
          name: t.name,
          type: t.type,
          method: t.method || (t.type === "api" ? "GET" : "BROWSER"),
          url: t.url || (t.steps?.[0]?.url ?? ""),
          steps: t.steps || [],
          expected_status: t.expected_status || 200,
        }));
        setTests(mappedData);
      } else {
        setTests([
          {
            id: "test-login-123",
            name: "Login Page Test",
            type: "browser",
            method: "BROWSER",
            url: "https://www.saucedemo.com/",
            steps: [
              {
                id: "step-1",
                action: "navigate",
                title: "Open Login Page",
                value: "https://www.saucedemo.com/",
              },
              {
                id: "step-2",
                action: "fill",
                title: "Enter Username",
                selector: "#user-name",
                value: "standard_user",
              },
              {
                id: "step-3",
                action: "fill",
                title: "Enter Password",
                selector: "#password",
                value: "secret_sauce",
              },
              {
                id: "step-4",
                action: "click",
                title: "Click Submit",
                selector: "#login-button",
              },
            ],
          },
        ]);
      }

      await loadProjectMetrics();
      setFetchingTests(false);
    }

    loadWorkspaceData();
  }, [projectId, supabase, loadProjectMetrics]);

  const handleResetExecutions = async () => {
    if (!projectId) return;
    if (
      !window.confirm(
        "Are you sure you want to clear all test execution history for this project?"
      )
    ) {
      return;
    }

    const { error } = await supabase
      .from("test_runs")
      .delete()
      .eq("project_id", projectId);

    if (error) {
      console.error("Failed to reset executions:", error.message);
      alert("Error clearing test runs.");
    } else {
      setMetrics({
        passRate: 0,
        avgLatency: 0,
        totalExecutions: 0,
        failedExecutions: 0,
      });
      alert("Execution history cleared successfully.");
    }
  };

  const handleRunTest = async (testItem: TestItem) => {
    if (!projectId) {
      alert("Project ID is missing.");
      return;
    }

    setLoading(true);
    const startTime = performance.now();
    const mode: "headed" | "headless" = isHeaded ? "headed" : "headless";

    let stepsEvaluated: TestStepResult[] = [];
    let isPassed = true;
    let targetUrl: string | null = null;

    try {
      const res = await fetch("/api/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId,
          testId: testItem.id,
          type: testItem.type,
          method: testItem.method,
          url: testItem.url,
          steps: testItem.steps || [],
          expected_status: testItem.expected_status || 200,
          headless: !isHeaded,
          captureAllSteps: true,
        }),
      });

      if (res.ok) {
        const liveData = await res.json();
        
        // Ensure steps map correctly to individual step screenshot fields
        const rawSteps = liveData.steps || [];
        stepsEvaluated = rawSteps.map((s: Record<string, unknown>, index: number) => {
          const stepScreenshot =
            (s.screenshot as string) ||
            (s.screenshotUrl as string) ||
            (s.screenshot_url as string) ||
            (s.image as string) ||
            (s.base64 as string) ||
            null;

          return {
            step: typeof s.step === "number" ? s.step : index + 1,
            title: (s.title as string) || (s.action as string) || `Step #${index + 1}`,
            statusReturned: (s.statusReturned as number) || (s.status as number) || 200,
            expected: (s.expected as number) || 200,
            passed: s.passed !== undefined ? Boolean(s.passed) : true,
            screenshot: stepScreenshot,
          };
        });

        isPassed = liveData.passed ?? true;
        targetUrl = liveData.targetUrl || testItem.url || null;
      } else {
        let errorMessage = "Server processing error.";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${res.status}: Execution error. Check Vercel logs.`;
        }

        alert(`Execution failed: ${errorMessage}`);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Network or script error:", err);
      alert("Failed to reach automation backend.");
      setLoading(false);
      return;
    }

    const endTime = performance.now();
    const calculatedLatency = Math.round(endTime - startTime);
    const overallStatus: "passed" | "failed" = isPassed ? "passed" : "failed";

    setRunResult({
      testName: testItem.name,
      overallStatus,
      executionMode: mode,
      totalLatency: calculatedLatency,
      stepsEvaluated: stepsEvaluated.length,
      steps: stepsEvaluated,
      targetUrl,
    });

    setActiveStepIndex(0);

    try {
      const payload = {
        project_id: projectId,
        test_id: testItem.id,
        status: overallStatus,
        duration_ms: calculatedLatency,
        latency: calculatedLatency,
      };

      const { error } = await supabase.from("test_runs").insert([payload]);

      if (error) {
        console.error("Failed to insert run log into Supabase:", error.message);
      } else {
        await loadProjectMetrics();
      }
    } catch (err) {
      console.error("Save run log error:", err);
    } finally {
      setLoading(false);
      setModalOpen(true);
    }
  };

  const handleRunAllTests = async () => {
    if (tests.length === 0) return;
    for (const test of tests) {
      await handleRunTest(test);
    }
  };

  const handleDeleteTest = async (testId: string) => {
    if (window.confirm("Are you sure you want to delete this test?")) {
      const { error } = await supabase
        .from("test_cases")
        .delete()
        .eq("id", testId);

      if (error) {
        console.error("Failed to delete test:", error.message);
      }
      setTests((prev) => prev.filter((t) => t.id !== testId));
    }
  };

  const currentStep = runResult?.steps[activeStepIndex];

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Workspace Top Bar */}
        <Card>
          <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <Link
                  href="/dashboard"
                  className="text-xs text-blue-600 hover:underline font-medium"
                >
                  ← Back to Dashboard
                </Link>
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mt-1">
                Project Workspace
              </h1>
              <p className="text-sm text-gray-500 font-mono mt-0.5">
                ID: {projectId || "Loading..."}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center bg-gray-100 p-1 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsHeaded(false)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    !isHeaded
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  ⚡ Headless
                </button>
                <button
                  type="button"
                  onClick={() => setIsHeaded(true)}
                  title="Launch live UI mode with rendered DOM view"
                  className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all cursor-pointer ${
                    isHeaded
                      ? "bg-white text-gray-900 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  🖥️ Headed (Live UI)
                </button>
              </div>

              <Button
                onClick={handleRunAllTests}
                disabled={loading || tests.length === 0}
                className="cursor-pointer"
              >
                ⚡ {loading ? "Running..." : "Run All Tests"}
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={handleResetExecutions}
                className="text-red-600 border-red-200 hover:bg-red-50 cursor-pointer"
              >
                🔄 Reset Executions
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Project Metrics Summary Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Project Pass Rate
              </p>
              <h3 className="text-2xl font-bold text-emerald-600 mt-1">
                {metrics.passRate}%
              </h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Avg Response Latency
              </p>
              <h3 className="text-2xl font-bold text-blue-600 mt-1">
                {metrics.avgLatency} ms
              </h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Runs
              </p>
              <h3 className="text-2xl font-bold text-gray-900 mt-1">
                {metrics.totalExecutions}
              </h3>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Failed Runs
              </p>
              <h3
                className={`text-2xl font-bold mt-1 ${
                  metrics.failedExecutions > 0
                    ? "text-red-600"
                    : "text-gray-900"
                }`}
              >
                {metrics.failedExecutions}
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Test List Section */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-800">
              API & Web Tests ({tests.length})
            </h2>
            <Link
              href={`/projects/${projectId}/new`}
              className="text-xs text-blue-600 hover:underline font-medium"
            >
              + Create New Test
            </Link>
          </div>

          {fetchingTests ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500 text-sm">
                Loading test suite...
              </CardContent>
            </Card>
          ) : tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No test cases found in this project.
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {tests.map((test) => (
                <Card key={test.id}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Badge
                        variant="outline"
                        className="font-semibold text-blue-600 uppercase"
                      >
                        {test.method || test.type || "API"}
                      </Badge>
                      <div>
                        <p className="font-medium text-gray-900">{test.name}</p>
                        <p className="text-xs text-gray-500">
                          {test.url
                            ? test.url
                            : `${test.steps?.length || 0} step(s)`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleRunTest(test)}
                        disabled={loading}
                        className="bg-gray-900 hover:bg-black text-white cursor-pointer"
                      >
                        ▶ {loading ? "Running..." : "Run Test"}
                      </Button>

                      <Link
                        href={`/projects/${projectId}/tests/${test.id}/edit`}
                        className="inline-flex items-center justify-center rounded-md px-3 py-1.5 text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition-colors"
                      >
                        Edit
                      </Link>

                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTest(test.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer text-xs"
                      >
                        Delete
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ULTRA-WIDE FULL-SCREEN OVERLAY INSPECTOR */}
      {modalOpen && runResult && (
        <div className="fixed inset-0 z-[9999] bg-slate-950 flex flex-col w-screen h-screen overflow-hidden text-slate-100 animate-in fade-in duration-150">
          {/* Top Bar Navigation */}
          <header className="h-16 border-b border-slate-800 bg-slate-900/90 px-6 flex items-center justify-between shrink-0 shadow-md">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                <h2 className="text-lg font-bold text-white tracking-tight">
                  {runResult.testName}
                </h2>
              </div>
              <div className="hidden sm:flex items-center gap-3 text-xs text-slate-400 border-l border-slate-700 pl-4 font-mono">
                <span>
                  Mode:{" "}
                  <strong className="text-slate-200 capitalize">
                    {runResult.executionMode}
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Duration:{" "}
                  <strong className="text-slate-200">
                    {runResult.totalLatency}ms
                  </strong>
                </span>
                <span>•</span>
                <span>
                  Steps:{" "}
                  <strong className="text-slate-200">
                    {runResult.stepsEvaluated}
                  </strong>
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <Badge
                className={
                  runResult.overallStatus === "passed"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 uppercase text-xs px-3 py-1 font-mono font-bold"
                    : "bg-rose-500/20 text-rose-400 border-rose-500/40 uppercase text-xs px-3 py-1 font-mono font-bold"
                }
              >
                {runResult.overallStatus}
              </Badge>

              {runResult.targetUrl && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => window.open(runResult.targetUrl!, "_blank")}
                  className="bg-slate-800 border-slate-700 text-slate-200 hover:bg-slate-700 text-xs hidden md:flex"
                >
                  🌐 Open Target Webpage ↗
                </Button>
              )}

              <Button
                onClick={() => setModalOpen(false)}
                className="bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs px-4"
              >
                ✕ Close Workspace
              </Button>
            </div>
          </header>

          {/* Main Full-Width Split Layout */}
          <div className="flex-1 flex overflow-hidden">
            {/* Sidebar Step Inspector List */}
            <aside className="w-80 lg:w-96 border-r border-slate-800 bg-slate-900/50 flex flex-col shrink-0">
              <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/80">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                  Execution Flow
                </span>
                <span className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-0.5 rounded">
                  {runResult.steps.length} Steps
                </span>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {runResult.steps.map((step, idx) => {
                  const isSelected = activeStepIndex === idx;
                  return (
                    <div
                      key={`step-item-${step.step}-${idx}`}
                      onClick={() => setActiveStepIndex(idx)}
                      className={`p-3.5 rounded-lg cursor-pointer transition-all border ${
                        isSelected
                          ? "bg-blue-600/15 border-blue-500 shadow-md ring-1 ring-blue-500/30"
                          : "bg-slate-900/60 border-slate-800 hover:bg-slate-800/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-xs font-mono font-bold text-blue-400">
                          STEP #{step.step}
                        </span>
                        <span
                          className={`text-[11px] font-bold font-mono px-2 py-0.5 rounded ${
                            step.passed
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          {step.passed ? "PASSED" : "FAILED"}
                        </span>
                      </div>

                      <p className="text-sm font-semibold text-slate-100 truncate">
                        {step.title}
                      </p>

                      <div className="flex items-center justify-between text-xs text-slate-400 mt-2 pt-2 border-t border-slate-800/80 font-mono">
                        <span>HTTP {step.statusReturned}</span>
                        {step.screenshot ? (
                          <span className="text-emerald-400 flex items-center gap-1">
                            📷 Frame Captured
                          </span>
                        ) : (
                          <span className="text-slate-500">No Image</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </aside>

            {/* High-Resolution Screenshot Inspector Viewport */}
            <main className="flex-1 flex flex-col bg-slate-950 p-6 overflow-hidden">
              <div className="flex items-center justify-between pb-3 mb-4 border-b border-slate-800/80 shrink-0">
                <div className="flex items-center gap-3">
                  <span className="px-2.5 py-1 bg-blue-500/10 border border-blue-500/30 text-blue-400 rounded text-xs font-mono font-bold">
                    STEP {currentStep?.step ?? activeStepIndex + 1}
                  </span>
                  <h3 className="text-base font-semibold text-slate-200">
                    {currentStep?.title || "Step Analysis"}
                  </h3>
                </div>

                <div className="text-xs text-slate-400 font-mono">
                  Status Code:{" "}
                  <span className="text-emerald-400 font-bold">
                    {currentStep?.statusReturned ?? 200}
                  </span>
                </div>
              </div>

              {/* Dynamic Image Container forcing React key unmount on active index change */}
              <div className="flex-1 relative bg-slate-900/40 border border-slate-800/90 rounded-xl flex items-center justify-center p-4 overflow-hidden shadow-inner">
                {currentStep?.screenshot ? (
                  <div className="w-full h-full flex items-center justify-center relative">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      key={`screenshot-step-${activeStepIndex}-${currentStep.screenshot.slice(-20)}`}
                      src={currentStep.screenshot}
                      alt={`Step ${currentStep.step} Screenshot`}
                      className="max-w-full max-h-full object-contain rounded-lg border border-slate-800 shadow-2xl transition-all duration-150"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-500 space-y-2">
                    <span className="text-4xl">🖥️</span>
                    <p className="text-sm">No screenshot captured for Step #{activeStepIndex + 1}.</p>
                  </div>
                )}
              </div>
            </main>
          </div>
        </div>
      )}
    </div>
  );
}