import { createFileRoute } from "@tanstack/react-router";
import { Download } from "lucide-react";
import { toast } from "sonner";
import { PageHeader, Panel, Stat, StatusBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { inr, toCSV } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — SahakarAI" },
      { name: "description", content: "Cooperative order report with assigned weavers, costs, negotiated prices, surplus estimates and escalations." },
      { property: "og:title", content: "Reports — SahakarAI" },
      { property: "og:description", content: "Exportable cooperative fulfilment report." },
    ],
  }),
  component: Reports,
});

function Reports() {
  const { state, report } = useStore();
  const totals = report.reduce((a, r) => ({ cost: a.cost + r.productionCost, rev: a.rev + r.revenue, sur: a.sur + r.surplus }), { cost: 0, rev: 0, sur: 0 });
  const exportCsv = () => {
    try {
      const blob = new Blob([toCSV(report)], { type: "text/csv;charset=utf-8" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `sahakarai-report-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("CSV exported");
    } catch {
      toast.error("Could not export CSV. Please try again.");
    }
  };
  return (
    <>
      <PageHeader title="Cooperative report" description="Projected figures are estimates based on fictional demo data — not actual financial results. Prices marked “Estimated” use the target price until a negotiation is accepted.">
        <Button onClick={exportCsv} disabled={report.length === 0}><Download className="mr-2 h-4 w-4" />Export CSV</Button>
      </PageHeader>
      <div className="grid gap-4 md:grid-cols-3">
        <Stat label="Production cost" value={inr(totals.cost)} />
        <Stat label="Projected revenue (estimate)" value={inr(totals.rev)} />
        <Stat label="Projected surplus (estimate)" value={inr(totals.sur)} />
      </div>
      <Panel title="Orders" className="mt-6">
        {report.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No orders to report.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="pb-2">Order</th><th>Qty / allocated</th><th>Assigned weavers</th><th>Cost</th><th>Price/m</th><th>Surplus (est.)</th><th>Fulfilment</th><th>Status</th></tr>
              </thead>
              <tbody>
                {report.map((r) => (
                  <tr key={r.orderId} className="border-t border-border align-top">
                    <td className="py-2"><div className="font-medium">{r.orderId}</div><div className="text-xs text-muted-foreground">{r.buyer}<br />{r.textile}</div></td>
                    <td>{r.quantity} / {r.allocated} m</td>
                    <td className="max-w-xs text-xs">{r.weavers || "—"}</td>
                    <td>{inr(r.productionCost)}</td>
                    <td>{r.price ? inr(r.price) : "—"}<div className="text-xs text-muted-foreground">{r.priceBasis}</div></td>
                    <td>{inr(r.surplus)}</td>
                    <td>{r.fulfilmentPct}%</td>
                    <td><StatusBadge status={r.status} />{r.escalation && <div className="mt-1 max-w-[12rem] text-xs text-warning">{r.escalation}</div>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <Panel title="Escalation log" className="mt-6">
        {state.escalations.length === 0 ? <p className="text-sm text-muted-foreground">No escalations recorded yet.</p> : (
          <ul className="space-y-2 text-sm">
            {state.escalations.map((e) => (
              <li key={e.id} className="rounded-md border border-warning/40 bg-warning/10 p-3">
                <div className="text-xs text-muted-foreground">{new Date(e.at).toLocaleString()} · {e.orderId} · buyer offer {inr(e.price)}/m</div>
                {e.reason}
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
