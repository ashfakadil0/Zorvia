import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Dumbbell, Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in to Zorvia" },
      { name: "description", content: "Sign in or create a free Zorvia account to sync your workouts, progress and streaks across devices." },
      { property: "og:title", content: "Sign in to Zorvia" },
      { property: "og:description", content: "Sync your training, progress and streaks across devices with a free Zorvia account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: AuthPage,
});

type Mode = "signin" | "signup" | "forgot";

function AuthPage() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [mode, setMode] = useState<Mode>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/", replace: true });
  }, [user, loading, navigate]);

  const onGoogle = async () => {
    setBusy(true);
    try {
      const { lovable } = await import("@/integrations/lovable/index");
      const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
      if (result.error) {
        toast.error("Google sign-in failed", { description: result.error.message ?? "Please try again." });
        setBusy(false);
        return;
      }
      if (result.redirected) return;
      void navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error("Google sign-in unavailable", { description: err instanceof Error ? err.message : undefined });
      setBusy(false);
    }
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "forgot") {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Reset link sent", { description: "Check your inbox for the password reset email." });
        setMode("signin");
        return;
      }
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Account created", { description: "You're signed in. Let's set up your profile." });
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      void navigate({ to: "/", replace: true });
    } catch (err) {
      toast.error(mode === "signup" ? "Sign-up failed" : "Sign-in failed", {
        description: err instanceof Error ? err.message : "Please check your details and try again.",
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-5 py-10">
      <div className="zv-animate-rise w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto grid size-14 place-items-center rounded-2xl bg-primary/15 text-primary shadow-glow">
            <Dumbbell className="size-7" aria-hidden="true" />
          </div>
          <h1 className="mt-4 font-display text-2xl font-extrabold tracking-tight">Zorvia</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "signup" ? "Create your training account." : mode === "forgot" ? "Reset your password." : "Welcome back. Let's train."}
          </p>
        </div>

        <div className="zv-panel space-y-4 p-5">
          <Button type="button" variant="outline" className="w-full" onClick={onGoogle} disabled={busy}>
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <span className="h-px flex-1 bg-border" />
            <span className="zv-eyebrow">or email</span>
            <span className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            {mode === "signup" ? (
              <div className="space-y-1.5">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required autoComplete="name" />
              </div>
            ) : null}

            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={255} required autoComplete="email" />
            </div>

            {mode !== "forgot" ? (
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                  maxLength={72}
                  required
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                />
                {mode === "signup" ? <p className="text-xs text-muted-foreground">At least 8 characters.</p> : null}
              </div>
            ) : null}

            <Button type="submit" className="w-full" disabled={busy}>
              {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
              {mode === "signup" ? "Create account" : mode === "forgot" ? "Send reset link" : "Sign in"}
            </Button>
          </form>

          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <button type="button" className="text-primary hover:underline" onClick={() => setMode(mode === "signup" ? "signin" : "signup")}>
              {mode === "signup" ? "I already have an account" : "Create an account"}
            </button>
            {mode !== "forgot" ? (
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setMode("forgot")}>
                Forgot password?
              </button>
            ) : (
              <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => setMode("signin")}>
                Back to sign in
              </button>
            )}
          </div>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground">
          You can also{" "}
          <Link to="/" className="text-primary hover:underline">
            keep training offline
          </Link>{" "}
          — your data stays on this device until you sign in.
        </p>
      </div>
    </div>
  );
}
