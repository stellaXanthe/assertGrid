"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type StepCategory = "browser" | "api";
export type StepMode = "action" | "assertion";

export interface TestStep {
  id: string;
  name: string;
  category: StepCategory;
  mode: StepMode;

  // Browser Action fields
  action?: string;
  targetUrl?: string;
  selector?: string;
  value?: string;

  // Browser Assertion fields
  assertionType?: string;
  expectedValue?: string;
  attributeName?: string;

  // API fields
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  endpointUrl?: string;
  expectedStatus?: number;
}

interface TestFormProps {
  projectId: string;
  testId?: string;
  initialName?: string;
  initialSteps?: TestStep[];
  isEdit?: boolean;
}

const BROWSER_ACTIONS = [
  { label: "Navigate — goto()", value: "goto" },
  { label: "Click Element — click()", value: "click" },
  { label: "Double Click — dblclick()", value: "dblclick" },
  { label: "Fill Input — fill()", value: "fill" },
  { label: "Clear Input — clear()", value: "clear" },
  { label: "Press Keys — press()", value: "press" },
  { label: "Check Checkbox — check()", value: "check" },
  { label: "Uncheck Checkbox — uncheck()", value: "uncheck" },
  { label: "Select Dropdown — selectOption()", value: "selectOption" },
  { label: "Hover Element — hover()", value: "hover" },
  { label: "Drag and Drop — dragTo()", value: "dragTo" },
  { label: "Upload File — setInputFiles()", value: "setInputFiles" },
];

const ASSERTION_TYPES = [
  { label: "Be Visible — toBeVisible()", value: "toBeVisible" },
  { label: "Be Hidden — toBeHidden()", value: "toBeHidden" },
  { label: "Have Exact Text — toHaveText()", value: "toHaveText" },
  { label: "Contain Text — toContainText()", value: "toContainText" },
  { label: "Have Input Value — toHaveValue()", value: "toHaveValue" },
  { label: "Have Attribute — toHaveAttribute()", value: "toHaveAttribute" },
  { label: "Be Enabled — toBeEnabled()", value: "toBeEnabled" },
  { label: "Be Disabled — toBeDisabled()", value: "toBeDisabled" },
  { label: "Have Page URL — toHaveURL()", value: "toHaveURL" },
];

export default function TestForm({
  projectId,
  testId,
  initialName = "Login Page",
  initialSteps,
  isEdit = false,
}: TestFormProps) {
  const router = useRouter();
  const supabase = createClient();

  const [flowName, setFlowName] = useState(initialName);
  const [saving, setSaving] = useState(false);

  const [steps, setSteps] = useState<TestStep[]>(
    initialSteps || [
      {
        id: "step-1",
        name: "Step 1: Open Home Page",
        category: "browser",
        mode: "action",
        action: "goto",
        targetUrl: "https://www.saucedemo.com/",
      },
    ]
  );

  useEffect(() => {
    if (initialName) setFlowName(initialName);
    if (initialSteps && initialSteps.length > 0) setSteps(initialSteps);
  }, [initialName, initialSteps]);

  const handleAddBrowserStep = () => {
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      name: `Step ${steps.length + 1}`,
      category: "browser",
      mode: "action",
      action: "goto",
      targetUrl: "https://www.saucedemo.com/",
    };
    setSteps([...steps, newStep]);
  };

  const handleAddApiStep = () => {
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      name: `Step ${steps.length + 1}`,
      category: "api",
      mode: "action",
      method: "GET",
      endpointUrl: "https://api.example.com/v1/health",
      expectedStatus: 200,
    };
    setSteps([...steps, newStep]);
  };

  const updateStep = (id: string, fields: Partial<TestStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === id ? { ...step, ...fields } : step))
    );
  };

  const removeStep = (id: string) => {
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!flowName.trim()) {
      alert("Please enter a Test Flow Name");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && testId) {
        await supabase
          .from("tests")
          .update({
            name: flowName,
            steps: steps,
            updated_at: new Date().toISOString(),
          })
          .eq("id", testId);
      } else {
        await supabase.from("tests").insert({
          project_id: projectId,
          name: flowName,
          steps: steps,
          created_at: new Date().toISOString(),
        });
      }

      router.push(`/projects/${projectId}`);
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center space-x-6">
          <Link href="/dashboard" className="flex items-center space-x-2">
            <span className="bg-[#2563EB] text-white font-black text-sm px-2.5 py-1 rounded-md tracking-wider">
              AG
            </span>
            <span className="font-bold text-xl text-slate-900 tracking-tight">
              AssertGrid
            </span>
          </Link>
          <span className="text-slate-500 text-sm font-medium">Dashboard</span>
        </div>

        <div className="flex items-center space-x-2 bg-emerald-50 text-emerald-700 px-3 py-1 rounded-full border border-emerald-200 text-xs font-semibold">
          <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>System Operational</span>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-6 pt-8 space-y-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-8 shadow-xs">
          <form onSubmit={handleSubmit} className="space-y-6">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
              {isEdit ? "Edit Test Case" : "Create Test Case"}
            </h1>

            {/* Test Flow Name Input */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-600">
                Test Flow Name
              </label>
              <input
                type="text"
                value={flowName}
                onChange={(e) => setFlowName(e.target.value)}
                placeholder="Login Page"
                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
              />
            </div>

            {/* Header Steps Bar */}
            <div className="flex items-center justify-between pt-2">
              <h2 className="text-base font-bold text-slate-900">
                Execution Steps ({steps.length})
              </h2>

              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={handleAddBrowserStep}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs flex items-center space-x-1.5"
                >
                  <span className="text-blue-600">🌐</span>
                  <span>+ Add Browser Step</span>
                </button>
                <button
                  type="button"
                  onClick={handleAddApiStep}
                  className="bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg transition shadow-xs flex items-center space-x-1.5"
                >
                  <span className="text-amber-500">⚡</span>
                  <span>+ Add API Step</span>
                </button>
              </div>
            </div>

            {/* Execution Steps List */}
            <div className="space-y-4">
              {steps.map((step, index) => (
                <div
                  key={step.id}
                  className="border border-slate-200 rounded-2xl p-5 shadow-xs bg-white space-y-4"
                >
                  {/* Step Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                    <div className="flex items-center space-x-3 w-full max-w-sm">
                      <span className="bg-slate-900 text-white font-bold text-xs px-2 py-0.5 rounded-full">
                        #{index + 1}
                      </span>
                      <input
                        type="text"
                        value={step.name}
                        onChange={(e) =>
                          updateStep(step.id, { name: e.target.value })
                        }
                        className="border border-slate-200 rounded-lg px-3 py-1 text-sm font-medium text-slate-800 w-full focus:outline-none focus:border-blue-500"
                      />
                    </div>

                    <div className="flex items-center space-x-3">
                      <span className="bg-blue-50 text-blue-600 text-xs font-semibold px-2.5 py-1 rounded-md">
                        {step.category === "browser" ? "Web Browser" : "API Step"}
                      </span>
                      {steps.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeStep(step.id)}
                          className="text-red-400 hover:text-red-600 transition p-1"
                        >
                          🗑️
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Step Mode Pill */}
                  <div className="space-y-1.5">
                    <label className="block text-2xs font-bold text-slate-400 uppercase tracking-wider">
                      STEP MODE
                    </label>
                    <div className="inline-flex bg-slate-100 p-1 rounded-xl border border-slate-200/80 space-x-1">
                      <button
                        type="button"
                        onClick={() => updateStep(step.id, { mode: "action" })}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                          step.mode === "action"
                            ? "bg-white text-blue-600 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span>▷ Action</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => updateStep(step.id, { mode: "assertion" })}
                        className={`px-3 py-1 rounded-lg text-xs font-semibold transition flex items-center space-x-1.5 ${
                          step.mode === "assertion"
                            ? "bg-white text-emerald-600 shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        <span>☑ Assertion</span>
                      </button>
                    </div>
                  </div>

                  {/* Browser Action Mode */}
                  {step.category === "browser" && step.mode === "action" && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-12 gap-4">
                        <div className="col-span-6">
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Browser Action
                          </label>
                          <select
                            value={step.action || "goto"}
                            onChange={(e) =>
                              updateStep(step.id, { action: e.target.value })
                            }
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                          >
                            {BROWSER_ACTIONS.map((act) => (
                              <option key={act.value} value={act.value}>
                                {act.label}
                              </option>
                            ))}
                          </select>
                        </div>

                        {step.action === "goto" ? (
                          <div className="col-span-6">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                              Target Page URL
                            </label>
                            <input
                              type="text"
                              value={step.targetUrl || ""}
                              onChange={(e) =>
                                updateStep(step.id, { targetUrl: e.target.value })
                              }
                              placeholder="https://www.saucedemo.com/"
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        ) : (
                          <div className="col-span-6">
                            <label className="block text-xs font-semibold text-slate-500 mb-1">
                              Element Selector (CSS / XPath)
                            </label>
                            <input
                              type="text"
                              value={step.selector || ""}
                              onChange={(e) =>
                                updateStep(step.id, { selector: e.target.value })
                              }
                              placeholder="[name='user-name']"
                              className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                            />
                          </div>
                        )}
                      </div>

                      {step.action === "fill" && (
                        <div>
                          <label className="block text-xs font-semibold text-slate-500 mb-1">
                            Input Value
                          </label>
                          <input
                            type="text"
                            value={step.value || ""}
                            onChange={(e) =>
                              updateStep(step.id, { value: e.target.value })
                            }
                            placeholder="standard_user"
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      )}
                    </div>
                  )}

                  {/* Browser Assertion Mode */}
                  {step.category === "browser" && step.mode === "assertion" && (
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-6">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Assertion Type
                        </label>
                        <select
                          value={step.assertionType || "toBeVisible"}
                          onChange={(e) =>
                            updateStep(step.id, { assertionType: e.target.value })
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          {ASSERTION_TYPES.map((assert) => (
                            <option key={assert.value} value={assert.value}>
                              {assert.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="col-span-6">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Element Selector (CSS / XPath)
                        </label>
                        <input
                          type="text"
                          value={step.selector || ""}
                          onChange={(e) =>
                            updateStep(step.id, { selector: e.target.value })
                          }
                          placeholder="#submit-btn, .login-input, input[name='email']"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}

                  {/* API Mode */}
                  {step.category === "api" && (
                    <div className="grid grid-cols-12 gap-4">
                      <div className="col-span-3">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Method
                        </label>
                        <select
                          value={step.method || "GET"}
                          onChange={(e) =>
                            updateStep(step.id, {
                              method: e.target.value as TestStep["method"],
                            })
                          }
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm font-medium text-slate-800 focus:outline-none focus:border-blue-500"
                        >
                          <option value="GET">GET</option>
                          <option value="POST">POST</option>
                          <option value="PUT">PUT</option>
                          <option value="PATCH">PATCH</option>
                          <option value="DELETE">DELETE</option>
                        </select>
                      </div>

                      <div className="col-span-6">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Endpoint URL
                        </label>
                        <input
                          type="text"
                          value={step.endpointUrl || ""}
                          onChange={(e) =>
                            updateStep(step.id, { endpointUrl: e.target.value })
                          }
                          placeholder="https://api.example.com/v1/health"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>

                      <div className="col-span-3">
                        <label className="block text-xs font-semibold text-slate-500 mb-1">
                          Expected Status
                        </label>
                        <input
                          type="number"
                          value={step.expectedStatus ?? 200}
                          onChange={(e) =>
                            updateStep(step.id, {
                              expectedStatus: Number(e.target.value),
                            })
                          }
                          placeholder="200"
                          className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Bottom Form Actions */}
            <div className="flex justify-end items-center space-x-3 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold px-4 py-2 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="bg-black hover:bg-slate-800 text-white text-xs font-semibold px-5 py-2.5 rounded-lg transition disabled:opacity-50 shadow-xs"
              >
                {saving ? "Saving..." : "Save Test Flow"}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Floating AI Assistant Button */}
      <div className="fixed bottom-6 right-8">
        <button className="bg-[#2563EB] hover:bg-blue-700 text-white font-bold text-xs px-5 py-3 rounded-full shadow-lg flex items-center space-x-2 transition hover:scale-105">
          <span>✨</span>
          <span>AssertGrid AI Assistant</span>
        </button>
      </div>
    </div>
  );
}