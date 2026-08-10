"use client";

import React, { useState } from "react";
import { Plus, Trash2, ArrowUp, ArrowDown } from "lucide-react";

export type StepCategory = "browser" | "api";
export type StepMode = "action" | "assertion";

export interface TestStep {
  id: string;
  name: string;
  category: StepCategory;
  mode: StepMode;
  // Action properties
  action?: string;
  targetUrl?: string;
  selector?: string;
  value?: string;
  // Assertion properties
  assertionType?: string;
  attributeName?: string;
  expectedValue?: string;
  // API properties
  method?: string;
  apiUrl?: string;
  headers?: string;
  body?: string;
  expectedStatus?: number;
}

interface StepBuilderProps {
  steps: TestStep[];
  onChange: (steps: TestStep[]) => void;
}

const ACTION_TYPES = [
  { value: "goto", label: "Navigate to URL" },
  { value: "click", label: "Click Element" },
  { value: "fill", label: "Type Text into Input" },
  { value: "press", label: "Press Key (e.g. Enter)" },
  { value: "hover", label: "Hover Over Element" },
  { value: "wait", label: "Wait (ms)" },
];

const ASSERTION_TYPES = [
  { value: "toBeVisible", label: "Element is Visible" },
  { value: "toHaveText", label: "Element Has Text" },
  { value: "toContainText", label: "Element Contains Text" },
  { value: "toHaveValue", label: "Input Has Value" },
  { value: "toHaveAttribute", label: "Element Has Attribute" },
  { value: "toHaveURL", label: "Page Has URL" },
];

export function StepBuilder({ steps, onChange }: StepBuilderProps) {
  // Update specific step properties
  const updateStep = (id: string, updates: Partial<TestStep>) => {
    onChange(
      steps.map((step) => (step.id === id ? { ...step, ...updates } : step))
    );
  };

  // Switch step category (browser vs api) and clean unused fields
  const updateStepCategory = (id: string, category: StepCategory) => {
    onChange(
      steps.map((step) => {
        if (step.id !== id) return step;
        return {
          ...step,
          category,
          ...(category === "browser"
            ? { mode: "action", action: "goto" }
            : { method: "GET", apiUrl: "" }),
        };
      })
    );
  };

  // Switch step mode (action vs assertion) and clean unused fields
  const updateStepMode = (id: string, mode: StepMode) => {
    onChange(
      steps.map((step) => {
        if (step.id !== id) return step;
        return {
          ...step,
          mode,
          ...(mode === "assertion"
            ? { assertionType: "toBeVisible" }
            : { action: "goto" }),
        };
      })
    );
  };

  // Manage steps ordering
  const addStep = () => {
    const newStep: TestStep = {
      id: `step-${Date.now()}`,
      name: `Step ${steps.length + 1}`,
      category: "browser",
      mode: "action",
      action: "goto",
      targetUrl: "",
    };
    onChange([...steps, newStep]);
  };

  const removeStep = (id: string) => {
    if (steps.length === 1) {
      alert("Test flow must contain at least one step.");
      return;
    }
    onChange(steps.filter((step) => step.id !== id));
  };

  const moveStep = (index: number, direction: "up" | "down") => {
    const newSteps = [...steps];
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;

    const [movedItem] = newSteps.splice(index, 1);
    newSteps.splice(targetIndex, 0, movedItem);
    onChange(newSteps);
  };

  return (
    <div className="space-y-4">
      {steps.map((step, index) => (
        <div
          key={step.id}
          className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4 hover:border-slate-300 transition"
        >
          {/* Step Header Bar */}
          <div className="flex items-center justify-between">
            <input
              type="text"
              value={step.name}
              onChange={(e) => updateStep(step.id, { name: e.target.value })}
              className="font-semibold text-slate-800 text-sm border-b border-transparent hover:border-slate-200 focus:border-blue-500 focus:outline-none"
            />

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => moveStep(index, "up")}
                disabled={index === 0}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => moveStep(index, "down")}
                disabled={index === steps.length - 1}
                className="p-1 text-slate-400 hover:text-slate-600 disabled:opacity-30"
              >
                <ArrowDown className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => removeStep(step.id)}
                className="p-1 text-red-400 hover:text-red-600 ml-2"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Category and Mode Selectors */}
          <div className="flex gap-4 border-t border-b border-slate-100 py-3">
            <div>
              <span className="text-xs text-slate-500 mr-2 font-medium">Category:</span>
              <select
                value={step.category}
                onChange={(e) => updateStepCategory(step.id, e.target.value as StepCategory)}
                className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700"
              >
                <option value="browser">Browser UI</option>
                <option value="api">API Endpoint</option>
              </select>
            </div>

            {step.category === "browser" && (
              <div>
                <span className="text-xs text-slate-500 mr-2 font-medium">Type:</span>
                <select
                  value={step.mode}
                  onChange={(e) => updateStepMode(step.id, e.target.value as StepMode)}
                  className="bg-slate-50 border border-slate-200 rounded px-2 py-1 text-xs font-medium text-slate-700"
                >
                  <option value="action">Action</option>
                  <option value="assertion">Assertion</option>
                </select>
              </div>
            )}
          </div>

          {/* Browser Action Config */}
          {step.category === "browser" && step.mode === "action" && (
            <div className="grid grid-cols-12 gap-4">
              <div className="col-span-4">
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  Action
                </label>
                <select
                  value={step.action || "goto"}
                  onChange={(e) => updateStep(step.id, { action: e.target.value })}
                  className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  {ACTION_TYPES.map((act) => (
                    <option key={act.value} value={act.value}>
                      {act.label}
                    </option>
                  ))}
                </select>
              </div>

              {step.action === "goto" ? (
                <div className="col-span-8">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Target URL
                  </label>
                  <input
                    type="url"
                    value={step.targetUrl || ""}
                    onChange={(e) => updateStep(step.id, { targetUrl: e.target.value })}
                    placeholder="https://example.com"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              ) : (
                <>
                  <div className="col-span-4">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      CSS / XPath Selector
                    </label>
                    <input
                      type="text"
                      value={step.selector || ""}
                      onChange={(e) => updateStep(step.id, { selector: e.target.value })}
                      placeholder="#submit-btn, .input-class"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  {["fill", "press", "wait"].includes(step.action || "") && (
                    <div className="col-span-4">
                      <label className="block text-xs font-semibold text-slate-500 mb-1">
                        Value
                      </label>
                      <input
                        type="text"
                        value={step.value || ""}
                        onChange={(e) => updateStep(step.id, { value: e.target.value })}
                        placeholder={step.action === "wait" ? "1000 (ms)" : "Input text"}
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Browser Assertion Config */}
          {step.category === "browser" && step.mode === "assertion" && (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-6">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Assertion Type
                  </label>
                  <select
                    value={step.assertionType || "toBeVisible"}
                    onChange={(e) => updateStep(step.id, { assertionType: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  >
                    {ASSERTION_TYPES.map((assert) => (
                      <option key={assert.value} value={assert.value}>
                        {assert.label}
                      </option>
                    ))}
                  </select>
                </div>

                {step.assertionType !== "toHaveURL" && (
                  <div className="col-span-6">
                    <label className="block text-xs font-semibold text-slate-500 mb-1">
                      Element Selector
                    </label>
                    <input
                      type="text"
                      value={step.selector || ""}
                      onChange={(e) => updateStep(step.id, { selector: e.target.value })}
                      placeholder="#submit-btn, .login-input"
                      className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </div>

              {step.assertionType === "toHaveAttribute" && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Attribute Name
                  </label>
                  <input
                    type="text"
                    value={step.attributeName || ""}
                    onChange={(e) => updateStep(step.id, { attributeName: e.target.value })}
                    placeholder="disabled, data-testid, href"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}

              {[
                "toHaveText",
                "toContainText",
                "toHaveValue",
                "toHaveAttribute",
                "toHaveURL",
              ].includes(step.assertionType || "") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Expected Value
                  </label>
                  <input
                    type="text"
                    value={step.expectedValue || ""}
                    onChange={(e) => updateStep(step.id, { expectedValue: e.target.value })}
                    placeholder="Expected string or value"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          )}

          {/* API Config */}
          {step.category === "api" && (
            <div className="space-y-4">
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    HTTP Method
                  </label>
                  <select
                    value={step.method || "GET"}
                    onChange={(e) => updateStep(step.id, { method: e.target.value })}
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500 font-semibold"
                  >
                    <option value="GET">GET</option>
                    <option value="POST">POST</option>
                    <option value="PUT">PUT</option>
                    <option value="DELETE">DELETE</option>
                    <option value="PATCH">PATCH</option>
                  </select>
                </div>
                <div className="col-span-6">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    API Endpoint URL
                  </label>
                  <input
                    type="url"
                    value={step.apiUrl || ""}
                    onChange={(e) => updateStep(step.id, { apiUrl: e.target.value })}
                    placeholder="https://api.example.com/v1/resource"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    Expected Status
                  </label>
                  <input
                    type="number"
                    value={step.expectedStatus || 200}
                    onChange={(e) =>
                      updateStep(step.id, { expectedStatus: parseInt(e.target.value, 10) })
                    }
                    placeholder="200"
                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-sm text-slate-800 focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {["POST", "PUT", "PATCH"].includes(step.method || "") && (
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    JSON Payload Body
                  </label>
                  <textarea
                    rows={3}
                    value={step.body || ""}
                    onChange={(e) => updateStep(step.id, { body: e.target.value })}
                    placeholder='{ "key": "value" }'
                    className="w-full bg-slate-900 text-slate-100 font-mono border border-slate-700 rounded-lg p-3 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      ))}

      {/* Add Step Action */}
      <button
        type="button"
        onClick={addStep}
        className="w-full py-3 border-2 border-dashed border-slate-300 hover:border-slate-400 text-slate-600 rounded-xl flex items-center justify-center gap-2 font-semibold text-sm transition"
      >
        <Plus className="w-4 h-4" /> Add Next Step
      </button>
    </div>
  );
}

export default StepBuilder;