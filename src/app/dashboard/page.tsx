"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Metrics {
  passRate: number;
  avgLatency: number;
  totalExecutions: number;
  failedExecutions: number;
}

interface Project {
  id: string;
  name: string;
  created_at: string;
  status: string;
}

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<Metrics>({
    passRate: 0,
    avgLatency: 0,
    totalExecutions: 0,
    failedExecutions: 0,
  });

  const [projects, setProjects] = useState<Project[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      setLoading(true);

      try {
        // 1. Fetch test executions to compute statistics
        const { data: executions, error: execError } = await supabase
          .from("test_executions")
          .select("status, latency");

        if (!execError && executions) {
          const totalExecutions = executions.length;

          if (totalExecutions > 0) {
            const passedExecutions = executions.filter(
              (e) => e.status?.toUpperCase() === "PASSED"
            ).length;

            const failedExecutions = executions.filter(
              (e) => e.status?.toUpperCase() === "FAILED"
            ).length;

            const passRate = Math.round(
              (passedExecutions / totalExecutions) * 100
            );

            const totalLatency = executions.reduce(
              (sum, item) => sum + (item.latency || 0),
              0
            );
            const avgLatency = Math.round(totalLatency / totalExecutions);

            setMetrics({
              passRate,
              avgLatency,
              totalExecutions,
              failedExecutions,
            });
          }
        }

        // 2. Fetch projects list
        const { data: projectList, error: projError } = await supabase
          .from("projects")
          .select("*")
          .order("created_at", { ascending: false });

        if (!projError && projectList) {
          setProjects(projectList);
        }
      } catch (err) {
        console.error("Failed to load dashboard metrics:", err);
      } finally {
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [supabase]);

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">
              Dashboard
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Overview of test suites and system health metrics
            </p>
          </div>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white font-medium">
            + New Project
          </Button>
        </div>

        {/* Dynamic Metric Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Card 1: Pass Rate */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Uptime / Pass Rate
              </p>
              <p className="text-3xl font-extrabold text-emerald-600 mt-3">
                {loading ? "..." : `${metrics.passRate}%`}
              </p>
              <p className="text-xs text-gray-400 mt-2">Overall suite pass ratio</p>
            </CardContent>
          </Card>

          {/* Card 2: Avg Response Latency */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Avg Response Latency
              </p>
              <p className="text-3xl font-extrabold text-blue-600 mt-3">
                {loading ? "..." : `${metrics.avgLatency} ms`}
              </p>
              <p className="text-xs text-gray-400 mt-2">Average response time</p>
            </CardContent>
          </Card>

          {/* Card 3: Total Executions */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Total Executions
              </p>
              <p className="text-3xl font-extrabold text-gray-900 mt-3">
                {loading ? "..." : metrics.totalExecutions}
              </p>
              <p className="text-xs text-gray-400 mt-2">Historical test runs</p>
            </CardContent>
          </Card>

          {/* Card 4: Failed Executions */}
          <Card className="bg-white shadow-sm border border-gray-200">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">
                Failed Executions
              </p>
              <p className="text-3xl font-extrabold text-red-600 mt-3">
                {loading ? "..." : metrics.failedExecutions}
              </p>
              <p className="text-xs text-gray-400 mt-2">
                Tests requiring attention
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Your Projects Section */}
        <div>
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              Your Projects ({projects.length})
            </h2>
            <Button variant="outline" size="sm" className="text-xs">
              + Create Project
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {projects.map((proj) => (
              <Card
                key={proj.id}
                className="bg-white shadow-sm border border-gray-200 hover:border-gray-300 transition-all"
              >
                <CardContent className="p-5 flex flex-col justify-between h-36">
                  <div className="flex justify-between items-start">
                    <h3 className="text-lg font-bold text-gray-900">
                      {proj.name}
                    </h3>
                    <Badge variant="secondary" className="bg-gray-100 text-gray-600 text-xs">
                      {proj.status || "Active"}
                    </Badge>
                  </div>

                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <span className="text-xs text-gray-400">
                      Created{" "}
                      {new Date(proj.created_at).toLocaleDateString("en-US")}
                    </span>
                    <div className="flex items-center gap-3">
                      <button className="text-xs text-red-600 hover:underline">
                        Delete
                      </button>
                      <a
                        href={`/projects/${proj.id}`}
                        className="text-xs font-medium bg-black text-white px-3 py-1.5 rounded-md hover:bg-gray-800 transition-colors"
                      >
                        Open Workspace &rarr;
                      </a>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}