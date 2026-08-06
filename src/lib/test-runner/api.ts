export async function runApiTest(testCase: any) {
  const startTime = Date.now();
  const results = [];
  let overallPassed = true;

  const steps = testCase.steps || [];

  for (const step of steps) {
    const stepStartTime = Date.now();
    try {
      const options: RequestInit = {
        method: step.method || "GET",
        headers: step.headers || {},
      };

      if (step.body && ["POST", "PUT", "PATCH"].includes(step.method?.toUpperCase())) {
        options.body = typeof step.body === "string" ? step.body : JSON.stringify(step.body);
        if (!options.headers) options.headers = {};
        (options.headers as Record<string, string>)["Content-Type"] = "application/json";
      }

      const response = await fetch(step.url, options);
      const durationMs = Date.now() - stepStartTime;

      const expectedStatus = step.assertions?.[0]?.expected || 200;
      const statusPassed = response.status === Number(expectedStatus);

      if (!statusPassed) {
        overallPassed = false;
      }

      results.push({
        stepId: step.id,
        name: step.name || "Main Request",
        status: statusPassed ? "passed" : "failed",
        actualStatus: response.status,
        expectedStatus,
        durationMs,
      });
    } catch (err: any) {
      overallPassed = false;
      results.push({
        stepId: step.id,
        name: step.name || "Main Request",
        status: "failed",
        error: err?.message || "Failed to execute HTTP request",
        durationMs: Date.now() - stepStartTime,
      });
    }
  }

  return {
    status: overallPassed ? "passed" : "failed",
    durationMs: Date.now() - startTime,
    results,
  };
}