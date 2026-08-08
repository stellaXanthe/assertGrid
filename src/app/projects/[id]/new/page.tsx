"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { Globe, Zap } from "lucide-react";

export type PlaywrightAction =
  | "navigate"
  | "click"
  | "dblclick"
  | "fill"
  | "clear"
  | "press"
  | "check"
  | "uncheck"
  | "selectOption"
  | "hover"
  | "dragTo"
  | "setInputFiles";

interface Step {
  id: string;
  name: string;
  type: "web" | "api";
  // API Fields
  method?: string;
  url?: string;
  expectedStatus?: number;
  // Web Fields
  action?: PlaywrightAction;
  selector?: string;
  value?: string;
}

export default function NewTestPage() {
  const router = useRouter();
  const params = useParams();
  const projectId = params?.id as string;

  const [testTitle, setTestTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [steps, setSteps] = useState<Step[]>([
    {
      id: "step-1",
      name: "Step 1: Open Home Page",
      type: "web",
      action: "navigate",
      url: "https://example.com/login",
      method: "GET",
      expectedStatus: 200,
      selector: "",
      value: "",
    },
  ]);

  const supabase = createClient();

  const handleAddStep = () => {
    const newStepIndex = steps.length + 1;
    setSteps((prev) => [
      ...prev,
      {
        id: `step-${Date.now()}`,
        name: `Step ${newStepIndex}: New Action`,
        type: "web",
        action: "click",
        url: "",
        method: "GET",
        expectedStatus: 200,
        selector: "",
        value: "",
      },
    ]);
  };

  const handleRemoveStep = (id: string) => {
    if (steps.length === 1) return;
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const handleStepChange = (id: string, field: keyof Step, value: any) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formattedSteps = steps.map((s) => {
        if (s.type === "web") {
          return {
            name: s.name || "Unnamed Web Step",
            type: "web",
            action: s.action || "navigate",
            url: s.url || "",
            selector: s.selector || "",
            value: s.value || "",
          };
        }

        return {
          name: s.name || "Unnamed API Step",
          type: "api",
          method: (s.method || "GET").toUpperCase(),
          url: s.url || "",
          expectedStatus: Number(s.expectedStatus) || 200,
        };
      });

      const { error: insertError } = await supabase.from("test_cases").insert({
        project_id: projectId,
        title: testTitle,
        type: formattedSteps[0]?.type || "web",
        steps: formattedSteps,
      });

      if (insertError) throw insertError;

      router.push(`/projects/${projectId}`);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Failed to create test case.");
      }
    } finally {
      setLoading(false);
    }
  };

  // Helper to dynamically dictate placeholder and input requirements based on Playwright Action
  const getFieldConfig = (action?: PlaywrightAction) => {
    switch (action) {
      case "navigate":
        return {
          showSelector: false,
          showValue: false,
          showUrl: true,
          urlPlaceholder: "https://example.com/login",
          valuePlaceholder: "",
          valueLabel: "",
        };
      case "fill":
        return {
          showSelector: true,
          showValue: true,
          showUrl: false,
          selectorPlaceholder: "#username or input[name='email']",
          valuePlaceholder: "e.g. John Doe",
          valueLabel: "Text Content — fill()",
        };
      case "press":
        return {
          showSelector: true,
          showValue: true,
          showUrl: false,
          selectorPlaceholder: "input#search",
          valuePlaceholder: "e.g. Enter, Tab, ArrowDown",
          valueLabel: "Keyboard Key — press()",
        };
      case "selectOption":
        return {
          showSelector: true,
          showValue: true,
          showUrl: false,
          selectorPlaceholder: "select#country",
          valuePlaceholder: "Option value or label",
          valueLabel: "Dropdown Option — selectOption()",
        };
      case "dragTo":
        return {
          showSelector: true,
          showValue: true,
          showUrl: false,
          selectorPlaceholder: "#source-element",
          valuePlaceholder: "#target-element",
          valueLabel: "Target Selector — dragTo()",
        };
      case "setInputFiles":
        return {
          showSelector: true,
          showValue: true,
          showUrl: false,
          selectorPlaceholder: "input[type='file']",
          valuePlaceholder: "path/to/file.png",
          valueLabel: "File Path — setInputFiles()",
        };
      case "click":
      case "dblclick":
      case "check":
      case "uncheck":
      case "hover":
      case "clear":
      default:
        return {
          showSelector: true,
          showValue: false,
          showUrl: false,
          selectorPlaceholder: "#submit-btn, .nav-item, etc.",
          valuePlaceholder: "",
          valueLabel: "",
        };
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-4">
      {/* Back link */}
      <Link
        href={`/projects/${projectId}`}
        className="text-sm text-blue-600 hover:underline inline-block font-medium"
      >
        ← Back to Project
      </Link>

      <Card className="border shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-2xl font-bold">
            Create Test Suite (Web & API)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 rounded-md border border-red-100">
                {error}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Test Flow Name
              </label>
              <Input
                placeholder="e.g. End-to-End User Login & Dashboard Check"
                value={testTitle}
                onChange={(e) => setTestTitle(e.target.value)}
                className="bg-white"
                required
              />
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900">
                  Execution Steps ({steps.length})
                </h3>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddStep}
                  className="bg-white hover:bg-gray-50 border-gray-300"
                >
                  + Add Step
                </Button>
              </div>

              {steps.map((step, idx) => {
                const config = getFieldConfig(step.action);

                return (
                  <div
                    key={step.id}
                    className="p-5 border rounded-2xl space-y-4 bg-gray-50/40 relative"
                  >
                    {/* STEP HEADER */}
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2 flex-1 w-full">
                        <span className="bg-slate-900 text-white font-semibold text-xs rounded-full h-7 w-7 flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <Input
                          value={step.name}
                          onChange={(e) =>
                            handleStepChange(step.id, "name", e.target.value)
                          }
                          className="font-semibold text-gray-800 bg-white border-gray-200 focus:bg-white max-w-xs"
                        />
                      </div>

                      {/* WEB / API TOGGLE */}
                      <div className="flex items-center gap-1 bg-gray-200/70 p-1 rounded-xl border border-gray-200 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleStepChange(step.id, "type", "web")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            step.type === "web"
                              ? "bg-white text-blue-600 shadow-sm border border-gray-200/80"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          <Globe className="w-3.5 h-3.5 text-blue-500" />
                          <span className="text-[11px] leading-tight text-center">
                            Web
                            <br />
                            Browser
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleStepChange(step.id, "type", "api")}
                          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                            step.type === "api"
                              ? "bg-white text-amber-600 shadow-sm border border-gray-200/80"
                              : "text-gray-500 hover:text-gray-700"
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 text-amber-500" />
                          <span className="text-[11px] leading-tight text-center">
                            API
                            <br />
                            Call
                          </span>
                        </button>
                      </div>

                      {steps.length > 1 && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveStep(step.id)}
                          className="text-red-500 hover:text-red-700 hover:bg-red-50 text-xs h-8 px-2"
                        >
                          Remove
                        </Button>
                      )}
                    </div>

                    {/* ACTION CONFIGURATION FIELDS */}
                    {step.type === "web" ? (
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        {/* BROWSER ACTION SELECTOR */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Browser Action
                          </label>
                          <select
                            className="w-full h-10 px-3 border rounded-md bg-white text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={step.action || "navigate"}
                            onChange={(e) =>
                              handleStepChange(
                                step.id,
                                "action",
                                e.target.value as PlaywrightAction
                              )
                            }
                          >
                            <option value="navigate">Navigate — goto()</option>
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

                        {/* TARGET / SELECTOR FIELD */}
                        {config.showUrl ? (
                          <div className="md:col-span-2">
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Target Page URL
                            </label>
                            <Input
                              placeholder={config.urlPlaceholder}
                              value={step.url || ""}
                              onChange={(e) =>
                                handleStepChange(step.id, "url", e.target.value)
                              }
                              className="bg-white border-gray-200"
                              required
                            />
                          </div>
                        ) : (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Target Selector (CSS / ID)
                            </label>
                            <Input
                              placeholder={config.selectorPlaceholder}
                              value={step.selector || ""}
                              onChange={(e) =>
                                handleStepChange(step.id, "selector", e.target.value)
                              }
                              className="bg-white border-gray-200"
                              required
                            />
                          </div>
                        )}

                        {/* VALUE / ARGUMENT FIELD */}
                        {config.showValue && (
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              {config.valueLabel}
                            </label>
                            <Input
                              placeholder={config.valuePlaceholder}
                              value={step.value || ""}
                              onChange={(e) =>
                                handleStepChange(step.id, "value", e.target.value)
                              }
                              className="bg-white border-gray-200"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      /* API CALL STEP FIELDS */
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            HTTP Method
                          </label>
                          <select
                            className="w-full h-10 px-3 border rounded-md bg-white text-sm border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                            value={step.method || "GET"}
                            onChange={(e) =>
                              handleStepChange(step.id, "method", e.target.value)
                            }
                          >
                            <option value="GET">GET</option>
                            <option value="POST">POST</option>
                            <option value="PUT">PUT</option>
                            <option value="DELETE">DELETE</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Target Endpoint URL
                          </label>
                          <Input
                            placeholder="https://example.com/api/v1/users"
                            value={step.url || ""}
                            onChange={(e) =>
                              handleStepChange(step.id, "url", e.target.value)
                            }
                            className="bg-white border-gray-200"
                            required
                          />
                        </div>

                        <div>
                          <label className="block text-xs font-medium text-gray-700 mb-1">
                            Expected Status Code
                          </label>
                          <Input
                            type="number"
                            value={step.expectedStatus || 200}
                            onChange={(e) =>
                              handleStepChange(
                                step.id,
                                "expectedStatus",
                                e.target.value
                              )
                            }
                            className="bg-white border-gray-200"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* ACTION BUTTONS */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push(`/projects/${projectId}`)}
                className="bg-white border-gray-300 text-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading}
                className="bg-black hover:bg-gray-800 text-white font-medium"
              >
                {loading ? "Saving..." : "Save Test Flow"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}