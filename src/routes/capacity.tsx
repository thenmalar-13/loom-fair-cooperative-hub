import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { PageHeader, Panel, Stat } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { inr, TEXTILE_LABEL, TEXTILES, type Textile } from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/capacity")({
  head: () => ({
    meta: [
      { title: "Cooperative Capacity — SahakarAI" },
      { name: "description", content: "Pooled weaver capacity, costs, floor prices and delivery availability." },
      { property: "og:title", content: "Cooperative Capacity — SahakarAI" },
      { property: "og:description", content: "See and edit each weaver's capacity and minimum price." },
    ],
  }),
  component: Capacity,
});

function Capacity() {
  const { state, alloc, dispatch } = useStore();
  const [filter, setFilter] = useState<Textile | "all">("all");
  const [q, setQ] = useState("");
  const rows = state.weavers.filter((w) => (filter === "all" || w.textile === filter) && `${w.id} ${w.name} ${w.village}`.toLowerCase().includes(q.toLowerCase()));
  const chart = TEXTILES.map((t) => {
    const ws = state.weavers.filter((w) => w.textile === t);
    const cap = ws.reduce((a, w) => a + (w.capacity || 0), 0);
    const used = ws.reduce((a, w) => a + (alloc.used[w.id] || 0), 0);
    return { name: TEXTILE_LABEL[t], Allocated: used, Free: cap - used };
  });
  const upd = (id: string, key: "capacity" | "cost" | "minPrice" | "leadTimeDays", v: string) => {
    const n = Number(v);
    if (v === "" || !Number.isFinite(n) || n < 0) return;
    dispatch({ type: "updateWeaver", id, patch: { [key]: n } });
  };

  return (
    <>
      <PageHeader agent="Agent 2 · Aggregation" title="Cooperative capacity" description="Each weaver's monthly capacity, cost and minimum acceptable price. Edit values to see allocations recompute instantly — the agent never assigns more than a weaver can produce." />
      <div className="grid gap-4 md:grid-cols-3">
        {chart.map((c) => <Stat key={c.name} label={c.name} value={`${(c.Allocated + c.Free).toLocaleString("en-IN")} m`} hint={`${c.Allocated.toLocaleString("en-IN")} m allocated · ${c.Free.toLocaleString("en-IN")} m free`} />)}
      </div>
      <Panel title="Capacity utilisation" className="mt-6">
        <div className="h-64">
          <ResponsiveContainer>
            <BarChart data={chart}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="name" tick={{ fontSize: 12 }} /><YAxis tick={{ fontSize: 12 }} /><Tooltip /><Legend />
              <Bar dataKey="Allocated" stackId="a" fill="var(--color-chart-1)" />
              <Bar dataKey="Free" stackId="a" fill="var(--color-chart-2)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <Panel title="Weaver register (fictional)" className="mt-6">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {(["all", ...TEXTILES] as const).map((t) => (
            <Button key={t} size="sm" variant={filter === t ? "default" : "outline"} onClick={() => setFilter(t)}>{t === "all" ? "All" : TEXTILE_LABEL[t]}</Button>
          ))}
          <input placeholder="Search name, ID, village" value={q} onChange={(e) => setQ(e.target.value)} className="ml-auto rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
        </div>
        {rows.length === 0 ? <p className="py-8 text-center text-sm text-muted-foreground">No weavers match this filter.</p> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs text-muted-foreground">
                <tr><th className="pb-2">ID</th><th>Weaver</th><th>Textile</th><th>Capacity (m/mo)</th><th>Cost ₹/m</th><th>Min price ₹/m</th><th>Lead time (days)</th><th>Allocated</th></tr>
              </thead>
              <tbody>
                {rows.map((w) => {
                  const used = alloc.used[w.id] || 0;
                  return (
                    <tr key={w.id} className="border-t border-border">
                      <td className="py-2 font-mono text-xs">{w.id}</td>
                      <td><div>{w.name}</div><div className="text-xs text-muted-foreground">{w.village}</div></td>
                      <td>{TEXTILE_LABEL[w.textile]}</td>
                      {(["capacity", "cost", "minPrice", "leadTimeDays"] as const).map((k) => (
                        <td key={k}><input type="number" min={0} defaultValue={w[k]} key={`${w.id}-${k}-${w[k]}`} onBlur={(e) => upd(w.id, k, e.target.value)} onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()} className="w-20 rounded border border-input bg-background px-2 py-1" /></td>
                      ))}
                      <td>
                        <div className="text-xs">{used} / {w.capacity}</div>
                        <div className="mt-1 h-1.5 w-20 rounded bg-muted"><div className="h-1.5 rounded bg-accent" style={{ width: `${w.capacity ? (used / w.capacity) * 100 : 0}%` }} /></div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <p className="mt-3 text-xs text-muted-foreground">Edits apply when you leave a field. Margin over cost for the cheapest weaver in view: {rows.length ? inr(Math.min(...rows.map((w) => w.minPrice - w.cost))) : "—"}/m.</p>
      </Panel>
    </>
  );
}
