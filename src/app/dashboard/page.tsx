"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

interface ProjectItem {
  id: string;
  name: string;
  created_at?: string;
  runs_count?: number;
  pass_rate?: number;
  avg_latency?: number;
}

interface AnalyticsData {
  passRate: number;
  avgLatency: number;
  totalExecutions: number;
  failedExecutions: number;
}

export default function DashboardPage() {
  const supabase = createClient();

  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    passRate: 0,
    avgLatency: 0,
    totalExecutions: 0,
    failedExecutions: 0,
  });
  const [loading, setLoading] = useState(true);

  // Fetch global metrics & project-level execution stats
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      // 1. Fetch Global Analytics Endpoint
      const res = await fetch("/api/analytics", { cache: "no-store" });
      if (res.ok) {
        const analyticsData = await res.json();
        setAnalytics({
          passRate: analyticsData.passRate || 0,
          avgLatency: analyticsData.avgLatency || 0,
          totalExecutions: analyticsData.totalExecutions || 0,
          failedExecutions: analyticsData.failedExecutions || 0,
        });
      }

      // 2. Fetch Projects
      const { data: projData } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      // 3. Fetch All Runs to calculate per-project metrics dynamically
      const { data: runData } = await supabase.from("runs").select("*");

      if (projData) {
        const enrichedProjects = projData.map((proj) => {
          const projectRuns =
            runData?.filter(
              (r) => r.project_id === proj.id || r.project_id === proj.name
            ) || [];

          const runsCount = projectRuns.length;
          const passedCount = projectRuns.filter(
            (r) => r.status?.toLowerCase() === "passed"
          ).length;
          const passRate =
            runsCount > 0 ? Math.round((passedCount / runsCount) * 100) : 0;
          const totalLat = projectRuns.reduce(
            (acc, r) => acc + (r.duration_ms || r.latency || 0),
            0
          );
          const avgLatency =
            runsCount > 0 ? Math.round(totalLat / runsCount) : 0;

          return {
            ...proj,
            runs_count: runsCount,
            pass_rate: passRate,
            avg_latency: avgLatency,
          };
        });

        setProjects(enrichedProjects);
      }
    } catch (err) {
      console.error("Failed to load dashboard metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [supabase]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Project Deletion
  const handleDeleteProject = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete "${name}"?`)) return;

    try {
      await supabase.from("projects").delete().eq("id", id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      fetchDashboardData();
    } catch (err) {
      console.error("Error deleting project:", err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 font-sans pb-24">
      <main className="max-w-7xl mx-auto px-8 pt-8 space-y-8">
        {/* Header Title */}
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">
            Dashboard
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Overview of test suites and system health metrics
          </p>
        </div>

        {/* Global Analytics Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Overall Pass Rate
            </span>
            <p className="text-3xl font-extrabold text-emerald-500 mt-2">
              {analytics.passRate}%
            </p>
            <p className="text-xs text-slate-400 mt-1">Across all project suites</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Avg Response Latency
            </span>
            <p className="text-3xl font-extrabold text-blue-600 mt-2">
              {analytics.avgLatency} ms
            </p>
            <p className="text-xs text-slate-400 mt-1">Global average latency</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Total Executions
            </span>
            <p className="text-3xl font-extrabold text-slate-900 mt-2">
              {analytics.totalExecutions}
            </p>
            <p className="text-xs text-slate-400 mt-1">Combined workspace runs</p>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
            <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
              Failed Executions
            </span>
            <p
              className={`text-3xl font-extrabold mt-2 ${
                analytics.failedExecutions > 0 ? "text-red-500" : "text-slate-900"
              }`}
            >
              {analytics.failedExecutions}
            </p>
            <p className="text-xs text-slate-400 mt-1">Tests requiring attention</p>
          </div>
        </div>

        {/* Projects Grid Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-slate-900">
              Your Projects ({projects.length})
            </h2>
            <Link
              href="/projects/new"
              className="bg-black hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition shadow-xs"
            >
              + Create Project
            </Link>
          </div>

          {loading ? (
            <p className="text-xs text-slate-400">Updating dashboard metrics...</p>
          ) : projects.length === 0 ? (
            <div className="bg-white p-8 rounded-2xl border border-dashed border-slate-200 text-center">
              <p className="text-slate-600 font-medium">No projects created yet.</p>
              <Link
                href="/projects/new"
                className="inline-block mt-3 bg-black text-white text-xs px-4 py-2 rounded-xl font-medium"
              >
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {projects.map((project) => (
                <div
                  key={project.id}
                  className="bg-white p-6 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between space-y-6"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-lg font-bold text-slate-900">
                        {project.name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Created{" "}
                        {project.created_at
                          ? new Date(project.created_at).toLocaleDateString()
                          : "Recently"}
                      </p>
                    </div>
                    <span className="text-[10px] font-bold px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full">
                      Active
                    </span>
                  </div>

                  {/* Per-Project Metrics */}
                  <div className="bg-slate-50 p-4 rounded-xl grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">
                        Runs
                      </p>
                      <p className="text-sm font-bold text-slate-900 mt-1">
                        {project.runs_count || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">
                        Pass Rate
                      </p>
                      <p
                        className={`text-sm font-bold mt-1 ${
                          (project.pass_rate || 0) > 0
                            ? "text-emerald-500"
                            : "text-slate-900"
                        }`}
                      >
                        {project.pass_rate || 0}%
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase font-bold text-slate-400">
                        Avg Latency
                      </p>
                      <p className="text-sm font-bold text-blue-600 mt-1">
                        {project.avg_latency || 0} ms
                      </p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      onClick={() => handleDeleteProject(project.id, project.name)}
                      className="text-xs text-red-500 hover:text-red-700 font-medium flex items-center space-x-1"
                    >
                      <span>🗑 Delete</span>
                    </button>
                    <Link
                      href={`/projects/${project.id}`}
                      className="bg-black hover:bg-slate-800 text-white font-semibold text-xs px-4 py-2 rounded-xl transition flex items-center space-x-1"
                    >
                      <span>Open Workspace</span>
                      <span>→</span>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}