"use client";

import { useState, use } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StepBuilder, TestStep } from "@/components/test-builder/StepBuilder";
import Link from "next/link";

export default function NewTestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { id: projectId } = use(params);

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [steps, setSteps] = useState<TestStep[]>([
    {
      name: "Step 1: Open Home Page",
      type: "browser",
      category: "action",
      action: "goto",
      url: "https://example.com/login",
      selector: "",
      value: "",
      method: "GET",
      headers: "{}",
      body: "{}",
      expected_status: 200,
      extractRules: [],
    },
  ]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Determine overall test type (browser if at least one browser step exists)
      const hasBrowser = steps.some((s) => s.type === "browser");
      const testType = hasBrowser ? "browser" : "api";

      const formattedSteps = steps.map((s) => {
        if (s.type === "browser") {
          return {
            name: s.name,
            type: "browser",
            category: s.category || "action",
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

      const { error } = await supabase.from("test_cases").insert({
        project_id: projectId,
        name,
        type: testType,
        steps: formattedSteps,
      });

      if (error) {
        alert(`Error creating test: ${error.message}`);
      } else {
        router.push(`/projects/${projectId}`);
      }
    } catch (err: unknown) {
      const errorMessage =
        err instanceof Error ? err.message : "Failed to create test.";
      alert(errorMessage);
    } finally {
      setSubmitting(false);
    }
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
            <CardTitle className="text-2xl font-bold">
              Create Test Suite (Web & API)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-6">
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
                  {submitting ? "Saving..." : "Save Test Flow"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}