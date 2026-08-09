"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface ProjectMetrics {
  totalExecutions: number;
  passRate: number;
  avgLatency: number;
  failedExecutions: number;
}

interface Project {
  id: string;
  name: string;
  created_at: string;
  metrics?: ProjectMetrics;
}

interface TestRun {
  id: string;
  project_id: string;
  status: string;
  duration_ms?: number | null;
  latency?: number | null;
}

export default function DashboardPage() {
  const supabase = createClient();

  const [projects, setProjects] = useState<Project[]>([]);
  const [globalMetrics, setGlobalMetrics] = useState<ProjectMetrics>({
    passRate: 0,
    avgLatency: 0,
    totalExecutions: 0,
    failedExecutions: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);

      // 1. Fetch Projects
      const { data: projectData, error: projError } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (projError) {
        console.error("Error loading projects:", projError.message);
        setLoading(false);
        return;
      }

      // 2. Fetch All Test Runs
      const { data: runsData, error: runsError } = await supabase
        .from("test_runs")
        .select("*");

      if (runsError) {
        console.error("Error loading test runs:", runsError.message);
      }

      const allRuns: TestRun[] = runsData || [];

      // Calculate Global Metrics
      if (allRuns.length > 0) {
        const total = allRuns.length;
        const passed = allRuns.filter(
          (r) => r.status?.toLowerCase() === "passed"
        ).length;
        const failed = allRuns.filter(
          (r) => r.status?.toLowerCase() === "failed"
        ).length;

        const totalMs = allRuns.reduce((acc, r) => {
          return acc + Number(r.duration_ms ?? r.latency ?? 0);
        }, 0);

        setGlobalMetrics({
          passRate: Math.round((passed / total) * 100),
          avgLatency: Math.round(totalMs / total),
          totalExecutions: total,
          failedExecutions: failed,
        });
      }

      // 3. Attach Per-Project Metrics
      const mappedProjects: Project[] = (projectData || []).map((proj) => {
        const projRuns = allRuns.filter((r) => r.project_id === proj.id);
        const totalExecs = projRuns.length;

        if (totalExecs === 0) {
          return {
            ...proj,
            metrics: {
              totalExecutions: 0,
              passRate: 0,
              avgLatency: 0,
              failedExecutions: 0,
            },
          };
        }

        const passed = projRuns.filter(
          (r) => r.status?.toLowerCase() === "passed"
        ).length;
        const failed = projRuns.filter(
          (r) => r.status?.toLowerCase() === "failed"
        ).length;

        const totalMs = projRuns.reduce((acc, r) => {
          return acc + Number(r.duration_ms ?? r.latency ?? 0);
        }, 0);

        return {
          ...proj,
          metrics: {
            totalExecutions: totalExecs,
            passRate: Math.round((passed / totalExecs) * 100),
            avgLatency: Math.round(totalMs / totalExecs),
            failedExecutions: failed,
          },
        };
      });

      setProjects(mappedProjects);
      setLoading(false);
    }

    loadDashboardData();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-sm text-gray-500 mt-1">
              Overview of test suites and system health metrics
            </p>
          </div>
          <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100 px-3 py-1 font-medium">
            ● System Operational
          </Badge>
        </div>

        {/* System-Wide Global Metrics Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Overall Pass Rate
              </p>
              <h3 className="text-3xl font-bold text-emerald-600 mt-2">
                {loading ? "..." : `${globalMetrics.passRate}%`}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Across all project suites
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Avg Response Latency
              </p>
              <h3 className="text-3xl font-bold text-blue-600 mt-2">
                {loading ? "..." : `${globalMetrics.avgLatency} ms`}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Global average latency
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Total Executions
              </p>
              <h3 className="text-3xl font-bold text-gray-900 mt-2">
                {loading ? "..." : globalMetrics.totalExecutions}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Combined workspace runs
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Failed Executions
              </p>
              <h3
                className={`text-3xl font-bold mt-2 ${
                  globalMetrics.failedExecutions > 0
                    ? "text-red-600"
                    : "text-gray-900"
                }`}
              >
                {loading ? "..." : globalMetrics.failedExecutions}
              </h3>
              <p className="text-xs text-gray-400 mt-1">
                Tests requiring attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Cards with Per-Project Specific Metrics */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Your Projects ({projects.length})
            </h2>
            <Link href="/projects/new">
              <Button size="sm">+ Create Project</Button>
            </Link>
          </div>

          {loading ? (
            <div className="p-8 text-center text-gray-500 text-sm">
              Loading workspace projects...
            </div>
          ) : projects.length === 0 ? (
            <Card>
              <CardContent className="p-8 text-center text-gray-500">
                No projects created yet.
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => {
                const m = proj.metrics;
                return (
                  <Card key={proj.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6 flex flex-col justify-between gap-4">
                      {/* Project Header */}
                      <div className="flex justify-between items-start">
                        <div>
                          <h3 className="text-lg font-bold text-gray-900">
                            {proj.name}
                          </h3>
                          <p className="text-xs text-gray-400 mt-0.5">
                            Created {new Date(proj.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <Badge variant="outline" className="text-xs text-gray-500">
                          Active
                        </Badge>
                      </div>

                      {/* Per-Project Breakdown Badges */}
                      <div className="grid grid-cols-3 gap-2 bg-gray-50 p-3 rounded-lg text-center border border-gray-100">
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-gray-400">
                            Runs
                          </p>
                          <p className="text-sm font-bold text-gray-800">
                            {m?.totalExecutions ?? 0}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-gray-400">
                            Pass Rate
                          </p>
                          <p className="text-sm font-bold text-emerald-600">
                            {m?.passRate ?? 0}%
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase font-semibold text-gray-400">
                            Avg Latency
                          </p>
                          <p className="text-sm font-bold text-blue-600">
                            {m?.avgLatency ?? 0} ms
                          </p>
                        </div>
                      </div>

                      {/* Action Button */}
                      <div className="flex justify-end pt-1">
                        <Link href={`/projects/${proj.id}`}>
                          <Button
                            size="sm"
                            className="bg-black text-white hover:bg-gray-800 cursor-pointer text-xs"
                          >
                            Open Workspace →
                          </Button>
                        </Link>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}