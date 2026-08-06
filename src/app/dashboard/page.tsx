"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";

interface AnalyticsData {
  totalRuns: number;
  passedRuns: number;
  failedRuns: number;
  passRate: number;
  avgLatency: number;
}

interface Project {
  id: string;
  name: string;
  created_at: string;
}

export default function DashboardPage() {
  const supabase = createClient();
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);

  // New Project Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadDashboardData() {
    setLoading(true);

    // Load projects
    const { data: projectsData } = await supabase
      .from("projects")
      .select("*")
      .order("created_at", { ascending: false });

    if (projectsData) setProjects(projectsData);

    // Load analytics
    try {
      const res = await fetch("/api/analytics");
      const data = await res.json();
      if (res.ok && data.metrics) {
        setAnalytics(data.metrics);
      }
    } catch (err) {
      console.error("Failed to load analytics", err);
    }

    setLoading(false);
  }

  useEffect(() => {
    loadDashboardData();
  }, []);

  async function handleCreateProject(e: React.FormEvent) {
    e.preventDefault();
    if (!newProjectName.trim()) return;

    setCreating(true);

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        alert("You must be logged in to create a project.");
        setCreating(false);
        return;
      }

      const { data, error } = await supabase
        .from("projects")
        .insert({
          name: newProjectName.trim(),
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        alert(`Failed to create project: ${error.message}`);
      } else if (data) {
        setNewProjectName("");
        setIsModalOpen(false);
        await loadDashboardData();
      }
    } catch (err: any) {
      alert(`Unexpected error: ${err.message}`);
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteProject(projectId: string, projectName: string) {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${projectName}"? This action cannot be undone and will delete all associated test cases and runs.`
    );

    if (!confirmed) return;

    setDeletingId(projectId);

    try {
      const { error } = await supabase
        .from("projects")
        .delete()
        .eq("id", projectId);

      if (error) {
        alert(`Failed to delete project: ${error.message}`);
      } else {
        // Refresh project list & metrics
        await loadDashboardData();
      }
    } catch (err: any) {
      alert(`Error deleting project: ${err.message}`);
    } finally {
      setDeletingId(null);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex justify-center items-center">
        <p className="text-gray-500 text-sm">Loading AssertGrid dashboard...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header & Actions */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
            <p className="text-gray-500 text-sm mt-1">
              Overview of test suites and system health metrics
            </p>
          </div>
          <Button onClick={() => setIsModalOpen(true)} className="bg-blue-600 hover:bg-blue-700">
            + New Project
          </Button>
        </div>

        {/* Analytics Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-gray-500">
                Uptime / Pass Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {analytics ? `${analytics.passRate}%` : "100%"}
              </div>
              <p className="text-xs text-gray-400 mt-1">Overall suite pass ratio</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-gray-500">
                Avg Response Latency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                {analytics ? `${analytics.avgLatency} ms` : "0 ms"}
              </div>
              <p className="text-xs text-gray-400 mt-1">Average response time</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-gray-500">
                Total Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                {analytics?.totalRuns ?? 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">Historical test runs</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-semibold uppercase text-gray-500">
                Failed Executions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {analytics?.failedRuns ?? 0}
              </div>
              <p className="text-xs text-gray-400 mt-1">Tests requiring attention</p>
            </CardContent>
          </Card>
        </div>

        {/* Projects Listing Header */}
        <div className="space-y-4 pt-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-bold text-gray-800">
              Your Projects ({projects.length})
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsModalOpen(true)}
            >
              + Create Project
            </Button>
          </div>

          {projects.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <p className="text-gray-500 text-sm">No projects created yet.</p>
              <Button onClick={() => setIsModalOpen(true)} size="sm">
                Create First Project
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {projects.map((proj) => (
                <Card key={proj.id} className="hover:shadow-md transition-shadow relative">
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle className="text-lg font-bold">{proj.name}</CardTitle>
                    <Badge variant="outline">Active</Badge>
                  </CardHeader>
                  <CardContent className="flex justify-between items-center">
                    <span className="text-xs text-gray-400">
                      Created {new Date(proj.created_at).toLocaleDateString()}
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={deletingId === proj.id}
                        onClick={() => handleDeleteProject(proj.id, proj.name)}
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        {deletingId === proj.id ? "Deleting..." : "Delete"}
                      </Button>
                      <Link href={`/projects/${proj.id}`}>
                        <Button size="sm">Open Workspace →</Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* CREATE NEW PROJECT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex justify-center items-center p-4">
          <Card className="w-full max-w-md bg-white shadow-xl">
            <CardHeader>
              <CardTitle className="text-xl font-bold">Create New Project</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">
                    Project Name
                  </label>
                  <Input
                    type="text"
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="e.g. E-Commerce Web App"
                    autoFocus
                    required
                  />
                </div>

                <div className="flex justify-end gap-2 pt-3 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={creating || !newProjectName.trim()}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    {creating ? "Creating..." : "Create Project"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}