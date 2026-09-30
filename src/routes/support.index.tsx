import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/SiteHeader";

export const Route = createFileRoute("/support/")({
  head: () => ({
    meta: [
      { title: "Customer Support — Atelier" },
      { name: "description", content: "Chat with Stitch to track orders, request refunds or reset your password." },
      { property: "og:title", content: "Customer Support — Atelier" },
      { property: "og:description", content: "Chat with Stitch to track orders, request refunds or reset your password." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: () => (
    <RequireAuth>
      <SupportRedirect />
    </RequireAuth>
  ),
});

function SupportRedirect() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const started = useRef(false);
  useEffect(() => {
    if (!user || started.current) return;
    started.current = true;
    (async () => {
      const { data: latest } = await supabase.from("support_threads").select("id").order("updated_at", { ascending: false }).limit(1).maybeSingle();
      let id = latest?.id;
      if (!id) {
        const { data } = await supabase.from("support_threads").insert({ user_id: user.id }).select("id").single();
        id = data?.id;
      }
      if (id) navigate({ to: "/support/$threadId", params: { threadId: id }, replace: true });
    })();
  }, [user, navigate]);
  return <p className="p-10 text-center text-muted-foreground">Opening support…</p>;
}
