"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2, Globe, Server, CheckSquare, Play } from "lucide-react";

export interface ExtractRule {
  varName: string;
  jsonPath: string;
}

export interface TestStep {
  name: string;
  type: "browser" | "api";
  category?: "action" | "assertion"; // Action vs Assertion category
  action: string;
  url: string;
  selector?: string;
  value?: string;
  method?: string;
  headers?: string;
  body?: string;
  expected_status?: number;
  extractRules?: ExtractRule[];
}

const ACTION_OPTIONS = [
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

const ASSERTION_OPTIONS = [
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

const ASSERTION_VALUES = new Set(ASSERTION_OPTIONS.map((a) => a.value));

interface StepBuilderProps {
  steps: TestStep[];
  onChange: (steps: TestStep[]) => void;
}

export function StepBuilder({ steps, onChange }: StepBuilderProps) {
  const addStep = (type: "browser" | "api") => {
    const newStep: TestStep = {
      name: `Step ${steps.length + 1}`,
      type,
      category: "action",
      action: type === "browser" ? "goto" : "",
      url: "",
      selector: "",
      value: "",
      method: "GET",
      headers: "{}",
      body: "{}",
      expected_status: 200,
      extractRules: [],
    };
    onChange([...steps, newStep]);
  };

  const updateStep = (index: number, updatedFields: Partial<TestStep>) => {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...updatedFields };
    onChange(updated);
  };

  const removeStep = (index: number) => {
    onChange(steps.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Execution Steps ({steps.length})
        </h3>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStep("browser")}
            className="flex items-center gap-1.5"
          >
            <Globe className="w-4 h-4 text-blue-600" />
            + Add Browser Step
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addStep("api")}
            className="flex items-center gap-1.5"
          >
            <Server className="w-4 h-4 text-amber-600" />
            + Add API Step
          </Button>
        </div>
      </div>

      {steps.map((step, index) => {
        const isAssertion =
          step.category === "assertion" || ASSERTION_VALUES.has(step.action);

        return (
          <Card key={index} className="border border-gray-200 shadow-sm relative">
            <CardContent className="p-4 space-y-4">
              <div className="flex items-center justify-between gap-3 border-b pb-3">
                <div className="flex items-center gap-2 flex-1">
                  <span className="w-6 h-6 rounded-full bg-slate-900 text-white text-xs font-bold flex items-center justify-center">
                    #{index + 1}
                  </span>
                  <Input
                    value={step.name}
                    onChange={(e) => updateStep(index, { name: e.target.value })}
                    placeholder="Step name..."
                    className="max-w-xs h-8 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span
                    className={`text-xs px-2 py-0.5 rounded font-medium ${
                      step.type === "browser"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-amber-100 text-amber-700"
                    }`}
                  >
                    {step.type === "browser" ? "Web Browser" : "API Call"}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(index)}
                    className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* BROWSER STEP CONTROLS */}
              {step.type === "browser" && (
                <div className="space-y-4">
                  {/* Step Type Switcher: [ Action ] vs [ Assertion ] */}
                  <div>
                    <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1.5">
                      Step Mode
                    </label>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateStep(index, {
                            category: "action",
                            action: "goto",
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          !isAssertion
                            ? "bg-white text-blue-600 shadow-xs border border-gray-200 font-semibold"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <Play className="w-3.5 h-3.5" />
                        Action
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateStep(index, {
                            category: "assertion",
                            action: "toBeVisible",
                          })
                        }
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                          isAssertion
                            ? "bg-white text-emerald-600 shadow-xs border border-gray-200 font-semibold"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        <CheckSquare className="w-3.5 h-3.5" />
                        Assertion
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {isAssertion ? "Assertion Type" : "Browser Action"}
                      </label>
                      <select
                        value={step.action}
                        onChange={(e) =>
                          updateStep(index, { action: e.target.value })
                        }
                        className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm shadow-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        {(isAssertion ? ASSERTION_OPTIONS : ACTION_OPTIONS).map(
                          (opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          )
                        )}
                      </select>
                    </div>

                    {/* URL Field for Navigation / URL assertions */}
                    {(step.action === "goto" || step.action === "toHaveURL") && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          {step.action === "toHaveURL"
                            ? "Expected URL / Path"
                            : "Target Page URL"}
                        </label>
                        <Input
                          value={step.url}
                          onChange={(e) =>
                            updateStep(index, { url: e.target.value })
                          }
                          placeholder="https://example.com/login"
                          className="h-9 text-sm"
                        />
                      </div>
                    )}

                    {/* Element Selector Field */}
                    {step.action !== "goto" && step.action !== "toHaveURL" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Element Selector (CSS / XPath)
                        </label>
                        <Input
                          value={step.selector || ""}
                          onChange={(e) =>
                            updateStep(index, { selector: e.target.value })
                          }
                          placeholder="#submit-btn, .login-input, input[name='email']"
                          className="h-9 text-sm"
                        />
                      </div>
                    )}
                  </div>

                  {/* Dynamic Value Input for Actions/Assertions requiring values */}
                  {[
                    "fill",
                    "selectOption",
                    "press",
                    "toHaveText",
                    "toContainText",
                    "toHaveValue",
                    "toHaveAttribute",
                  ].includes(step.action) && (
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {step.action === "toHaveAttribute"
                          ? 'Attribute Name & Expected Value (e.g. disabled="true")'
                          : isAssertion
                          ? "Expected Value / Text"
                          : "Input Value"}
                      </label>
                      <Input
                        value={step.value || ""}
                        onChange={(e) =>
                          updateStep(index, { value: e.target.value })
                        }
                        placeholder={
                          isAssertion
                            ? "e.g. Welcome Back or active"
                            : "Value to type or enter..."
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* API STEP CONTROLS */}
              {step.type === "api" && (
                <div className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Method
                      </label>
                      <select
                        value={step.method}
                        onChange={(e) =>
                          updateStep(index, { method: e.target.value })
                        }
                        className="w-full h-9 rounded-md border border-gray-300 bg-white px-3 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="PATCH">PATCH</option>
                        <option value="DELETE">DELETE</option>
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Endpoint URL
                      </label>
                      <Input
                        value={step.url}
                        onChange={(e) =>
                          updateStep(index, { url: e.target.value })
                        }
                        placeholder="https://api.example.com/v1/users"
                        className="h-9 text-sm"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        Expected Status
                      </label>
                      <Input
                        type="number"
                        value={step.expected_status ?? 200}
                        onChange={(e) =>
                          updateStep(index, {
                            expected_status: parseInt(e.target.value) || 200,
                          })
                        }
                        className="h-9 text-sm"
                      />
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}

      {steps.length === 0 && (
        <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-lg text-gray-500 text-sm">
          No execution steps added yet. Choose a step type above to start building.
        </div>
      )}
    </div>
  );
}