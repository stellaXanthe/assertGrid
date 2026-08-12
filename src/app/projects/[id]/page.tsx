"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiAssistant } from "@/components/AiAssistant";
import { TestExecutionView } from "@/components/TestExecutionView";
import { LiveTestView } from "@/components/LiveTestView";

async function safeParseResponse(response: Response) {
  const text = await response.text();
  if (!text) {
    throw new Error(
      `Server returned an empty response (status ${response.status}). ` +
        `This usually means the function timed out or crashed.`
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(
      `Server returned a non-JSON response (status ${response.status}): ${text.slice(0, 200)}`
    );
  }
}

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const router = useRouter();
  const supabase = createClient();
  const [project, setProject] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [selectedRunResult, setSelectedRunResult] = useState<any | null>(null);
  const [executionView, setExecutionView] = useState<any | null>(null);
  const [liveTest, setLiveTest] = useState<{ test: any; steps: any[]; startedAt: Date } | null>(
    null
  );
  const [runMode, setRunMode] = useState<"headless" | "headed">("headless");

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      const { data: projectData, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();
      if (projErr) throw projErr;
      setProject(projectData);
      const { data: testData, error: testErr } = await supabase
        .from("test_cases")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (testErr) throw testErr;
      setTests(testData || []);
    } catch (err) {
      console.error("Error fetching project data:", err);
    } finally {
      setLoading(false);
    }
  }, [projectId, supabase]);

  const fetchRuns = useCallback(async () => {
    if (!projectId) return;
    try {
      const { data, error } = await supabase
        .from("test_runs")
        .select("*")
        .eq("project_id", projectId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setRuns(data || []);
    } catch (err) {
      console.error("Error fetching project runs:", err);
    }
  }, [projectId, supabase]);

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  useEffect(() => {
    fetchRuns();
  }, [fetchRuns]);

  const analytics = useMemo(() => {
    const total = runs.length;
    const passed = runs.filter((r) => String(r.status).toLowerCase() === "passed").length;
    const failed = total - passed;
    const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
    const totalLatency = runs.reduce((acc, r) => acc + (Number(r.duration_ms) || 0), 0);
    const avgLatency = total > 0 ? Math.round(totalLatency / total) : 0;
    return { total, passed, failed, passRate, avgLatency };
  }, [runs]);

  const recordRun = async (
    test: any,
    startedAt: Date,
    status: string,
    durationMs: number,
    results: any
  ) => {
    try {
      const { error } = await supabase.from("test_runs").insert({
        project_id: projectId,
        test_case_id: test.id,
        status,
        started_at: startedAt.toISOString(),
        finished_at: new Date().toISOString(),
        duration_ms: durationMs,
        results,
      });
      if (error) console.error("Failed to record run:", error);
    } catch (err) {
      console.error("Failed to record run:", err);
    } finally {
      fetchRuns();
    }
  };

  const getStepsForTest = (test: any) => {
    return test.steps && Array.isArray(test.steps) && test.steps.length > 0
      ? test.steps
      : [
          {
            name: test.title || "Step 1",
            method: test.method || "GET",
            url: test.url || test.target_url || "",
            expectedStatus: test.expected_status || 200,
          },
        ];
  };

  const isWebTestCase = (test: any, stepsToRun: any[]) =>
    test.type === "web" ||
    stepsToRun.some((s: any) => s.type === "browser" || s.action || s.assertionType);

  const handleRunTest = async (test: any) => {
    setRunningTestId(test.id);
    const startedAt = new Date();
    const stepsToRun = getStepsForTest(test);
    const isWebTest = isWebTestCase(test, stepsToRun);

    try {
      if (isWebTest && runMode === "headed") {
        setLiveTest({ test, steps: stepsToRun, startedAt });
        return;
      }

      if (isWebTest) {
        const response = await fetch("/api/run-web-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId: test.id, steps: stepsToRun, mode: runMode }),
        });
        const data = await safeParseResponse(response);
        if (!response.ok) throw new Error(data.error || "Failed to run test.");
        setExecutionView({ ...data, testTitle: test.title || test.name || "Test Execution" });
        await recordRun(
          test,
          startedAt,
          data.success ? "passed" : "failed",
          Number(data.totalLatency) || Date.now() - startedAt.getTime(),
          data
        );
      } else {
        const response = await fetch("/api/run-test", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ testId: test.id, steps: stepsToRun }),
        });
        const data = await safeParseResponse(response);
        if (!response.ok) throw new Error(data.error || "Failed to run test.");
        setSelectedRunResult({ testTitle: test.title || test.name || "Test Execution", ...data });
        await recordRun(
          test,
          startedAt,
          data.passed ? "passed" : "failed",
          Date.now() - startedAt.getTime(),
          data
        );
      }
      setRunningTestId(null);
    } catch (err: unknown) {
      await recordRun(
        test,
        startedAt,
        "error",
        Date.now() - startedAt.getTime(),
        { error: err instanceof Error ? err.message : "Failed to run test." }
      );
      alert(err instanceof Error ? err.message : "Failed to run test.");
      setRunningTestId(null);
    }
  };

  const handleLiveComplete = async (result: {
    success: boolean;
    stepsEvaluated: number;
    targetUrl?: string;
    details: any[];
  }) => {
    if (!liveTest) return;
    await recordRun(
      liveTest.test,
      liveTest.startedAt,
      result.success ? "passed" : "failed",
      Date.now() - liveTest.startedAt.getTime(),
      result
    );
    setRunningTestId(null);
  };

  const handleCloseLiveView = () => {
    setLiveTest(null);
    setRunningTestId(null);
  };

  const handleRunAllTests = async () => {
    if (tests.length === 0) return;
    setIsRunningAll(true);
    for (const test of tests) {
      await handleRunTest(test);
      if (runMode === "headed") {
        await new Promise<void>((resolve) => {
          const check = setInterval(() => {
            if (!liveTest) {
              clearInterval(check);
              resolve();
            }
          }, 300);
        });
      }
    }
    setIsRunningAll(false);
  };

  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this test case?")) return;
    try {
      const { error } = await supabase.from("test_cases").delete().eq("id", testId);
      if (error) throw error;
      setTests((prev) => prev.filter((t) => t.id !== testId));
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : "Failed to delete test case.");
    }
  };

  const handleResetExecutions = () => {
    setSelectedRunResult(null);
    setExecutionView(null);
    fetchProjectData();
    fetchRuns();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-gray-500 font-medium">Loading project...</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 relative">
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">{project?.name || "Project Workspace"}</CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              Project ID: <code className="bg-gray-100 px-1 py-0.5 rounded">{projectId}</code>
            </p>
          </div>
          <div className="flex gap-2 items-center">
            <div className="flex rounded-md border bg-gray-100 p-0.5 text-xs font-medium">
              <button
                onClick={() => setRunMode("headless")}
                className={`px-2.5 py-1.5 rounded-sm flex items-center gap-1 ${
                  runMode === "headless" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                ⚡ Headless
              </button>
              <button
                onClick={() => setRunMode("headed")}
                className={`px-2.5 py-1.5 rounded-sm flex items-center gap-1 ${
                  runMode === "headed" ? "bg-white text-blue-600 shadow-sm" : "text-gray-500"
                }`}
              >
                🖥 Headed (Live UI)
              </button>
            </div>
            <Button
              variant="default"
              size="sm"
              className="bg-black hover:bg-gray-800"
              disabled={isRunningAll || tests.length === 0}
              onClick={handleRunAllTests}
            >
              {isRunningAll ? "Running Suite..." : "⚡ Run All Tests"}
            </Button>
            <Button variant="outline" size="sm" onClick={handleResetExecutions}>
              ⟲ Reset Executions
            </Button>
            <Button size="sm" onClick={() => router.push(`/projects/${projectId}/tests/new`)}>
              + Add Test
            </Button>
          </div>
        </CardHeader>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Pass Rate
          </span>
          <p className="text-3xl font-extrabold text-emerald-500 mt-2">{analytics.passRate}%</p>
          <p className="text-xs text-slate-400 mt-1">This project only</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Avg Latency
          </span>
          <p className="text-3xl font-extrabold text-blue-600 mt-2">{analytics.avgLatency} ms</p>
          <p className="text-xs text-slate-400 mt-1">Average across runs</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Total Runs
          </span>
          <p className="text-3xl font-extrabold text-slate-900 mt-2">{analytics.total}</p>
          <p className="text-xs text-slate-400 mt-1">Recorded executions</p>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Failed Runs
          </span>
          <p className={`text-3xl font-extrabold mt-2 ${analytics.failed > 0 ? "text-red-500" : "text-slate-900"}`}>
            {analytics.failed}
          </p>
          <p className="text-xs text-slate-400 mt-1">Needs attention</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-gray-800">API & Web Tests ({tests.length})</h2>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              router.push(`/projects/${projectId}/tests/new`);
            }}
            className="text-sm text-blue-600 hover:underline"
          >
            + Create New Test
          </a>
        </div>
        {tests.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-gray-500 mb-4">No test cases created yet.</p>
            <Button size="sm" onClick={() => router.push(`/projects/${projectId}/tests/new`)}>
              Create Your First Test
            </Button>
          </Card>
        ) : (
          tests.map((test) => {
            const firstStep = test.steps?.[0] || {};
            const isWeb = test.type === "web" || firstStep.type === "browser";
            const httpMethod = (firstStep.method || test.method || "GET").toUpperCase();
            const targetUrl = firstStep.url || test.url || test.target_url || "N/A";
            return (
              <Card key={test.id} className="p-4 border shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                          isWeb
                            ? "bg-blue-50 text-blue-700 border-blue-100"
                            : "bg-amber-50 text-amber-700 border-amber-100"
                        }`}
                      >
                        {isWeb ? "BROWSER" : httpMethod}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {test.title || test.name || "Untitled Test"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate max-w-xl">{targetUrl}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      disabled={runningTestId === test.id}
                      onClick={() => handleRunTest(test)}
                    >
                      {runningTestId === test.id ? "Running..." : "▶ Run Test"}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => router.push(`/projects/${projectId}/tests/${test.id}/edit`)}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDeleteTest(test.id)}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {selectedRunResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-xl bg-white p-6 rounded-lg shadow-xl relative space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-bold text-lg text-gray-900">{selectedRunResult.testTitle}</h3>
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                  selectedRunResult.success ?? selectedRunResult.passed
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {(selectedRunResult.success ?? selectedRunResult.passed) ? "PASSED" : "FAILED"}
              </span>
            </div>
            <div className="flex justify-between text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
              <span>
                Total Latency: <strong>{selectedRunResult.totalLatency || 0}ms</strong>
              </span>
              <span>
                Steps Evaluated:{" "}
                <strong>
                  {selectedRunResult.stepsEvaluated || selectedRunResult.steps?.length || 0}
                </strong>
              </span>
            </div>
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {(selectedRunResult.details || selectedRunResult.steps)?.map((res: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 border rounded-md text-sm space-y-1 ${
                    res.passed ? "border-green-200 bg-green-50/30" : "border-red-200 bg-red-50/30"
                  }`}
                >
                  <div className="flex justify-between font-medium">
                    <span>{res.stepName || res.title || `Step ${idx + 1}`}</span>
                    <span
                      className={
                        res.passed ? "text-green-600 font-semibold" : "text-red-600 font-semibold"
                      }
                    >
                      {res.passed ? "✓ PASSED" : "✕ FAILED"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Status Returned: <strong>{res.statusReturned}</strong> | Expected:{" "}
                    <strong>{res.expectedStatus}</strong>
                  </div>
                  {res.error && (
                    <div className="mt-2 p-2 bg-red-100/80 text-red-700 text-xs rounded font-mono border border-red-200">
                      Error: {res.error}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div className="pt-2 flex justify-end">
              <Button onClick={() => setSelectedRunResult(null)}>Close</Button>
            </div>
          </Card>
        </div>
      )}

      {executionView && (
        <TestExecutionView result={executionView} onClose={() => setExecutionView(null)} />
      )}

      {liveTest && (
        <LiveTestView
          steps={liveTest.steps}
          testTitle={liveTest.test.title || liveTest.test.name || "Live Test"}
          onClose={handleCloseLiveView}
          onComplete={handleLiveComplete}
        />
      )}

      <AiAssistant
        projectId={projectId}
        currentContext={{
          projectName: project?.name,
          testCount: tests.length,
          page: "project_details",
        }}
      />
    </div>
  );
}