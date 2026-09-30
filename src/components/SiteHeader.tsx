import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingBag, MessageCircle, Package, LogOut } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export function SiteHeader() {
  const { user } = useAuth();
  const { count } = useCart();
  const navigate = useNavigate();
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link to="/" className="font-display text-2xl italic tracking-tight">
          Atelier<span className="text-accent">.</span>
        </Link>
        <nav className="flex items-center gap-1 text-sm">
          {user && (
            <Link to="/orders" className="flex items-center gap-1.5 rounded px-3 py-2 hover:bg-muted">
              <Package className="h-4 w-4" /> <span className="hidden sm:inline">Orders</span>
            </Link>
          )}
          <Link to="/support" className="flex items-center gap-1.5 rounded px-3 py-2 hover:bg-muted">
            <MessageCircle className="h-4 w-4" /> <span className="hidden sm:inline">Help</span>
          </Link>
          <Link to="/cart" className="relative flex items-center gap-1.5 rounded px-3 py-2 hover:bg-muted">
            <ShoppingBag className="h-4 w-4" />
            <span className="hidden sm:inline">Bag</span>
            {count > 0 && (
              <span className="ml-1 rounded-full bg-accent px-1.5 text-xs text-accent-foreground">{count}</span>
            )}
          </Link>
          {user ? (
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Sign out"
              onClick={async () => {
                await supabase.auth.signOut();
                navigate({ to: "/" });
              }}
            >
              <LogOut className="h-4 w-4" />
            </Button>
          ) : (
            <Button asChild size="sm" className="ml-2">
              <Link to="/auth">Sign in</Link>
            </Button>
          )}
        </nav>
      </div>
    </header>
  );
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="p-10 text-center text-muted-foreground">Loading…</div>;
  if (!user)
    return (
      <div className="mx-auto max-w-md px-4 py-20 text-center">
        <h1 className="text-3xl">Please sign in</h1>
        <p className="mt-2 text-muted-foreground">You need an account to see this page.</p>
        <Button asChild className="mt-6">
          <Link to="/auth">Sign in or create account</Link>
        </Button>
      </div>
    );
  return <>{children}</>;
}
