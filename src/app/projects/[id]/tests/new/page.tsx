"use client";

import { useParams } from "next/navigation";
import TestForm from "@/components/test-builder/StepBuilder";

export default function CreateTestPage() {
  const params = useParams();
  const projectId = params?.id as string;

  return <TestForm projectId={projectId} isEdit={false} />;
}