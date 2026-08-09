"use client";

import React, { useState } from "react";
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

interface TestStep {
  step: number;
  title: string;
  statusReturned: number;
  expected: number;
  passed: boolean;
}

interface TestRunResult {
  testName: string;
  overallStatus: "passed" | "failed";
  totalLatency: number;
  stepsEvaluated: number;
  steps: TestStep[];
}

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const supabase = createClient();

  // Safely unwrap params across Next.js versions
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const projectId = resolvedParams?.id;

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);

  const activeTest = {
    id: "test-login-123",
    name: "Login Page",
    method: "GET",
    url: "https://www.saucedemo.com/",
  };

  const handleRunTest = async () => {
    if (!projectId) {
      alert("Error: No Project ID found in URL route.");
      return;
    }

    setLoading(true);
    const startTime = performance.now();

    const mockSteps: TestStep[] = [
      {
        step: 1,
        title: "Step 1: Open Home Page",
        statusReturned: 200,
        expected: 200,
        passed: true,
      },
      {
        step: 2,
        title: "Step 2: Input User-name",
        statusReturned: 200,
        expected: 200,
        passed: true,
      },
      {
        step: 3,
        title: "Step 3: Input Password",
        statusReturned: 200,
        expected: 200,
        passed: true,
      },
      {
        step: 4,
        title: "Step 4: Click Login",
        statusReturned: 200,
        expected: 200,
        passed: true,
      },
    ];

    const endTime = performance.now();
    const calculatedLatency = Math.round(endTime - startTime) + 550;
    const isPassed = mockSteps.every((s) => s.passed);

    // Set status to lowercase to pass Supabase check constraint ('passed' / 'failed')
    const overallStatus: "passed" | "failed" = isPassed ? "passed" : "failed";

    setRunResult({
      testName: activeTest.name,
      overallStatus,
      totalLatency: calculatedLatency,
      stepsEvaluated: mockSteps.length,
      steps: mockSteps,
    });

    try {
      const payload = {
        project_id: projectId,
        test_id: activeTest.id,
        status: overallStatus, // now sends "passed" or "failed"
        latency: calculatedLatency,
      };

      console.log("Saving test run to Supabase:", payload);

      const { data, error } = await supabase
        .from("test_runs")
        .insert([payload])
        .select();

      if (error) {
        console.error("Supabase Save Error:", error.message);
        alert(`Error saving test run: ${error.message}`);
      } else {
        console.log("Successfully saved test run:", data);
      }
    } catch (err) {
      console.error("Failed to execute save request:", err);
    } finally {
      setLoading(false);
      setModalOpen(true);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Workspace Header */}
        <Card>
          <CardContent className="p-6 flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Swaglabs</h1>
              <p className="text-sm text-gray-500 font-mono mt-1">
                Project ID: {projectId || "Loading..."}
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleRunTest} disabled={loading}>
                ⚡ {loading ? "Running..." : "Run All Tests"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API & Web Tests List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            API & Web Tests (1)
          </h2>

          <Card>
            <CardContent className="p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-semibold text-blue-600">
                  {activeTest.method}
                </Badge>
                <div>
                  <p className="font-medium text-gray-900">{activeTest.name}</p>
                  <p className="text-xs text-gray-500">{activeTest.url}</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  onClick={handleRunTest}
                  disabled={loading}
                  className="bg-gray-900 hover:bg-black text-white"
                >
                  ▶ {loading ? "Running..." : "Run Test"}
                </Button>
                <Button size="sm" variant="outline">
                  Edit
                </Button>
                <Button size="sm" variant="ghost" className="text-red-600">
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Test Results Modal */}
      {runResult && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-xl p-6 bg-white rounded-xl">
            <DialogHeader className="flex flex-row items-center justify-between border-b pb-4">
              <DialogTitle className="text-xl font-bold">
                {runResult.testName}
              </DialogTitle>
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
                    <span className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                      ✓ PASSED
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t">
              <Button
                onClick={() => setModalOpen(false)}
                className="bg-black text-white hover:bg-gray-800"
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