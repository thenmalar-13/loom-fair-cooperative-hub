import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { toast } from "sonner";
import { NumField, PageHeader, Panel, Stat } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { TEXTILE_LABEL, TEXTILES, type Textile } from "@/lib/engine";
import { MONTHS } from "@/lib/seed";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/forecasting")({
  head: () => ({
    meta: [
      { title: "Demand Forecasting — SahakarAI" },
      { name: "description", content: "Transparent baseline demand forecasts for cotton, silk and towel handloom categories." },
      { property: "og:title", content: "Demand Forecasting — SahakarAI" },
      { property: "og:description", content: "Configurable baseline forecasts with uncertainty bands." },
    ],
  }),
  component: Forecasting,
});

function Forecasting() {
  const { state, forecasts, dispatch } = useStore();
  const [cat, setCat] = useState<Textile>("cotton");
  const s = state.forecastSettings;
  const [draft, setDraft] = useState(s);
  const valid = draft.horizon >= 1 && draft.horizon <= 12 && draft.window >= 2 && draft.window <= 12 && draft.trendWeight >= 0 && draft.trendWeight <= 1 && draft.adjustmentPct >= -50 && draft.adjustmentPct <= 50;
  const f = forecasts[cat];
  const hist = state.history[cat];
  const data = [
    ...hist.map((v, i) => ({ month: MONTHS[i], actual: v })),
    ...f.points.map((p) => ({ month: `+${p.step}m`, forecast: p.value, band: [p.low, p.high] as [number, number] })),
  ];
  data[hist.length - 1] = { ...data[hist.length - 1], forecast: hist[hist.length - 1] } as never;

  return (
    <>
      <PageHeader agent="Agent 1 · Forecasting" title="Demand forecasting" description="Baseline forecast = average of the most recent months (level) + weighted linear trend from all history, scaled by your market assumption. The shaded band is an ~80% range from historical residual variation." />
      <Panel title="Assumptions">
        <div className="grid gap-4 md:grid-cols-4">
          <NumField label="Forecast horizon" suffix="months" min={1} max={12} value={draft.horizon} onChange={(v) => setDraft({ ...draft, horizon: v })} />
          <NumField label="Level window" suffix="months" min={2} max={12} value={draft.window} onChange={(v) => setDraft({ ...draft, window: v })} />
          <NumField label="Trend weight" min={0} max={1} step={0.1} value={draft.trendWeight} onChange={(v) => setDraft({ ...draft, trendWeight: v })} />
          <NumField label="Market adjustment" suffix="%" min={-50} max={50} value={draft.adjustmentPct} onChange={(v) => setDraft({ ...draft, adjustmentPct: v })} />
        </div>
        <div className="mt-4 flex gap-2">
          <Button disabled={!valid} onClick={() => {
            dispatch({ type: "forecastSettings", patch: draft });
            dispatch({ type: "log", agent: "Forecasting", message: `Recalculated forecasts: ${draft.horizon}-month horizon, ${draft.window}-month level, trend weight ${draft.trendWeight}, adjustment ${draft.adjustmentPct}%.` });
            toast.success("Forecast recalculated");
          }}>Recalculate forecast</Button>
          <Button variant="ghost" onClick={() => setDraft(s)}>Discard changes</Button>
        </div>
      </Panel>

      <div className="mt-6 flex flex-wrap gap-2">
        {TEXTILES.map((t) => (
          <Button key={t} variant={t === cat ? "default" : "outline"} size="sm" onClick={() => setCat(t)}>{TEXTILE_LABEL[t]}</Button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Stat label={`Forecast total (${s.horizon} mo)`} value={`${f.total.toLocaleString("en-IN")} m`} />
        <Stat label="Next month" value={`${f.points[0].value.toLocaleString("en-IN")} m`} hint={`Range ${f.points[0].low.toLocaleString("en-IN")}–${f.points[0].high.toLocaleString("en-IN")} m`} />
        <Stat label="Confidence" value={f.confidence} hint={`Residual σ ≈ ${Math.round(f.sigma)} m`} />
        <Stat label="Trend" value={`${f.slope >= 0 ? "+" : ""}${Math.round(f.slope)} m/mo`} hint={`Level ${Math.round(f.level)} m`} />
      </div>

      <Panel title={`${TEXTILE_LABEL[cat]} — history vs forecast`} className="mt-6">
        <div className="h-80">
          <ResponsiveContainer>
            <ComposedChart data={data}>
              <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" />
              <XAxis dataKey="month" tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
              <YAxis tick={{ fontSize: 12, fill: "var(--color-muted-foreground)" }} />
              <Tooltip />
              <Legend />
              <Area dataKey="band" name="80% range" fill="var(--color-chart-2)" fillOpacity={0.15} stroke="none" />
              <Line dataKey="actual" name="Historical (sample)" stroke="var(--color-chart-1)" strokeWidth={2} dot={{ r: 2 }} />
              <Line dataKey="forecast" name="Forecast" stroke="var(--color-chart-2)" strokeWidth={2} strokeDasharray="5 4" dot={{ r: 2 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </Panel>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <Panel title="Data used (fictional sample, metres)">
          <div className="grid grid-cols-6 gap-2 text-sm">
            {hist.map((v, i) => (
              <div key={i} className="rounded border border-border p-2 text-center"><div className="text-xs text-muted-foreground">{MONTHS[i]}</div>{v.toLocaleString("en-IN")}</div>
            ))}
          </div>
          <p className="mt-3 text-xs text-muted-foreground">{f.usedMonths} months of history; level uses the last {Math.min(s.window, hist.length)} months.</p>
        </Panel>
        <Panel title="Forecast table">
          <table className="w-full text-sm">
            <thead className="text-left text-xs text-muted-foreground"><tr><th className="pb-2">Month</th><th>Forecast</th><th>Low</th><th>High</th></tr></thead>
            <tbody>{f.points.map((p) => (
              <tr key={p.step} className="border-t border-border"><td className="py-1.5">+{p.step}</td><td>{p.value.toLocaleString("en-IN")}</td><td>{p.low.toLocaleString("en-IN")}</td><td>{p.high.toLocaleString("en-IN")}</td></tr>
            ))}</tbody>
          </table>
        </Panel>
      </div>
    </>
  );
}
