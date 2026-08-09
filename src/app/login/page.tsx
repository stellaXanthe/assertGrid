"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const supabase = createClient();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "signup" | "forgot">("login");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          router.push("/dashboard");
          router.refresh();
        }
      } else if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Account created! Check your email to confirm registration.");
        }
      } else if (mode === "forgot") {
        const redirectTo = `${window.location.origin}/reset-password`;

        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo,
        });

        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg("Password reset link sent! Please check your email inbox.");
        }
      }
    } catch {
      setErrorMsg("An unexpected error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-md shadow-md">
        <CardHeader className="text-center pb-4">
          <CardTitle className="text-2xl font-bold tracking-tight">
            AssertGrid
          </CardTitle>
        </CardHeader>

        <CardContent>
          {errorMsg && (
            <div className="mb-4 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md text-center">
              {errorMsg}
            </div>
          )}

          {successMsg && (
            <div className="mb-4 p-3 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md text-center">
              {successMsg}
            </div>
          )}

          <form onSubmit={handleAuth} className="space-y-4">
            <div>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@example.com"
                required
              />
            </div>

            {mode !== "forgot" && (
              <div>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  required
                />
                <div className="flex justify-end mt-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      setMode("forgot");
                      setErrorMsg(null);
                      setSuccessMsg(null);
                    }}
                    className="text-xs text-blue-600 hover:underline focus:outline-none"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
            )}

            {mode === "forgot" ? (
              <div className="space-y-2 pt-2">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Sending..." : "Send Reset Link"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setMode("login");
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                >
                  Back to Login
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 pt-2">
                <Button
                  type="submit"
                  variant={mode === "login" ? "default" : "outline"}
                  onClick={() => setMode("login")}
                  disabled={loading}
                >
                  {loading && mode === "login" ? "Logging in..." : "Login"}
                </Button>
                <Button
                  type="submit"
                  variant={mode === "signup" ? "default" : "outline"}
                  onClick={() => setMode("signup")}
                  disabled={loading}
                >
                  {loading && mode === "signup" ? "Signing up..." : "Sign Up"}
                </Button>
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  );
}