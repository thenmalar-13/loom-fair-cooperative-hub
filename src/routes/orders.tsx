import { createFileRoute } from "@tanstack/react-router";
import { Trash2 } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { NumField, PageHeader, Panel } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { inr, TEXTILE_LABEL, TEXTILES, type Order, type Textile } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/orders")({
  head: () => ({
    meta: [
      { title: "Bulk Orders — SahakarAI" },
      { name: "description", content: "Match bulk buyer orders to compatible weavers and build an allocation plan." },
      { property: "og:title", content: "Bulk Orders — SahakarAI" },
      { property: "og:description", content: "Transparent order-to-weaver allocation for cooperatives." },
    ],
  }),
  component: Orders,
});

const blank = { buyer: "", textile: "cotton" as Textile, quantity: 500, targetPrice: 210, deadlineDays: 30, minFulfilmentPct: 80 };

function Orders() {
  const { state, alloc, dispatch } = useStore();
  const [form, setForm] = useState(blank);
  const wmap = Object.fromEntries(state.weavers.map((w) => [w.id, w]));
  const formErr = !form.buyer.trim() ? "Buyer name is required." : !(form.quantity > 0) ? "Quantity must be positive." : !(form.targetPrice > 0) ? "Target price must be positive." : !(form.deadlineDays > 0) ? "Deadline must be positive." : !(form.minFulfilmentPct > 0 && form.minFulfilmentPct <= 100) ? "Minimum fulfilment must be 1–100%." : null;

  const upd = (o: Order, patch: Partial<Order>) => {
    const v = Object.values(patch)[0] as number;
    if (!Number.isFinite(v) || v <= 0) return;
    dispatch({ type: "updateOrder", id: o.id, patch });
  };

  return (
    <>
      <PageHeader agent="Agent 2 · Aggregation" title="Bulk orders & allocation" description="Orders are processed by earliest deadline. For each, only weavers of the same textile who can deliver in time are eligible; they are filled lowest minimum price first, up to their remaining capacity.">
        <Button onClick={() => {
          dispatch({ type: "confirmPlan", value: true });
          dispatch({ type: "log", agent: "Aggregation", message: `Allocation plan created for ${state.orders.length} orders using ${new Set(Object.values(alloc.plans).flatMap((p) => p.allocations.map((a) => a.weaverId))).size} weavers.` });
          toast.success("Allocation plan created");
        }} disabled={state.orders.length === 0}>{state.planConfirmed ? "Plan confirmed ✓ — recreate" : "Create allocation plan"}</Button>
      </PageHeader>

      {state.orders.length === 0 && <Panel><p className="py-8 text-center text-sm text-muted-foreground">No bulk orders. Add one below or reset the demo data.</p></Panel>}

      <div className="space-y-6">
        {state.orders.map((o) => {
          const p = alloc.plans[o.id];
          return (
            <Panel key={o.id} title={`${o.id} · ${o.buyer}`} action={
              <Button variant="ghost" size="sm" onClick={() => { dispatch({ type: "removeOrder", id: o.id }); toast(`${o.id} removed`); }}><Trash2 className="h-4 w-4" /></Button>
            }>
              <div className="grid gap-6 lg:grid-cols-3">
                <div className="space-y-3">
                  <div className="text-sm"><span className="text-muted-foreground">Textile:</span> {TEXTILE_LABEL[o.textile]}</div>
                  <NumField label="Quantity (m)" min={1} value={o.quantity} onChange={(v) => upd(o, { quantity: v })} />
                  <NumField label="Buyer target price (₹/m)" min={1} value={o.targetPrice} onChange={(v) => upd(o, { targetPrice: v })} />
                  <NumField label="Deadline (days)" min={1} value={o.deadlineDays} onChange={(v) => upd(o, { deadlineDays: v })} />
                  <NumField label="Min. fulfilment required (%)" min={1} max={100} value={o.minFulfilmentPct} onChange={(v) => v <= 100 && upd(o, { minFulfilmentPct: v })} />
                </div>
                <div className="lg:col-span-2">
                  <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                    <Mini label="Allocated" value={`${p.allocated} / ${o.quantity} m`} />
                    <Mini label="Fulfilment" value={`${p.fulfilmentPct.toFixed(0)}%`} warn={!p.feasible} />
                    <Mini label="Production cost" value={inr(p.totalCost)} />
                    <Mini label="Avg cost / floor" value={`${inr(p.avgCost)} / ${inr(p.floorPrice)}`} />
                  </div>
                  <div className="mt-2 h-2 rounded bg-muted"><div className={`h-2 rounded ${p.feasible ? "bg-accent" : "bg-warning"}`} style={{ width: `${Math.min(100, p.fulfilmentPct)}%` }} /></div>
                  {!p.feasible && <p className="mt-2 text-xs text-warning">{p.allocated === 0 ? "No eligible capacity." : `Below the buyer's ${o.minFulfilmentPct}% minimum — negotiation will escalate.`}</p>}
                  {p.allocations.length > 0 ? (
                    <table className="mt-4 w-full text-sm">
                      <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-1">Weaver</th><th>Village</th><th>Qty (m)</th><th>Cost ₹/m</th><th>Min ₹/m</th></tr></thead>
                      <tbody>{p.allocations.map((a) => (
                        <tr key={a.weaverId} className="border-t border-border"><td className="py-1.5">{a.weaverId} · {wmap[a.weaverId]?.name}</td><td>{wmap[a.weaverId]?.village}</td><td>{a.quantity}</td><td>{a.cost}</td><td>{a.minPrice}</td></tr>
                      ))}</tbody>
                    </table>
                  ) : <p className="mt-4 text-sm text-muted-foreground">No weavers allocated.</p>}
                  {p.excluded.length > 0 && (
                    <details className="mt-3 text-xs text-muted-foreground">
                      <summary className="cursor-pointer">{p.excluded.length} same-textile weavers excluded</summary>
                      <ul className="mt-1 space-y-0.5">{p.excluded.map((e) => <li key={e.weaverId}>{e.weaverId} {wmap[e.weaverId]?.name}: {e.reason}</li>)}</ul>
                    </details>
                  )}
                </div>
              </div>
            </Panel>
          );
        })}
      </div>

      <Panel title="Add a bulk order" className="mt-8">
        <div className="grid gap-4 md:grid-cols-3">
          <label className="block text-sm"><span className="text-muted-foreground">Buyer</span>
            <input value={form.buyer} onChange={(e) => setForm({ ...form, buyer: e.target.value })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" placeholder="e.g. Madurai Garments" /></label>
          <label className="block text-sm"><span className="text-muted-foreground">Textile</span>
            <select value={form.textile} onChange={(e) => setForm({ ...form, textile: e.target.value as Textile })} className="mt-1 w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm">
              {TEXTILES.map((t) => <option key={t} value={t}>{TEXTILE_LABEL[t]}</option>)}
            </select></label>
          <NumField label="Quantity (m)" min={1} value={form.quantity} onChange={(v) => setForm({ ...form, quantity: v })} />
          <NumField label="Target price (₹/m)" min={1} value={form.targetPrice} onChange={(v) => setForm({ ...form, targetPrice: v })} />
          <NumField label="Deadline (days)" min={1} value={form.deadlineDays} onChange={(v) => setForm({ ...form, deadlineDays: v })} />
          <NumField label="Min. fulfilment (%)" min={1} max={100} value={form.minFulfilmentPct} onChange={(v) => setForm({ ...form, minFulfilmentPct: v })} />
        </div>
        {formErr && <p className="mt-3 text-xs text-destructive">{formErr}</p>}
        <Button className="mt-4" disabled={!!formErr} onClick={() => {
          const n = Math.max(100, ...state.orders.map((o) => Number(o.id.split("-")[1]) || 0)) + 1;
          dispatch({ type: "addOrder", order: { id: `ORD-${n}`, ...form, buyer: form.buyer.trim() } });
          dispatch({ type: "log", agent: "Aggregation", message: `New order ORD-${n} for ${form.quantity} m of ${TEXTILE_LABEL[form.textile]} added; allocations recalculated.` });
          setForm(blank);
          toast.success(`Order ORD-${n} added`);
        }}>Add order</Button>
      </Panel>
    </>
  );
}

function Mini({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return <div className="rounded-md border border-border p-3"><div className="text-xs text-muted-foreground">{label}</div><div className={`mt-1 text-sm font-medium ${warn ? "text-warning" : ""}`}>{value}</div></div>;
}
