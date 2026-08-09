"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  headers?: unknown;
  body?: unknown;
  expected_status?: number;
}

interface TestStepResult {
  step: number;
  title: string;
  statusReturned: number;
  expected: number;
  passed: boolean;
}

interface TestRunResult {
  testName: string;
  overallStatus: "passed" | "failed";
  executionMode: "headed" | "headless";
  totalLatency: number;
  stepsEvaluated: number;
  steps: TestStepResult[];
}

interface TestItem {
  id: string;
  name: string;
  type?: string;
  method?: string;
  url?: string;
  steps?: StepDefinition[];
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

  // Execution Mode State (Headless by default)
  const [isHeaded, setIsHeaded] = useState(false);

  // Active tests list state hydrated from Supabase
  const [tests, setTests] = useState<TestItem[]>([]);

  // Project-specific metrics state
  const [metrics, setMetrics] = useState<ProjectMetrics>({
    passRate: 0,
    avgLatency: 0,
    totalExecutions: 0,
    failedExecutions: 0,
  });

  // Fetch project-specific execution metrics from Supabase
  const loadProjectMetrics = useCallback(async () => {
    if (!projectId) return;

    const { data: runsData, error } = await supabase
      .from("test_runs")
      .select("*")
      .eq("project_id", projectId);

    if (error) {
      console.error("Error loading project test runs:", error.message);
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

  // Fetch test cases and metrics on load
  useEffect(() => {
    async function loadWorkspaceData() {
      if (!projectId) return;
      setFetchingTests(true);

      // 1. Fetch Tests
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
        }));
        setTests(mappedData);
      } else {
        // Fallback default sample test if none exist
        setTests([
          {
            id: "test-login-123",
            name: "Login Page",
            method: "GET",
            url: "https://www.saucedemo.com/",
            steps: [
              {
                id: "step-1",
                action: "navigate",
                title: "Open Home Page",
                value: "https://www.saucedemo.com/",
              },
              {
                id: "step-2",
                action: "fill",
                title: "Input User-name",
                selector: "#user-name",
                value: "standard_user",
              },
              {
                id: "step-3",
                action: "fill",
                title: "Input Password",
                selector: "#password",
                value: "secret_sauce",
              },
              {
                id: "step-4",
                action: "click",
                title: "Click Login",
                selector: "#login-button",
              },
            ],
          },
        ]);
      }

      // 2. Fetch Project-Specific Metrics
      await loadProjectMetrics();

      setFetchingTests(false);
    }

    loadWorkspaceData();
  }, [projectId, supabase, loadProjectMetrics]);

  // Reset Executions Handler
  const handleResetExecutions = async () => {
    if (!projectId) return;
    if (
      !window.confirm(
        "Are you sure you want to reset all test execution history for this project?"
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
      alert("Test execution history successfully reset!");
    }
  };

  // Run single test function
  const handleRunTest = async (testItem: TestItem) => {
    if (!projectId) {
      alert("Error: No Project ID found in URL route.");
      return;
    }

    setLoading(true);
    const startTime = performance.now();
    const mode: "headed" | "headless" = isHeaded ? "headed" : "headless";

    let stepsEvaluated: TestStepResult[] = [];
    let isPassed = true;

    try {
      const res = await fetch("/api/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId,
          testId: testItem.id,
          method: testItem.method,
          url: testItem.url,
          steps: testItem.steps || [],
          headless: !isHeaded,
        }),
      });

      if (res.ok) {
        const liveData = await res.json();
        stepsEvaluated = liveData.steps || [];
        isPassed = liveData.passed ?? true;
      } else {
        let errorMessage = "Bad Request. Check server logs.";
        try {
          const errorData = await res.json();
          errorMessage = errorData.error || errorMessage;
        } catch {
          errorMessage = `HTTP ${res.status}: Endpoint returned non-JSON response.`;
        }

        alert(`Execution failed: ${errorMessage}`);
        setLoading(false);
        return;
      }
    } catch (err) {
      console.error("Network or script error running live test:", err);
      alert("Failed to connect to automation server.");
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
    });

    // Save test execution results to Supabase (populating both duration_ms and latency)
    try {
      const payload = {
        project_id: projectId,
        test_id: testItem.id,
        status: overallStatus,
        duration_ms: calculatedLatency, // Matches Supabase schema
        latency: calculatedLatency,
      };

      const { error } = await supabase.from("test_runs").insert([payload]);

      if (error) {
        console.error("Supabase insert error:", error.message);
      } else {
        // Refresh metrics dynamically after insert
        await loadProjectMetrics();
      }
    } catch (err) {
      console.error("Failed to execute save request:", err);
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
        console.error("Failed to delete test from database:", error.message);
      }
      setTests((prev) => prev.filter((t) => t.id !== testId));
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Workspace Header & Action Controls */}
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

        {/* Project-Specific Metrics Summary Cards */}
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
                  metrics.failedExecutions > 0 ? "text-red-600" : "text-gray-900"
                }`}
              >
                {metrics.failedExecutions}
              </h3>
            </CardContent>
          </Card>
        </div>

        {/* Tests List */}
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
                Loading test cases...
              </CardContent>
            </Card>
          ) : tests.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No tests found for this project.
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
                          {test.url ? test.url : `${test.steps?.length || 0} step(s)`}
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
                        ▶ {loading ? "Running..." : `Run (${isHeaded ? "Headed Live" : "Headless"})`}
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

      {/* Execution Results Modal */}
      {runResult && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-xl p-6 bg-white rounded-xl">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
              <div>
                <DialogTitle className="text-xl font-bold">
                  {runResult.testName}
                </DialogTitle>
                <p className="text-xs text-gray-500 capitalize mt-1">
                  Mode:{" "}
                  <span className="font-semibold text-gray-800">
                    {runResult.executionMode}
                  </span>
                </p>
              </div>
              <Badge
                className={
                  runResult.overallStatus === "passed"
                    ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-100 uppercase"
                    : "bg-red-100 text-red-700 hover:bg-red-100 uppercase"
                }
              >
                {runResult.overallStatus}
              </Badge>
            </DialogHeader>

            <div className="py-4 space-y-4">
              <div className="bg-gray-50 p-3 rounded-lg flex justify-between text-xs text-gray-600">
                <span>
                  Total Latency: <strong>{runResult.totalLatency}ms</strong>
                </span>
                <span>
                  Steps Evaluated: <strong>{runResult.stepsEvaluated}</strong>
                </span>
              </div>

              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1">
                {runResult.steps.map((step) => (
                  <div
                    key={step.step}
                    className="p-3 border rounded-lg flex justify-between items-center bg-white"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-800">
                        {step.title}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        Status Returned: {step.statusReturned} | Expected:{" "}
                        {step.expected}
                      </p>
                    </div>
                    <span
                      className={`text-xs font-bold ${
                        step.passed ? "text-emerald-600" : "text-red-600"
                      }`}
                    >
                      {step.passed ? "✓ PASSED" : "✕ FAILED"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                onClick={() => setModalOpen(false)}
                className="bg-black text-white hover:bg-gray-800 cursor-pointer"
              >
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}