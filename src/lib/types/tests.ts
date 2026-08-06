export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type Assertion = {
  id: string;
  type: "status" | "jsonPath" | "header" | "responseTime";
  expected: string | number;
  path?: string; // for jsonPath or header name
};

export type ApiStep = {
  id: string;
  name: string;
  method: HttpMethod;
  url: string;
  headers?: Record<string, string>;
  body?: any;
  assertions: Assertion[];
};

export type TestCase = {
  id: string;
  project_id: string;
  suite_id?: string | null;
  name: string;
  type: "api" | "ui" | "visual";
  steps: ApiStep[];
  created_at: string;
  updated_at: string;
};

export type TestRun = {
  id: string;
  project_id: string;
  test_case_id: string;
  status: "queued" | "running" | "passed" | "failed" | "error";
  started_at?: string;
  finished_at?: string;
  duration_ms?: number;
  results?: any;
  created_at: string;
};