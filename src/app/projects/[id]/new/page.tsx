"use client";

import React, { useState } from "react";
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
  params: Promise<{ id: string }> | { id: string };
}) {
  const router = useRouter();
  const supabase = createClient();

  const resolvedParams = params instanceof Promise ? React.use(params) : params;
  const projectId = resolvedParams.id;

  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [steps, setSteps] = useState<TestStep[]>([
    {
      id: "step-1",
      name: "Step 1: Open Home Page",
      category: "browser",
      mode: "action",
      action: "goto",
      targetUrl: "https://example.com/login",
      selector: "",
      value: "",
      method: "GET",
      apiUrl: "",
      headers: "{}",
      body: "{}",
      expectedStatus: 200,
    },
  ]);

  async function handleCreate(e: React.FormEvent) {
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
          method: s.method,
          url: s.apiUrl,
          headers: parsedHeaders,
          body: parsedBody,
          expected_status: s.expectedStatus,
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

              {/* Render step builder directly within form */}
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