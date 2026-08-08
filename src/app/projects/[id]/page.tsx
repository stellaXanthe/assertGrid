"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AiAssistant } from "@/components/AiAssistant";

export default function ProjectDetailsPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const router = useRouter();
  const supabase = createClient();

  const [project, setProject] = useState<any>(null);
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runningTestId, setRunningTestId] = useState<string | null>(null);
  const [isRunningAll, setIsRunningAll] = useState(false);
  const [selectedRunResult, setSelectedRunResult] = useState<any | null>(null);

  const fetchProjectData = useCallback(async () => {
    if (!projectId) return;
    setLoading(true);
    try {
      // 1. Fetch Project Details
      const { data: projectData, error: projErr } = await supabase
        .from("projects")
        .select("*")
        .eq("id", projectId)
        .single();

      if (projErr) throw projErr;
      setProject(projectData);

      // 2. Fetch Associated Test Cases
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

  useEffect(() => {
    fetchProjectData();
  }, [fetchProjectData]);

  // Execute a single test case with Smart Routing
  const handleRunTest = async (test: any) => {
    setRunningTestId(test.id);

    try {
      const stepsToRun =
        test.steps && Array.isArray(test.steps) && test.steps.length > 0
          ? test.steps
          : [
              {
                name: test.title || "Step 1",
                method: test.method || "GET",
                url: test.url || test.target_url || "",
                expectedStatus: test.expected_status || 200,
              },
            ];

      // Smart routing: determine if test needs web browser automation or pure API fetch
      const isWebTest =
        test.type === "web" ||
        stepsToRun.some((s: any) => {
          const name = (s.name || "").toLowerCase();
          return (
            s.type === "web" ||
            s.action ||
            name.includes("click") ||
            name.includes("type") ||
            name.includes("select")
          );
        });

      const endpoint = isWebTest ? "/api/run-web-test" : "/api/run-test";

      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          testId: test.id,
          steps: stepsToRun,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to run test.");
      }

      setSelectedRunResult({
        testTitle: test.title || test.name || "Test Execution",
        ...data,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to run test.";
      alert(msg);
    } finally {
      setRunningTestId(null);
    }
  };

  // Batch run all tests sequentially
  const handleRunAllTests = async () => {
    if (tests.length === 0) return;
    setIsRunningAll(true);
    for (const test of tests) {
      await handleRunTest(test);
    }
    setIsRunningAll(false);
  };

  // Delete a test case
  const handleDeleteTest = async (testId: string) => {
    if (!confirm("Are you sure you want to delete this test case?")) return;

    try {
      const { error } = await supabase
        .from("test_cases")
        .delete()
        .eq("id", testId);

      if (error) throw error;
      setTests((prev) => prev.filter((t) => t.id !== testId));
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to delete test case.";
      alert(msg);
    }
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
      {/* Project Header */}
      <Card className="border shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-2xl font-bold">
              {project?.name || "MedicalVALexie"}
            </CardTitle>
            <p className="text-xs text-gray-400 mt-1">
              Project ID:{" "}
              <code className="bg-gray-100 px-1 py-0.5 rounded">
                {projectId}
              </code>
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={isRunningAll || tests.length === 0}
              onClick={handleRunAllTests}
            >
              {isRunningAll ? "Running Suite..." : "⚡ Run All Tests"}
            </Button>
            <Button
              size="sm"
              onClick={() => router.push(`/projects/${projectId}/new`)}
            >
              + Add Test
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Test List Section */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-800">
          API & Web Tests ({tests.length})
        </h2>

        {tests.length === 0 ? (
          <Card className="p-8 text-center border-dashed">
            <p className="text-gray-500 mb-4">No test cases created yet.</p>
            <Button
              size="sm"
              onClick={() => router.push(`/projects/${projectId}/new`)}
            >
              Create Your First Test
            </Button>
          </Card>
        ) : (
          tests.map((test) => {
            const firstStep = test.steps?.[0] || {};
            const httpMethod = (
              firstStep.method ||
              test.method ||
              "GET"
            ).toUpperCase();
            const targetUrl =
              firstStep.url || test.url || test.target_url || "N/A";

            return (
              <Card
                key={test.id}
                className="p-4 border shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="flex items-center justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100">
                        {httpMethod}
                      </span>
                      <span className="font-semibold text-gray-900">
                        {test.title || test.name || "Untitled Test"}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-mono truncate max-w-xl">
                      {targetUrl}
                    </p>
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
                      onClick={() =>
                        router.push(
                          `/projects/${projectId}/tests/${test.id}/edit`
                        )
                      }
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

      {/* Execution Results Modal */}
      {selectedRunResult && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <Card className="w-full max-w-xl bg-white p-6 rounded-lg shadow-xl relative space-y-4">
            <div className="flex justify-between items-center pb-3 border-b">
              <h3 className="font-bold text-lg text-gray-900">
                {selectedRunResult.testTitle}
              </h3>
              <span
                className={`px-2.5 py-1 text-xs font-bold rounded-full ${
                  selectedRunResult.success
                    ? "bg-green-100 text-green-800"
                    : "bg-red-100 text-red-800"
                }`}
              >
                {selectedRunResult.success ? "PASSED" : "FAILED"}
              </span>
            </div>

            <div className="flex justify-between text-xs text-gray-600 bg-gray-50 p-3 rounded-md">
              <span>
                Total Latency:{" "}
                <strong>{selectedRunResult.totalLatency || 0}ms</strong>
              </span>
              <span>
                Steps Evaluated:{" "}
                <strong>{selectedRunResult.stepsEvaluated || 0}</strong>
              </span>
            </div>

            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {selectedRunResult.details?.map((res: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-3 border rounded-md text-sm space-y-1 ${
                    res.passed
                      ? "border-green-200 bg-green-50/30"
                      : "border-red-200 bg-red-50/30"
                  }`}
                >
                  <div className="flex justify-between font-medium">
                    <span>{res.stepName || `Step ${idx + 1}`}</span>
                    <span
                      className={
                        res.passed
                          ? "text-green-600 font-semibold"
                          : "text-red-600 font-semibold"
                      }
                    >
                      {res.passed ? "✓ PASSED" : "✕ FAILED"}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Status Returned: <strong>{res.statusReturned}</strong> |
                    Expected: <strong>{res.expectedStatus}</strong>
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

      {/* Floating AI Assistant Widget */}
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