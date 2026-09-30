import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set New Password — Atelier" },
      { name: "description", content: "Choose a new password for your Atelier account." },
      { property: "og:title", content: "Set New Password — Atelier" },
      { property: "og:description", content: "Choose a new password for your Atelier account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  return (
    <main className="mx-auto max-w-sm px-4 py-16">
      <h1 className="text-4xl">New password</h1>
      <form
        className="mt-8 space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          const { error } = await supabase.auth.updateUser({ password: pw });
          setBusy(false);
          if (error) {
            toast.error(error.message);
            return;
          }
          toast.success("Password updated");
          navigate({ to: "/" });
        }}
      >
        <div><Label htmlFor="pw">New password</Label><Input id="pw" type="password" minLength={6} required value={pw} onChange={(e) => setPw(e.target.value)} className="mt-1" /></div>
        <Button type="submit" className="w-full" disabled={busy}>Save password</Button>
      </form>
    </main>
  );
}
