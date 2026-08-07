"use client";

import { useState, useEffect, use } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import Link from "next/link";

interface StepResult {
  stepId?: string;
  name?: string;
  status: "passed" | "failed";
  actualStatus?: number;
  expectedStatus?: number;
  durationMs?: number;
  error?: string;
}

interface TestRunResult {
  status: "passed" | "failed";
  durationMs: number;
  results: StepResult[];
}

interface HistoricalRun {
  id: string;
  status: "running" | "passed" | "failed";
  started_at: string;
  duration_ms: number;
  test_cases?: { name: string };
}

interface TestCase {
  id: string;
  name: string;
  type: string;
  steps: Array<{
    method?: string;
    url?: string;
    headers?: Record<string, unknown>;
    body?: unknown;
  }>;
  created_at: string;
}

interface Project {
  id: string;
  name: string;
}

export default function ProjectDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const supabase = createClient();
  const { id: projectId } = use(params);

  const [project, setProject] = useState<Project | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [runProgress, setRunProgress] = useState({ current: 0, total: 0 });
  const [runResults, setRunResults] = useState<Record<string, TestRunResult>>({});

  const [selectedTestResult, setSelectedTestResult] = useState<{
    testName: string;
    result: TestRunResult;
  } | null>(null);

  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyRuns, setHistoryRuns] = useState<HistoricalRun[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    async function fetchProjectData() {
      if (!projectId) return;
      setLoading(true);

      const { data: projectData } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projectData) setProject(projectData);

      const { data: testsData } = await supabase
        .from("test_cases")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });

      if (testsData) setTestCases(testsData);

      setLoading(false);
    }

    fetchProjectData();
  }, [projectId, supabase]);

  async function fetchRunHistory() {
    setLoadingHistory(true);
    try {
      const res = await fetch(`/api/projects/${projectId}/runs`);
      const data = await res.json();
      if (res.ok) {
        setHistoryRuns(data.runs || []);
      }
    } catch (err) {
      console.error("Error fetching history:", err);
    } finally {
      setLoadingHistory(false);
    }
  }

  function handleOpenHistory() {
    setHistoryOpen(true);
    fetchRunHistory();
  }

  async function executeSingleTest(testCase: TestCase): Promise<TestRunResult | null> {
    try {
      const response = await fetch("/api/run-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testCaseId: testCase.id }),
      });

      const data = await response.json();
      if (response.ok && data.success) return data.result;
    } catch (err) {
      console.error(`Error executing test ${testCase.id}:`, err);
    }
    return null;
  }

  async function handleRunTest(testCase: TestCase) {
    setRunningTestId(testCase.id);
    const result = await executeSingleTest(testCase);

    if (result) {
      setRunResults((prev) => ({ ...prev, [testCase.id]: result }));
      setSelectedTestResult({ testName: testCase.name, result });
    } else {
      alert("Failed to run test.");
    }
    setRunningTestId(null);
  }

  async function handleRunAll() {
    if (testCases.length === 0) return;

    setIsRunningAll(true);
    setRunProgress({ current: 0, total: testCases.length });

    const newResults = { ...runResults };

    for (let i = 0; i < testCases.length; i++) {
      const test = testCases[i];
      setRunningTestId(test.id);
      setRunProgress({ current: i + 1, total: testCases.length });

      const result = await executeSingleTest(test);
      if (result) {
        newResults[test.id] = result;
        setRunResults({ ...newResults });
      }
    }

    setRunningTestId(null);
    setIsRunningAll(false);
  }

  async function handleDeleteTest(testId: string) {
    if (!confirm("Are you sure you want to delete this test?")) return;

    try {
      const res = await fetch(`/api/tests/${testId}`, { method: "DELETE" });
      if (res.ok) {
        setTestCases((prev) => prev.filter((t) => t.id !== testId));
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete test.");
      }
    } catch (err) {
      console.error("Error deleting test:", err);
      alert("Error deleting test.");
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
        <p className="text-gray-500 text-sm">Loading project...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        <div>
          <Link href="/dashboard" className="text-sm text-blue-600 hover:underline">
            ← Back to Dashboard
          </Link>
        </div>

        <div className="flex justify-between items-center bg-white p-6 rounded-lg border shadow-sm">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {project?.name || "Project Details"}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Project ID: <code className="text-xs bg-gray-100 p-1 rounded">{projectId}</code>
            </p>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={handleOpenHistory}>
              📊 View Run History
            </Button>
            {testCases.length > 0 && (
              <Button
                variant="outline"
                onClick={handleRunAll}
                disabled={isRunningAll || !!runningTestId}
              >
                {isRunningAll
                  ? `Running (${runProgress.current}/${runProgress.total})...`
                  : "⚡ Run All Tests"}
              </Button>
            )}
            <Link href={`/projects/${projectId}/new`}>
              <Button>+ Add Test</Button>
            </Link>
          </div>
        </div>

        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">
            API Tests ({testCases.length})
          </h2>

          {testCases.length === 0 ? (
            <Card className="p-12 text-center">
              <h3 className="text-lg font-medium text-gray-900">
                No tests created for this project
              </h3>
              <p className="text-gray-500 text-sm mt-1 mb-4">
                Add your first API request test to start automated testing.
              </p>
              <Link href={`/projects/${projectId}/new`}>
                <Button>Create API Test</Button>
              </Link>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {testCases.map((test) => {
                const mainStep = test.steps?.[0] || {};
                const runResult = runResults[test.id];
                const isRunning = runningTestId === test.id;

                return (
                  <Card key={test.id} className="hover:shadow-sm transition-shadow">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="flex items-center gap-3">
                        <Badge
                          variant="outline"
                          className="uppercase font-mono text-xs font-bold"
                        >
                          {mainStep.method || "GET"}
                        </Badge>
                        <CardTitle className="text-lg font-semibold">
                          {test.name}
                        </CardTitle>
                      </div>

                      {runResult && (
                        <button
                          onClick={() =>
                            setSelectedTestResult({
                              testName: test.name,
                              result: runResult,
                            })
                          }
                          className="cursor-pointer"
                        >
                          <Badge
                            className={
                              runResult.status === "passed"
                                ? "bg-green-100 text-green-800 border-green-200 hover:bg-green-200"
                                : "bg-red-100 text-red-800 border-red-200 hover:bg-red-200"
                            }
                          >
                            {runResult.status === "passed" ? "✓ Passed" : "✗ Failed"} (
                            {runResult.durationMs}ms)
                          </Badge>
                        </button>
                      )}
                    </CardHeader>

                    <CardContent className="flex justify-between items-center pt-2">
                      <p className="text-sm font-mono text-gray-600 truncate max-w-xl">
                        {mainStep.url || "No URL specified"}
                      </p>

                      <div className="flex items-center gap-2">
                        {runResult && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() =>
                              setSelectedTestResult({
                                testName: test.name,
                                result: runResult,
                              })
                            }
                          >
                            View Details
                          </Button>
                        )}
                        <Button
                          size="sm"
                          onClick={() => handleRunTest(test)}
                          disabled={isRunning || isRunningAll}
                        >
                          {isRunning ? "Running..." : "▶ Run Test"}
                        </Button>
                        <Link href={`/projects/${projectId}/tests/${test.id}/edit`}>
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={isRunning || isRunningAll}
                          >
                            Edit
                          </Button>
                        </Link>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteTest(test.id)}
                          disabled={isRunning || isRunningAll}
                        >
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <Dialog
        open={!!selectedTestResult}
        onOpenChange={(open) => !open && setSelectedTestResult(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-xl flex items-center justify-between pr-6">
              <span>{selectedTestResult?.testName}</span>
              {selectedTestResult && (
                <Badge
                  className={
                    selectedTestResult.result.status === "passed"
                      ? "bg-green-100 text-green-800"
                      : "bg-red-100 text-red-800"
                  }
                >
                  {selectedTestResult.result.status.toUpperCase()}
                </Badge>
              )}
            </DialogTitle>
          </DialogHeader>

          {selectedTestResult && (
            <div className="space-y-4 py-2">
              <div className="flex justify-between text-sm text-gray-500 bg-gray-50 p-3 rounded">
                <span>
                  Total Latency: <strong>{selectedTestResult.result.durationMs}ms</strong>
                </span>
                <span>
                  Steps Evaluated: <strong>{selectedTestResult.result.results.length}</strong>
                </span>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-sm text-gray-700">Step Details</h4>
                {selectedTestResult.result.results.map((res, i) => (
                  <div
                    key={i}
                    className="p-4 border rounded-md bg-white space-y-2 text-sm"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{res.name || `Step ${i + 1}`}</span>
                      <span
                        className={
                          res.status === "passed"
                            ? "text-green-600 font-bold"
                            : "text-red-600 font-bold"
                        }
                      >
                        {res.status === "passed" ? "✓ PASSED" : "✗ FAILED"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-gray-600 font-mono text-xs pt-1">
                      <div>
                        Status Returned:{" "}
                        <span className="font-bold text-gray-900">
                          {res.actualStatus ?? "N/A"}
                        </span>
                      </div>
                      <div>
                        Expected Status:{" "}
                        <span className="font-bold text-gray-900">
                          {res.expectedStatus ?? 200}
                        </span>
                      </div>
                    </div>

                    {res.error && (
                      <div className="mt-2 p-2 bg-red-50 text-red-700 text-xs rounded">
                        <strong>Error:</strong> {res.error}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl">Recent Execution History</DialogTitle>
          </DialogHeader>

          {loadingHistory ? (
            <p className="text-sm text-gray-500 py-6 text-center">Loading run logs...</p>
          ) : historyRuns.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No runs recorded yet.</p>
          ) : (
            <div className="space-y-3 py-2">
              {historyRuns.map((run) => (
                <div
                  key={run.id}
                  className="p-3 border rounded flex justify-between items-center text-sm bg-white"
                >
                  <div>
                    <p className="font-semibold text-gray-900">
                      {run.test_cases?.name || "Test Run"}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(run.started_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono text-gray-600">
                      {run.duration_ms ? `${run.duration_ms}ms` : "-"}
                    </span>
                    <Badge
                      className={
                        run.status === "passed"
                          ? "bg-green-100 text-green-800"
                          : run.status === "failed"
                          ? "bg-red-100 text-red-800"
                          : "bg-gray-100 text-gray-800"
                      }
                    >
                      {run.status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}