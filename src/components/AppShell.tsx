import { Link, useRouterState } from "@tanstack/react-router";
import { BarChart3, FileText, Handshake, LayoutDashboard, Package, RotateCcw, Users } from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import { useStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

const NAV = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/forecasting", label: "Demand Forecasting", icon: BarChart3 },
  { to: "/capacity", label: "Cooperative Capacity", icon: Users },
  { to: "/orders", label: "Bulk Orders", icon: Package },
  { to: "/negotiation", label: "Negotiation Lab", icon: Handshake },
  { to: "/reports", label: "Reports", icon: FileText },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const { dispatch, ready } = useStore();
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground md:flex">
        <div className="border-b border-sidebar-border px-6 py-6">
          <div className="font-serif text-2xl">SahakarAI</div>
          <div className="mt-1 text-xs leading-snug text-sidebar-foreground/70">Cooperative Intelligence &amp; Collective Bargaining</div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4">
          {NAV.map((n) => {
            const active = n.to === "/" ? path === "/" : path.startsWith(n.to);
            return (
              <Link key={n.to} to={n.to}
                className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors ${active ? "bg-sidebar-accent text-sidebar-accent-foreground" : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60"}`}>
                <n.icon className={`h-4 w-4 ${active ? "text-sidebar-primary" : ""}`} />
                {n.label}
              </Link>
            );
          })}
        </nav>
        <div className="m-3 rounded-md border border-sidebar-border p-3 text-xs text-sidebar-foreground/70">
          Simulation-backed MVP. Agents run transparent rule-based logic on fictional demo data — not autonomous AI.
        </div>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-3 md:px-8">
          <nav className="flex gap-1 overflow-x-auto md:hidden">
            {NAV.map((n) => (
              <Link key={n.to} to={n.to} className="whitespace-nowrap rounded px-2 py-1 text-xs text-muted-foreground" activeProps={{ className: "bg-secondary text-foreground" }} activeOptions={{ exact: n.to === "/" }}>{n.label}</Link>
            ))}
          </nav>
          <span className="hidden rounded-full border border-border bg-secondary px-3 py-1 text-xs text-muted-foreground md:inline">Fictional demonstration data · Tamil Nadu weaver cooperative</span>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="outline" size="sm"><RotateCcw className="mr-2 h-4 w-4" />Reset demo data</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Reset demo data?</AlertDialogTitle>
                <AlertDialogDescription>All edits, negotiations and escalations will be replaced by the original seeded scenario.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => { dispatch({ type: "reset" }); toast.success("Demo data restored"); }}>Reset</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </header>
        <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-8 md:px-8">
          {ready ? children : (
            <div className="space-y-4" aria-busy="true">
              <div className="h-8 w-64 animate-pulse rounded bg-muted" />
              <div className="grid gap-4 md:grid-cols-3">{[0, 1, 2].map((i) => <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />)}</div>
              <p className="text-sm text-muted-foreground">Loading cooperative data…</p>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export function PageHeader({ title, description, agent, children }: { title: string; description: string; agent?: string; children?: ReactNode }) {
  return (
    <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
      <div>
        {agent && <div className="mb-2 text-xs font-medium uppercase tracking-widest text-accent">{agent}</div>}
        <h1 className="text-3xl text-foreground">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function Stat({ label, value, hint }: { label: string; value: ReactNode; hint?: string }) {
  return (
    <div className="rounded-lg border border-border bg-card p-5">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-2 font-serif text-2xl text-foreground">{value}</div>
      {hint && <div className="mt-1 text-xs text-muted-foreground">{hint}</div>}
    </div>
  );
}

export function Panel({ title, children, action, className = "" }: { title?: string; children: ReactNode; action?: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-border bg-card ${className}`}>
      {title && (
        <div className="flex items-center justify-between border-b border-border px-5 py-3">
          <h2 className="text-lg">{title}</h2>
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </section>
  );
}

const STATUS_STYLE: Record<string, string> = {
  accepted: "bg-success/15 text-success border-success/30",
  escalated: "bg-warning/15 text-warning border-warning/40",
  rejected: "bg-destructive/10 text-destructive border-destructive/30",
  open: "bg-accent/10 text-accent border-accent/30",
};
export function StatusBadge({ status }: { status: string }) {
  return <span className={`inline-flex rounded-full border px-2 py-0.5 text-xs capitalize ${STATUS_STYLE[status] ?? "bg-muted text-muted-foreground border-border"}`}>{status}</span>;
}

export function NumField({ label, value, onChange, min, max, step = 1, suffix }: { label: string; value: number; onChange: (v: number) => void; min?: number; max?: number; step?: number; suffix?: string }) {
  const invalid = !Number.isFinite(value) || (min != null && value < min) || (max != null && value > max);
  return (
    <label className="block text-sm">
      <span className="text-muted-foreground">{label}</span>
      <div className="mt-1 flex items-center gap-2">
        <input type="number" value={Number.isFinite(value) ? value : ""} min={min} max={max} step={step}
          onChange={(e) => onChange(e.target.value === "" ? NaN : Number(e.target.value))}
          className={`w-full rounded-md border bg-background px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-ring ${invalid ? "border-destructive" : "border-input"}`} />
        {suffix && <span className="text-xs text-muted-foreground">{suffix}</span>}
      </div>
      {invalid && <span className="text-xs text-destructive">Enter a value{min != null ? ` ≥ ${min}` : ""}{max != null ? ` and ≤ ${max}` : ""}.</span>}
    </label>
  );
}
