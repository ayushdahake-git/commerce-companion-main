import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign In — Atelier" },
      { name: "description", content: "Sign in or create an Atelier account." },
      { property: "og:title", content: "Sign In — Atelier" },
      { property: "og:description", content: "Sign in or create an Atelier account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const [mode, setMode] = useState<"in" | "up" | "forgot">("in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [busy, setBusy] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const saved = window.localStorage.getItem("atelier-auth-email");
    if (saved) {
      setEmail(saved);
      setRememberMe(true);
    }
  }, []);

  useEffect(() => {
    if (rememberMe && email.trim()) {
      window.localStorage.setItem("atelier-auth-email", email.trim());
      return;
    }
    window.localStorage.removeItem("atelier-auth-email");
  }, [email, rememberMe]);

  useEffect(() => {
    if (user) navigate({ to: "/" });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === "in") {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      } else if (mode === "up") {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { emailRedirectTo: window.location.origin, data: { full_name: name } },
        });
        if (error) throw error;
        toast.success("Check your email to confirm your account.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        toast.success("Password reset link sent to your email.");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-4xl">{mode === "in" ? "Welcome back" : mode === "up" ? "Create account" : "Reset password"}</h1>
      <form onSubmit={submit} className="mt-8 space-y-4">
        {mode === "up" && (
          <div><Label htmlFor="name">Name</Label><Input id="name" value={name} onChange={(e) => setName(e.target.value)} className="mt-1" /></div>
        )}
        <div><Label htmlFor="email">Email</Label><Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="mt-1" /></div>
        {mode !== "forgot" && (
          <div><Label htmlFor="pw">Password</Label><Input id="pw" type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1" /></div>
        )}
        {mode === "in" && (
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input type="checkbox" checked={rememberMe} onChange={(e) => setRememberMe(e.target.checked)} />
            Remember email
          </label>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {mode === "in" ? "Sign in" : mode === "up" ? "Create account" : "Send reset link"}
        </Button>
      </form>
      {mode !== "forgot" && (
        <Button
          variant="outline"
          className="mt-3 w-full"
          onClick={async () => {
            const r = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
            if (r.error) toast.error(r.error.message);
          }}
        >
          Continue with Google
        </Button>
      )}
      <div className="mt-6 space-y-2 text-center text-sm">
        {mode === "in" && (
          <>
            <button className="underline" onClick={() => setMode("forgot")}>Forgot password?</button>
            <p>New here? <button className="underline" onClick={() => setMode("up")}>Create an account</button></p>
          </>
        )}
        {mode !== "in" && <button className="underline" onClick={() => setMode("in")}>Back to sign in</button>}
      </div>
    </main>
  );
}
