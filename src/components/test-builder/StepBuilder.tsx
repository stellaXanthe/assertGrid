"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { Play, CheckSquare, Globe, Zap, Trash2 } from "lucide-react";

export interface TestStep {
  id: string;
  name: string;
  category: "browser" | "api";
  mode: "action" | "assertion";
  // Browser fields
  action?: string;
  targetUrl?: string;
  selector?: string;
  value?: string;
  assertionType?: string;
  attributeName?: string;
  expectedValue?: string;
  // API fields
  method?: string;
  apiUrl?: string;
  headers?: string;
  body?: string;
  expectedStatus?: number;
}

export interface StepBuilderProps {
  projectId?: string;
  testId?: string;
  initialName?: string;
  initialSteps?: TestStep[];
  isEdit?: boolean;
  // Controlled form props to satisfy external component state (e.g. page.tsx)
  steps?: TestStep[] | any[];
  onChange?: (steps: TestStep[]) => void;
}

export function StepBuilder({
  projectId = "",
  testId,
  initialName = "",
  initialSteps = [],
  isEdit = false,
  steps: externalSteps,
  onChange: externalOnChange,
}: StepBuilderProps) {
  const router = useRouter();
  const supabase = createClient();

  const [testName, setTestName] = useState(initialName);
  const [internalSteps, setInternalSteps] = useState<TestStep[]>(initialSteps);
  const [loading, setLoading] = useState(isEdit && !initialSteps.length);
  const [submitting, setSubmitting] = useState(false);

  // Determine active steps and updater based on controlled vs. uncontrolled usage
  const steps = (externalSteps as TestStep[]) ?? internalSteps;

  const updateStepsState = (newSteps: TestStep[]) => {
    if (externalOnChange) {
      externalOnChange(newSteps);
    } else {
      setInternalSteps(newSteps);
    }
  };

  // Load existing test if in edit mode and initial values were not passed
  useEffect(() => {
    if (isEdit && testId && !initialName && initialSteps.length === 0) {
      async function loadTest() {
        try {
          const { data, error } = await supabase
            .from("test_cases")
            .select("*")
            .eq("id", testId)
            .single();

          if (error) throw error;

          if (data) {
            setTestName(data.name || "");
            if (Array.isArray(data.steps)) {
              const loadedSteps: TestStep[] = data.steps.map((s: any, idx: number) => ({
                id: s.id || `step-${idx + 1}`,
                name: s.name || `Step ${idx + 1}`,
                category: s.type === "api" ? "api" : "browser",
                mode: s.category === "assertion" ? "assertion" : "action",
                action: s.action || "goto",
                targetUrl: s.url || "",
                selector: s.selector || "",
                value: s.value || "",
                assertionType: s.assertionType || "toBeVisible",
                attributeName: s.attributeName || "",
                expectedValue: s.expectedValue || "",
                method: s.method || "GET",
                apiUrl: s.url || "",
                headers: typeof s.headers === "string" ? s.headers : JSON.stringify(s.headers || {}, null, 2),
                body: typeof s.body === "string" ? s.body : JSON.stringify(s.body || {}, null, 2),
                expectedStatus: s.expected_status || 200,
              }));
              updateStepsState(loadedSteps);
            }
          }
        } catch (err: any) {
          alert(`Failed to load test: ${err.message}`);
        } finally {
          setLoading(false);
        }
      }
      loadTest();
    }
  }, [isEdit, testId, initialName, initialSteps, supabase]);

  const addStep = (category: "browser" | "api") => {
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      name: `Step ${steps.length + 1}`,
      category,
      mode: "action",
      action: category === "browser" ? "goto" : undefined,
      targetUrl: category === "browser" ? "https://" : undefined,
      method: category === "api" ? "GET" : undefined,
      apiUrl: category === "api" ? "https://api.example.com/v1/health" : undefined,
      headers: "{}",
      body: "{}",
      expectedStatus: 200,
      assertionType: "toBeVisible",
    };
    updateStepsState([...steps, newStep]);
  };

  const updateStep = (id: string, updatedFields: Partial<TestStep>) => {
    const updated = steps.map((step) =>
      step.id === id ? { ...step, ...updatedFields } : step
    );
    updateStepsState(updated);
  };

  const removeStep = (id: string) => {
    updateStepsState(steps.filter((s) => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const hasBrowser = steps.some((s) => s.category === "browser");
      const testType = hasBrowser ? "browser" : "api";

      const formattedSteps = steps.map((s) => {
        if (s.category === "browser") {
          return {
            name: s.name,
            type: "browser",
            category: s.mode || "action",
            action: s.action,
            url: s.targetUrl,
            selector: s.selector,
            value: s.value,
            assertionType: s.assertionType,
            attributeName: s.attributeName,
            expectedValue: s.expectedValue,
          };
        }

        let parsedHeaders = {};
        let parsedBody = null;

        try {
          parsedHeaders = JSON.parse(s.headers || "{}");
        } catch {
          throw new Error(`Invalid JSON headers in step: "${s.name}"`);
        }

        if (["POST", "PUT", "PATCH"].includes(s.method || "")) {
          try {
            parsedBody = JSON.parse(s.body || "{}");
          } catch {
            throw new Error(`Invalid JSON body in step: "${s.name}"`);
          }
        }

        return {
          name: s.name,
          type: "api",
          category: s.mode || "action",
          method: s.method,
          url: s.apiUrl,
          headers: parsedHeaders,
          body: parsedBody,
          expected_status: Number(s.expectedStatus) || 200,
        };
      });

      if (isEdit && testId) {
        const { error } = await supabase
          .from("test_cases")
          .update({
            name: testName,
            type: testType,
            steps: formattedSteps,
            updated_at: new Date().toISOString(),
          })
          .eq("id", testId);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("test_cases").insert({
          project_id: projectId,
          name: testName,
          type: testType,
          steps: formattedSteps,
        });

        if (error) throw error;
      }

      router.push(`/projects/${projectId}`);
    } catch (err: any) {
      alert(`Save failed: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12 text-gray-500">
        Loading test flow...
      </div>
    );
  }

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-sm border border-gray-200">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-gray-900">
          {isEdit ? "Edit Test Case" : "Create Test Case"}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Test Flow Name Input */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-2">
              Test Flow Name
            </label>
            <Input
              type="text"
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g. Login Page"
              className="bg-gray-50/50"
              required
            />
          </div>

          {/* Header Action Row */}
          <div className="flex items-center justify-between border-b pb-4">
            <h3 className="text-base font-bold text-gray-900">
              Execution Steps ({steps.length})
            </h3>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addStep("browser")}
                className="text-blue-600 border-blue-200 hover:bg-blue-50"
              >
                <Globe className="w-4 h-4 mr-1.5" /> + Add Browser Step
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => addStep("api")}
                className="text-orange-600 border-orange-200 hover:bg-orange-50"
              >
                <Zap className="w-4 h-4 mr-1.5" /> + Add API Step
              </Button>
            </div>
          </div>

          {/* Steps List */}
          <div className="space-y-4">
            {steps.map((step, idx) => (
              <div
                key={step.id}
                className="border border-gray-200 rounded-lg p-5 bg-white space-y-4 relative shadow-sm"
              >
                {/* Step Top Bar */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="bg-gray-900 text-white font-bold text-xs px-2.5 py-1 rounded">
                      #{idx + 1}
                    </span>
                    <Input
                      type="text"
                      value={step.name}
                      onChange={(e) =>
                        updateStep(step.id, { name: e.target.value })
                      }
                      className="h-8 w-64 text-sm font-medium"
                    />
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-md border border-blue-100">
                      {step.category === "browser" ? "Web Browser" : "API Step"}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeStep(step.id)}
                      className="text-gray-400 hover:text-red-600 transition"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Step Mode Toggle */}
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">
                    Step Mode
                  </label>
                  <div className="inline-flex rounded-lg bg-gray-100 p-1 border border-gray-200">
                    <button
                      type="button"
                      onClick={() => updateStep(step.id, { mode: "action" })}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition ${
                        step.mode === "action"
                          ? "bg-white text-blue-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <Play className="w-3.5 h-3.5" /> Action
                    </button>
                    <button
                      type="button"
                      onClick={() => updateStep(step.id, { mode: "assertion" })}
                      className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition ${
                        step.mode === "assertion"
                          ? "bg-white text-emerald-600 shadow-sm"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      <CheckSquare className="w-3.5 h-3.5" /> Assertion
                    </button>
                  </div>
                </div>

                {/* BROWSER - Action Mode */}
                {step.category === "browser" && step.mode === "action" && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Browser Action
                      </label>
                      <select
                        value={step.action || "goto"}
                        onChange={(e) =>
                          updateStep(step.id, { action: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="goto">Navigate — goto()</option>
                        <option value="click">Click Element — click()</option>
                        <option value="dblclick">Double Click — dblclick()</option>
                        <option value="fill">Fill Input — fill()</option>
                        <option value="clear">Clear Input — clear()</option>
                        <option value="press">Press Keys — press()</option>
                        <option value="check">Check Checkbox — check()</option>
                        <option value="uncheck">Uncheck Checkbox — uncheck()</option>
                        <option value="selectOption">Select Dropdown — selectOption()</option>
                        <option value="hover">Hover Element — hover()</option>
                        <option value="dragTo">Drag and Drop — dragTo()</option>
                        <option value="setInputFiles">Upload File — setInputFiles()</option>
                      </select>
                    </div>

                    {step.action === "goto" ? (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Target Page URL
                        </label>
                        <Input
                          type="text"
                          value={step.targetUrl || ""}
                          onChange={(e) =>
                            updateStep(step.id, { targetUrl: e.target.value })
                          }
                          placeholder="https://www.saucedemo.com/"
                        />
                      </div>
                    ) : (
                      <div>
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Element Selector (CSS / XPath)
                        </label>
                        <Input
                          type="text"
                          value={step.selector || ""}
                          onChange={(e) =>
                            updateStep(step.id, { selector: e.target.value })
                          }
                          placeholder="#submit-btn, .login-input"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* BROWSER - Assertion Mode */}
                {step.category === "browser" && step.mode === "assertion" && (
                  <div className="grid grid-cols-2 gap-4 pt-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Assertion Type
                      </label>
                      <select
                        value={step.assertionType || "toBeVisible"}
                        onChange={(e) =>
                          updateStep(step.id, { assertionType: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      >
                        <option value="toBeVisible">Be Visible — toBeVisible()</option>
                        <option value="toBeHidden">Be Hidden — toBeHidden()</option>
                        <option value="toHaveText">Have Exact Text — toHaveText()</option>
                        <option value="toContainText">Contain Text — toContainText()</option>
                        <option value="toHaveValue">Have Input Value — toHaveValue()</option>
                        <option value="toHaveAttribute">Have Attribute — toHaveAttribute()</option>
                        <option value="toBeEnabled">Be Enabled — toBeEnabled()</option>
                        <option value="toBeDisabled">Be Disabled — toBeDisabled()</option>
                        <option value="toHaveURL">Have Page URL — toHaveURL()</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Element Selector (CSS / XPath)
                      </label>
                      <Input
                        type="text"
                        value={step.selector || ""}
                        onChange={(e) =>
                          updateStep(step.id, { selector: e.target.value })
                        }
                        placeholder="#submit-btn, .login-input, input[name='email']"
                      />
                    </div>
                  </div>
                )}

                {/* API STEP FIELDS */}
                {step.category === "api" && (
                  <div className="grid grid-cols-12 gap-4 pt-2">
                    {/* Method Dropdown */}
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Method
                      </label>
                      <select
                        value={step.method || "GET"}
                        onChange={(e) =>
                          updateStep(step.id, { method: e.target.value })
                        }
                        className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>

                    {/* Endpoint URL Input */}
                    <div className="col-span-6">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Endpoint URL
                      </label>
                      <Input
                        type="text"
                        value={step.apiUrl || ""}
                        onChange={(e) =>
                          updateStep(step.id, { apiUrl: e.target.value })
                        }
                        placeholder="https://api.example.com/v1/health"
                      />
                    </div>

                    {/* Expected Status Code Input */}
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Expected Status
                      </label>
                      <Input
                        type="number"
                        value={step.expectedStatus || 200}
                        onChange={(e) =>
                          updateStep(step.id, {
                            expectedStatus: Number(e.target.value),
                          })
                        }
                        placeholder="200"
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Bottom Action Bar */}
          <div className="flex justify-end gap-3 pt-6 border-t">
            <Link href={projectId ? `/projects/${projectId}` : "#"}>
              <Button type="button" variant="outline">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-black hover:bg-gray-800 text-white font-semibold"
            >
              {submitting
                ? "Saving..."
                : isEdit
                ? "Save Test Flow"
                : "Create Test Flow"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default StepBuilder;