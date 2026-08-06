"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface TestStep {
  name: string;
  type: "api" | "browser";
  // Web Browser Action Fields
  action?: "goto" | "click" | "fill" | "assert_text";
  selector?: string;
  value?: string;
  // API Fields
  method?: string;
  url?: string;
  headers?: string;
  body?: string;
  expected_status?: number;
  extractRules?: Array<{ varName: string; jsonPath: string }>;
}

interface StepBuilderProps {
  steps: TestStep[];
  onChange: (steps: TestStep[]) => void;
}

export function StepBuilder({ steps, onChange }: StepBuilderProps) {
  function updateStep(index: number, updatedFields: Partial<TestStep>) {
    const updated = [...steps];
    updated[index] = { ...updated[index], ...updatedFields };
    onChange(updated);
  }

  function addStep() {
    onChange([
      ...steps,
      {
        name: `Step ${steps.length + 1}`,
        type: "browser",
        action: "goto",
        selector: "",
        value: "",
        method: "GET",
        url: "",
        headers: "{}",
        body: "{}",
        expected_status: 200,
        extractRules: [],
      },
    ]);
  }

  function removeStep(index: number) {
    if (steps.length === 1) {
      alert("A test case must have at least one step.");
      return;
    }
    onChange(steps.filter((_, i) => i !== index));
  }

  function addExtractRule(stepIndex: number) {
    const updated = [...steps];
    if (!updated[stepIndex].extractRules) {
      updated[stepIndex].extractRules = [];
    }
    updated[stepIndex].extractRules!.push({ varName: "", jsonPath: "" });
    onChange(updated);
  }

  function updateExtractRule(
    stepIndex: number,
    ruleIndex: number,
    field: "varName" | "jsonPath",
    value: string
  ) {
    const updated = [...steps];
    updated[stepIndex].extractRules![ruleIndex][field] = value;
    onChange(updated);
  }

  function removeExtractRule(stepIndex: number, ruleIndex: number) {
    const updated = [...steps];
    updated[stepIndex].extractRules = updated[stepIndex].extractRules!.filter(
      (_, i) => i !== ruleIndex
    );
    onChange(updated);
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">
          Execution Steps ({steps.length})
        </h3>
        <Button type="button" variant="outline" size="sm" onClick={addStep}>
          + Add Step
        </Button>
      </div>

      {steps.map((step, i) => (
        <Card key={i} className="border-2 border-gray-200">
          <CardHeader className="bg-gray-50 flex flex-row items-center justify-between py-3 px-4 border-b">
            <div className="flex items-center gap-3">
              <Badge className="bg-gray-800 text-white font-mono text-xs">
                #{i + 1}
              </Badge>
              <Input
                type="text"
                value={step.name}
                onChange={(e) => updateStep(i, { name: e.target.value })}
                placeholder="Step Name (e.g., Fill Login Form)"
                className="font-semibold bg-white max-w-xs h-8 text-sm"
              />
              {/* Type Switcher */}
              <div className="flex rounded-md border bg-gray-100 p-0.5 text-xs font-medium">
                <button
                  type="button"
                  onClick={() => updateStep(i, { type: "browser" })}
                  className={`px-2.5 py-1 rounded-sm ${
                    step.type === "browser"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  🌐 Web Browser
                </button>
                <button
                  type="button"
                  onClick={() => updateStep(i, { type: "api" })}
                  className={`px-2.5 py-1 rounded-sm ${
                    step.type === "api"
                      ? "bg-white text-blue-600 shadow-sm"
                      : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  ⚡ API Call
                </button>
              </div>
            </div>
            {steps.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => removeStep(i)}
              >
                Remove Step
              </Button>
            )}
          </CardHeader>

          <CardContent className="p-4 space-y-4">
            {step.type === "browser" ? (
              /* WEB BROWSER AUTOMATION FIELDS */
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Browser Action
                    </label>
                    <select
                      value={step.action || "goto"}
                      onChange={(e) =>
                        updateStep(i, {
                          action: e.target.value as TestStep["action"],
                        })
                      }
                      className="w-full border rounded-md p-2 bg-white text-sm border-input"
                    >
                      <option value="goto">Navigate (goto)</option>
                      <option value="click">Click Element</option>
                      <option value="fill">Type into Input</option>
                      <option value="assert_text">Assert Page Text</option>
                    </select>
                  </div>

                  {step.action === "goto" ? (
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Target Page URL
                      </label>
                      <Input
                        type="url"
                        value={step.url || ""}
                        onChange={(e) => updateStep(i, { url: e.target.value })}
                        placeholder="https://example.com/login"
                        required
                      />
                    </div>
                  ) : step.action === "assert_text" ? (
                    <div className="col-span-3">
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Expected Text on Page
                      </label>
                      <Input
                        type="text"
                        value={step.value || ""}
                        onChange={(e) =>
                          updateStep(i, { value: e.target.value })
                        }
                        placeholder="Welcome back, John!"
                        required
                      />
                    </div>
                  ) : (
                    <>
                      <div className="col-span-1">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          Element Selector
                        </label>
                        <Input
                          type="text"
                          value={step.selector || ""}
                          onChange={(e) =>
                            updateStep(i, { selector: e.target.value })
                          }
                          placeholder="#submit-btn or input[name='email']"
                          className="font-mono text-xs"
                          required
                        />
                      </div>
                      <div className="col-span-2">
                        <label className="block text-xs font-semibold text-gray-600 mb-1">
                          {step.action === "fill"
                            ? "Value to Type"
                            : "Description / Notes"}
                        </label>
                        <Input
                          type="text"
                          value={step.value || ""}
                          onChange={(e) =>
                            updateStep(i, { value: e.target.value })
                          }
                          placeholder={
                            step.action === "fill"
                              ? "user@example.com"
                              : "Optional description"
                          }
                        />
                      </div>
                    </>
                  )}
                </div>
              </div>
            ) : (
              /* API REQUEST AUTOMATION FIELDS */
              <div className="space-y-4">
                <div className="grid grid-cols-4 gap-3">
                  <div className="col-span-1">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      HTTP Method
                    </label>
                    <select
                      value={step.method || "GET"}
                      onChange={(e) =>
                        updateStep(i, { method: e.target.value })
                      }
                      className="w-full border rounded-md p-2 bg-white text-sm font-mono border-input"
                    >
                      <option value="GET">GET</option>
                      <option value="POST">POST</option>
                      <option value="PUT">PUT</option>
                      <option value="PATCH">PATCH</option>
                      <option value="DELETE">DELETE</option>
                    </select>
                  </div>

                  <div className="col-span-3">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Target Endpoint URL
                    </label>
                    <Input
                      type="text"
                      value={step.url || ""}
                      onChange={(e) => updateStep(i, { url: e.target.value })}
                      placeholder="https://api.example.com/v1/users"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Expected HTTP Status Code
                  </label>
                  <Input
                    type="number"
                    value={step.expected_status || 200}
                    onChange={(e) =>
                      updateStep(i, {
                        expected_status: parseInt(e.target.value, 10) || 200,
                      })
                    }
                    placeholder="200"
                    className="max-w-[150px]"
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">
                      Request Headers (JSON)
                    </label>
                    <textarea
                      value={step.headers || "{}"}
                      onChange={(e) =>
                        updateStep(i, { headers: e.target.value })
                      }
                      rows={3}
                      className="w-full font-mono text-xs border rounded-md p-2 bg-gray-50 border-input"
                    />
                  </div>

                  {["POST", "PUT", "PATCH"].includes(step.method || "") && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">
                        Request Body (JSON)
                      </label>
                      <textarea
                        value={step.body || "{}"}
                        onChange={(e) =>
                          updateStep(i, { body: e.target.value })
                        }
                        rows={3}
                        className="w-full font-mono text-xs border rounded-md p-2 bg-gray-50 border-input"
                      />
                    </div>
                  )}
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-gray-700">
                      🔗 Variable Extraction Rules
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="text-xs text-blue-600"
                      onClick={() => addExtractRule(i)}
                    >
                      + Add Extraction Rule
                    </Button>
                  </div>

                  {(!step.extractRules || step.extractRules.length === 0) ? (
                    <p className="text-xs text-gray-400 italic">
                      No variables extracted from this response.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {step.extractRules.map((rule, rIdx) => (
                        <div key={rIdx} className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={rule.varName}
                            onChange={(e) =>
                              updateExtractRule(i, rIdx, "varName", e.target.value)
                            }
                            placeholder="Variable Name (e.g. auth_token)"
                            className="text-xs h-8 font-mono"
                          />
                          <span className="text-xs text-gray-400">←</span>
                          <Input
                            type="text"
                            value={rule.jsonPath}
                            onChange={(e) =>
                              updateExtractRule(i, rIdx, "jsonPath", e.target.value)
                            }
                            placeholder="JSON Path (e.g. data.token)"
                            className="text-xs h-8 font-mono"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-8 text-xs text-red-500"
                            onClick={() => removeExtractRule(i, rIdx)}
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}