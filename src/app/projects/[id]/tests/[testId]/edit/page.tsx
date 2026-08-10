import React from "react";
import { StepBuilder } from "@/components/test-builder/StepBuilder";

export default function EditTestPage({
  params,
}: {
  params: Promise<{ id: string; testId: string }> | { id: string; testId: string };
}) {
  const resolvedParams = params instanceof Promise ? React.use(params) : params;

  return (
    <div className="min-h-screen bg-gray-50/50 p-8">
      <StepBuilder
        projectId={resolvedParams.id}
        testId={resolvedParams.testId}
        isEdit={true}
      />
    </div>
  );
}