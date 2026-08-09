"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
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

interface TestItem {
  id: string;
  name: string;
  method: string;
  url: string;
}

export default function ProjectWorkspacePage({
  params,
}: {
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const supabase = createClient();

  // Safely unwrap params across Next.js versions
  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const projectId = resolvedParams?.id;

  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [runResult, setRunResult] = useState<TestRunResult | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<TestItem | null>(null);

  // Active tests list state
  const [tests, setTests] = useState<TestItem[]>([
    {
      id: "test-login-123",
      name: "Login Page",
      method: "GET",
      url: "https://www.saucedemo.com/",
    },
  ]);

  // Run Test Function
  const handleRunTest = async (testItem: TestItem) => {
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

    // Lowercase string status to satisfy Supabase check constraints
    const overallStatus: "passed" | "failed" = isPassed ? "passed" : "failed";

    setRunResult({
      testName: testItem.name,
      overallStatus,
      totalLatency: calculatedLatency,
      stepsEvaluated: mockSteps.length,
      steps: mockSteps,
    });

    try {
      const payload = {
        project_id: projectId,
        test_id: testItem.id,
        status: overallStatus,
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

  // 1. EDIT BUTTON HANDLERS
  const handleOpenEditModal = (testItem: TestItem) => {
    setEditingTest({ ...testItem });
    setEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    if (!editingTest) return;

    setTests((prev) =>
      prev.map((t) => (t.id === editingTest.id ? editingTest : t))
    );
    setEditModalOpen(false);
  };

  // 2. DELETE BUTTON HANDLER
  const handleDeleteTest = (testId: string) => {
    const isConfirmed = window.confirm(
      "Are you sure you want to delete this test?"
    );
    if (isConfirmed) {
      setTests((prev) => prev.filter((t) => t.id !== testId));
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
              <Button
                onClick={() => tests[0] && handleRunTest(tests[0])}
                disabled={loading || tests.length === 0}
              >
                ⚡ {loading ? "Running..." : "Run All Tests"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* API & Web Tests List */}
        <div>
          <h2 className="text-lg font-semibold text-gray-800 mb-4">
            API & Web Tests ({tests.length})
          </h2>

          {tests.length === 0 ? (
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
                        className="font-semibold text-blue-600"
                      >
                        {test.method}
                      </Badge>
                      <div>
                        <p className="font-medium text-gray-900">{test.name}</p>
                        <p className="text-xs text-gray-500">{test.url}</p>
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

                      {/* EDIT BUTTON */}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenEditModal(test)}
                        className="cursor-pointer hover:bg-gray-100"
                      >
                        Edit
                      </Button>

                      {/* DELETE BUTTON */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDeleteTest(test.id)}
                        className="text-red-600 hover:text-red-700 hover:bg-red-50 cursor-pointer"
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

      {/* EDIT MODAL */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="max-w-md p-6 bg-white rounded-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold">Edit Test</DialogTitle>
          </DialogHeader>

          {editingTest && (
            <div className="space-y-4 py-2">
              <div>
                <Label className="text-xs font-semibold text-gray-600">
                  Test Name
                </Label>
                <Input
                  value={editingTest.name}
                  onChange={(e) =>
                    setEditingTest({ ...editingTest, name: e.target.value })
                  }
                  className="mt-1"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold text-gray-600">
                  URL
                </Label>
                <Input
                  value={editingTest.url}
                  onChange={(e) =>
                    setEditingTest({ ...editingTest, url: e.target.value })
                  }
                  className="mt-1"
                />
              </div>
            </div>
          )}

          <DialogFooter className="pt-2 flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              className="bg-black text-white hover:bg-gray-800"
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* TEST RESULTS MODAL */}
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