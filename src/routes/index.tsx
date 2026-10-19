import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, Check } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Stat, StatusBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { inr, TEXTILES } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Overview — SahakarAI Cooperative Intelligence" },
      { name: "description", content: "Dashboard for weaver cooperatives: capacity, bulk orders, demand forecasts and fair-price negotiation." },
      { property: "og:title", content: "SahakarAI — Cooperative Overview" },
      { property: "og:description", content: "Help handloom cooperatives pool capacity and bargain for fair prices." },
    ],
  }),
  component: Overview,
});

function Overview() {
  const { state, alloc, forecasts, report, dispatch } = useStore();
  const capacity = state.weavers.reduce((a, w) => a + (w.capacity || 0), 0);
  const openOrders = state.orders.filter((o) => state.negotiations[o.id]?.status !== "accepted" && state.negotiations[o.id]?.status !== "rejected").length;
  const fcNext = TEXTILES.reduce((a, t) => a + (forecasts[t].points[0]?.value ?? 0), 0);
  const revenue = report.reduce((a, r) => a + r.revenue, 0);
  const surplus = report.reduce((a, r) => a + r.surplus, 0);
  const allocatedAny = Object.values(alloc.plans).some((p) => p.allocated > 0);
  const negStarted = Object.values(state.negotiations).some((n) => n.rounds.length > 1 || n.status !== "open");
  const allClosed = state.orders.length > 0 && state.orders.every((o) => state.negotiations[o.id]?.status !== "open");

  const steps = [
    { label: "Forecast demand", to: "/forecasting", done: true, note: `${fcNext.toLocaleString("en-IN")} m expected next month` },
    { label: "Aggregate capacity", to: "/capacity", done: capacity > 0, note: `${capacity.toLocaleString("en-IN")} m/month pooled` },
    { label: "Match bulk orders", to: "/orders", done: allocatedAny && state.planConfirmed, note: state.planConfirmed ? "Allocation plan confirmed" : "Plan awaiting confirmation" },
    { label: "Negotiate fair price", to: "/negotiation", done: negStarted, note: negStarted ? "Negotiations in progress" : "Not started" },
    { label: "Confirm fulfilment", to: "/reports", done: allClosed, note: allClosed ? "All orders resolved" : "Orders still open" },
  ] as const;

  return (
    <>
      <PageHeader title="Cooperative overview" description="Pool capacity across 20 fictional Tamil Nadu weavers, match bulk orders, and negotiate prices that never fall below what weavers need. All projections are estimates." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Stat label="Registered weavers" value={state.weavers.length} hint="Fictional demo members" />
        <Stat label="Total available capacity" value={`${capacity.toLocaleString("en-IN")} m`} hint="Per month, all textiles" />
        <Stat label="Open bulk orders" value={openOrders} hint={`${state.orders.length} orders total`} />
        <Stat label="Forecast demand (next month)" value={`${fcNext.toLocaleString("en-IN")} m`} hint="Baseline forecast, all categories" />
        <Stat label="Projected revenue" value={inr(revenue)} hint="Estimate — negotiated or target prices" />
        <Stat label="Projected surplus" value={inr(surplus)} hint="Estimate after production costs" />
      </div>

      <Panel title="Cooperative workflow" className="mt-8">
        <ol className="grid gap-3 md:grid-cols-5">
          {steps.map((s, i) => (
            <li key={s.label} className="relative">
              <Link to={s.to} className="block h-full rounded-md border border-border p-4 transition-colors hover:border-accent">
                <div className="flex items-center gap-2">
                  <span className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${s.done ? "bg-accent text-accent-foreground" : "border border-border text-muted-foreground"}`}>
                    {s.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <span className="text-sm font-medium">{s.label}</span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{s.note}</p>
              </Link>
              {i < 4 && <ArrowRight className="absolute -right-3 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-muted-foreground md:block" />}
            </li>
          ))}
        </ol>
        <div className="mt-4 flex flex-wrap gap-2">
          <Button onClick={() => {
            dispatch({ type: "confirmPlan", value: true });
            const lines = state.orders.map((o) => { const p = alloc.plans[o.id]; return `${o.id}: ${p.allocated}/${o.quantity} m from ${p.allocations.length} weavers`; });
            dispatch({ type: "log", agent: "Aggregation", message: `Allocation plan confirmed. ${lines.join("; ")}.` });
            toast.success("Allocation plan confirmed");
          }}>Run aggregation &amp; confirm plan</Button>
          <Button variant="outline" asChild><Link to="/negotiation">Open negotiation lab</Link></Button>
        </div>
      </Panel>

      <div className="mt-8 grid gap-6 lg:grid-cols-5">
        <Panel title="Orders at a glance" className="lg:col-span-3">
          {report.length === 0 ? <p className="text-sm text-muted-foreground">No orders yet. Add one on the Bulk Orders page.</p> : (
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Order</th><th>Fulfilment</th><th>Price</th><th>Status</th></tr></thead>
              <tbody>
                {report.map((r) => (
                  <tr key={r.orderId} className="border-t border-border">
                    <td className="py-2"><div className="font-medium">{r.orderId}</div><div className="text-xs text-muted-foreground">{r.textile}</div></td>
                    <td>{r.fulfilmentPct}%</td>
                    <td>{r.price ? `${inr(r.price)}/m` : "—"}<div className="text-xs text-muted-foreground">{r.priceBasis}</div></td>
                    <td><StatusBadge status={r.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Panel>
        <Panel title="Agent activity" className="lg:col-span-2">
          <ul className="max-h-80 space-y-3 overflow-y-auto pr-1">
            {state.activity.map((a) => (
              <li key={a.id} className="border-l-2 border-accent/40 pl-3 text-sm">
                <div className="text-xs text-muted-foreground">{a.agent} agent · {new Date(a.at).toLocaleTimeString()}</div>
                <div>{a.message}</div>
              </li>
            ))}
          </ul>
        </Panel>
      </div>
    </>
  );
}
