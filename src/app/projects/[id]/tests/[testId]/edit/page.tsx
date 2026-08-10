"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { createClient } from "../../../../../../lib/supabase/client";
import StepBuilder, { type TestStep } from "@/components/test-builder/StepBuilder";

export default function EditTestPage() {
  const params = useParams();
  const projectId = params?.id as string;
  const testId = params?.testId as string;

  const [testName, setTestName] = useState("Login Page");
  const [steps, setSteps] = useState<TestStep[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = createClient();

    async function loadTestData() {
      try {
        const { data } = await supabase
          .from("tests")
          .select("*")
          .eq("id", testId)
          .single();

        if (data) {
          setTestName(data.name || "Login Page");
          setSteps(data.steps || []);
        }
      } catch (err) {
        console.error("Failed to load test:", err);
      } finally {
        setLoading(false);
      }
    }

    if (testId) loadTestData();
  }, [testId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center text-sm font-semibold text-slate-500">
        Loading Test Case...
      </div>
    );
  }

  return (
    <StepBuilder
      projectId={projectId}
      testId={testId}
      initialName={testName}
      initialSteps={steps}
      isEdit={true}
    />
  );
}