"use client";

import { useState, useEffect, use } from "react";
import { useRouter, useParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

interface TestCase {
  id: string;
  name: string;
  type: string;
  steps: Array<{
    method?: string;
    url?: string;
    headers?: Record<string, any>;
    body?: any;
    expected_status?: number;
  }>;
}

export default function EditTestPage({
  params,
}: {
  params: Promise<{ id: string; testId: string }> | { id: string; testId: string };
}) {
  const router = useRouter();
  const supabase = createClient();

  const resolvedParams = params instanceof Promise ? use(params) : params;
  const urlParams = useParams();

  const projectId = (resolvedParams?.id || urlParams?.id) as string;
  const testId = (resolvedParams?.testId || urlParams?.testId) as string;

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form states
  const [name, setName] = useState("");
  const [method, setMethod] = useState("GET");
  const [url, setUrl] = useState("");
  const [expectedStatus, setExpectedStatus] = useState("200");
  const [headersJson, setHeadersJson] = useState("{}");
  const [bodyJson, setBodyJson] = useState("{}");

  useEffect(() => {
    async function loadTestCase() {
      if (!testId) return;
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
      const step = data.steps?.[0] || {};
      setMethod(step.method || "GET");
      setUrl(step.url || "");
      setExpectedStatus(String(step.expected_status ?? 200));
      setHeadersJson(JSON.stringify(step.headers || {}, null, 2));
      setBodyJson(
        typeof step.body === "object"
          ? JSON.stringify(step.body || {}, null, 2)
          : String(step.body || "{}")
      );

      setLoading(false);
    }

    loadTestCase();
  }, [testId, projectId, router, supabase]);

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);

    try {
      let parsedHeaders = {};
      let parsedBody = {};

      try {
        parsedHeaders = JSON.parse(headersJson || "{}");
      } catch {
        alert("Invalid JSON format in Headers.");
        setSubmitting(false);
        return;
      }

      if (["POST", "PUT", "PATCH"].includes(method)) {
        try {
          parsedBody = JSON.parse(bodyJson || "{}");
        } catch {
          alert("Invalid JSON format in Request Body.");
          setSubmitting(false);
          return;
        }
      }

      const updatedStep = {
        name: name,
        method: method,
        url: url,
        headers: parsedHeaders,
        body: ["POST", "PUT", "PATCH"].includes(method) ? parsedBody : null,
        expected_status: parseInt(expectedStatus, 10) || 200,
      };

      const { error } = await supabase
        .from("test_cases")
        .update({
          name,
          steps: [updatedStep],
        })
        .eq("id", testId);

      if (error) {
        alert(`Error updating test: ${error.message}`);
      } else {
        router.push(`/projects/${projectId}`);
      }
    } catch (err: any) {
      console.error(err);
      alert("An error occurred while updating the test.");
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
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <Link
            href={`/projects/${projectId}`}
            className="text-sm text-blue-600 hover:underline"
          >
            ← Back to Project
          </Link>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-bold">Edit API Test</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleUpdate} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Test Name
                </label>
                <Input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Update User Profile"
                  required
                />
              </div>

              <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    HTTP Method
                  </label>
                  <select
                    value={method}
                    onChange={(e) => setMethod(e.target.value)}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Endpoint URL
                  </label>
                  <Input
                    type="url"
                    value={url}
                    onChange={(e) => setUrl(e.target.value)}
                    placeholder="https://api.example.com/v1/users"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Expected HTTP Status Code
                </label>
                <Input
                  type="number"
                  value={expectedStatus}
                  onChange={(e) => setExpectedStatus(e.target.value)}
                  placeholder="200"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Request Headers (JSON)
                </label>
                <textarea
                  value={headersJson}
                  onChange={(e) => setHeadersJson(e.target.value)}
                  rows={3}
                  className="w-full font-mono text-xs border rounded-md p-2 bg-gray-50 border-input"
                />
              </div>

              {["POST", "PUT", "PATCH"].includes(method) && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Request Body (JSON)
                  </label>
                  <textarea
                    value={bodyJson}
                    onChange={(e) => setBodyJson(e.target.value)}
                    rows={5}
                    className="w-full font-mono text-xs border rounded-md p-2 bg-gray-50 border-input"
                  />
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4">
                <Link href={`/projects/${projectId}`}>
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
                <Button type="submit" disabled={submitting}>
                  {submitting ? "Saving..." : "Save Changes"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}