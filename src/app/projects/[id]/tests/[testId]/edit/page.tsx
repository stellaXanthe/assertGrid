"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepBuilder, TestStep } from "@/components/test-builder/StepBuilder";
import Link from "next/link";

interface DBSchemaStep {
  type?: string;
  name?: string;
  action?: string;
  url?: string;
  selector?: string;
  value?: string;
  method?: string;
  headers?: unknown;
  body?: unknown;
  expected_status?: number;
  extract?: Record<string, string>;
}

export default function EditTestPage({
  params,
}: {
  params: Promise<{ id: string; testId: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();

  // Unwrap asynchronous params for Next.js 15
  const { id: projectId, testId } = use(params);

  const [name, setName] = useState("");
  const [testType, setTestType] = useState<string>("api"); // Store original DB test type
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [steps, setSteps] = useState<TestStep[]>([]);

  useEffect(() => {
    async function fetchTestCase() {
      setLoading(true);
      const { data, error } = await supabase
        .from("test_cases")
        .select("*")
        .eq("id", testId)
        .single();

      if (error || !data) {
        alert("Failed to load test case.");
        router.push(`/projects/${projectId}`);
        return;
      }

      setName(data.name || "");
      setTestType(data.type || "api"); // Preserve existing valid type from DB

      if (Array.isArray(data.steps)) {
        const mappedSteps: TestStep[] = data.steps.map((s: DBSchemaStep) => {
          if (s.type === "browser") {
            return {
              name: s.name || "",
              type: "browser",
              action: s.action || "goto",
              url: s.url || "",
              selector: s.selector || "",
              value: s.value || "",
              method: "GET",
              headers: "{}",
              body: "{}",
              expected_status: 200,
              extractRules: [],
            };
          }

          const extractRules = Object.entries(s.extract || {}).map(
            ([varName, jsonPath]) => ({
              varName,
              jsonPath: String(jsonPath),
            })
          );

          return {
            name: s.name || "",
            type: "api",
            method: s.method || "GET",
            url: s.url || "",
            headers: JSON.stringify(s.headers || {}, null, 2),
            body: JSON.stringify(s.body || {}, null, 2),
            expected_status: s.expected_status ?? 200,
            extractRules,
            action: "goto",
            selector: "",
            value: "",
          };
        });

        setSteps(mappedSteps);
      }

      setLoading(false);
    }

    if (testId) {
      fetchTestCase();
    }
  }, [testId, projectId, router, supabase]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      const formattedSteps = steps.map((s) => {
        if (s.type === "browser") {
          return {
            name: s.name,
            type: "browser",
            action: s.action,
            url: s.url,
            selector: s.selector,
            value: s.value,
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

        const extractObject: Record<string, string> = {};
        (s.extractRules || []).forEach((rule) => {
          if (rule.varName.trim() && rule.jsonPath.trim()) {
            extractObject[rule.varName.trim()] = rule.jsonPath.trim();
          }
        });

        return {
          name: s.name,
          type: "api",
          method: s.method,
          url: s.url,
          headers: parsedHeaders,
          body: parsedBody,
          expected_status: s.expected_status,
          extract: extractObject,
        };
      });

      // Pass the preserved testType instead of re-calculating a string that violates DB constraints
      const { error } = await supabase
        .from("test_cases")
        .update({
          name,
          type: testType,
          steps: formattedSteps,
        })
        .eq("id", testId);

      if (error) {
        alert(`Error updating test: ${error.message}`);
      } else {
        router.push(`/projects/${projectId}`);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to update test.";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
        <p className="text-gray-500 text-sm">Loading test details...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <Link
          href={`/projects/${projectId}`}
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to Project
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Edit Test Case</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Flow Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. End-to-End User Login & Dashboard Check"
                  required
                />
              </div>

              <StepBuilder steps={steps} onChange={setSteps} />

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Link href={`/projects/${projectId}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Updating..." : "Update Test Case"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}