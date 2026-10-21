import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { NumField, PageHeader, Panel, Stat, StatusBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import {
  acceptOffer, computeFloor, computeTarget, escalate, inr, newNegotiation, recommend, rejectOffer, sendCounter, setBuyerOffer,
  TEXTILE_LABEL, type ActionResult, type NegConfig,
} from "@/lib/engine";
import { useStore } from "@/lib/store";

export const Route = createFileRoute("/negotiation")({
  head: () => ({
    meta: [
      { title: "Negotiation Lab — SahakarAI" },
      { name: "description", content: "Simulate fair-price negotiations with enforced floor prices and officer escalation." },
      { property: "og:title", content: "Negotiation Lab — SahakarAI" },
      { property: "og:description", content: "Rule-based negotiation simulator that never accepts below the floor price." },
    ],
  }),
  component: NegotiationLab,
});

function NegotiationLab() {
  const { state, alloc, dispatch } = useStore();
  const [sel, setSel] = useState(state.orders[0]?.id ?? "");
  useEffect(() => {
    if (!state.orders.find((o) => o.id === sel)) setSel(state.orders[0]?.id ?? "");
  }, [state.orders, sel]);
  const order = state.orders.find((o) => o.id === sel);
  const neg = order ? state.negotiations[order.id] ?? newNegotiation(order) : null;
  const plan = order ? alloc.plans[order.id] : null;
  const [offerInput, setOfferInput] = useState(0);
  const [counterInput, setCounterInput] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const rec = order && neg && plan ? recommend(neg, plan, order) : null;
  useEffect(() => {
    if (neg) setOfferInput(neg.buyerOffer);
    if (rec?.action === "counter") setCounterInput(rec.price);
    setError(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sel, neg?.rounds.length]);

  if (!order || !neg || !plan || !rec) {
    return (<><PageHeader agent="Agent 3 · Negotiation" title="Negotiation lab" description="Add a bulk order to start negotiating." /><Panel><p className="py-8 text-center text-sm text-muted-foreground">No orders available to negotiate.</p></Panel></>);
  }
  const floor = computeFloor(plan, neg.config);
  const target = computeTarget(plan, neg.config);

  const apply = (r: ActionResult, log: string) => {
    if (!r.ok) { setError(r.error); toast.error(r.error); return; }
    setError(null);
    dispatch({ type: "setNegotiation", neg: r.neg });
    dispatch({ type: "log", agent: "Negotiation", message: `${order.id}: ${log}` });
    if (r.neg.status === "escalated") dispatch({ type: "escalation", orderId: order.id, reason: r.neg.escalationReason ?? "", price: r.neg.buyerOffer });
  };
  const doEscalate = (reason: string) => apply(escalate(neg, reason), `escalated — ${reason}`);
  const runStep = () => {
    if (rec.action === "accept") apply(acceptOffer(neg, plan, order), `accepted ₹${neg.buyerOffer}/m. ${rec.reason}`);
    else if (rec.action === "escalate") doEscalate(rec.reason);
    else apply(sendCounter(neg, plan, order, rec.price), `countered at ₹${rec.price}/m. ${rec.reason}`);
  };
  const setCfg = (patch: Partial<NegConfig>) => {
    const v = Object.values(patch)[0] as number;
    if (!Number.isFinite(v) || v < 0) return;
    dispatch({ type: "setNegotiation", neg: { ...neg, config: { ...neg.config, ...patch } } });
  };
  const open = neg.status === "open";

  return (
    <>
      <PageHeader agent="Agent 3 · Negotiation" title="Negotiation lab" description="The floor price is the highest of: every allocated weaver's minimum price, average production cost, and the officer-set floor. It is enforced in code — no button can accept or counter below it.">
        <select value={sel} onChange={(e) => setSel(e.target.value)} className="rounded-md border border-input bg-card px-3 py-2 text-sm">
          {state.orders.map((o) => <option key={o.id} value={o.id}>{o.id} · {o.buyer} ({state.negotiations[o.id]?.status ?? "open"})</option>)}
        </select>
      </PageHeader>

      <div className="grid gap-4 md:grid-cols-5">
        <Stat label="Order / allocated" value={`${plan.allocated} / ${order.quantity} m`} hint={`${TEXTILE_LABEL[order.textile]} · ${plan.fulfilmentPct.toFixed(0)}% of the order fulfilled`} />
        <Stat label="Floor price" value={`${inr(floor)}/m`} hint="Minimum acceptable" />
        <Stat label="Target price" value={`${inr(target)}/m`} hint={`Cost + ${neg.config.targetMarginPct}%`} />
        <Stat label="Current buyer offer" value={`${inr(neg.buyerOffer)}/m`} hint={neg.buyerOffer >= floor ? "At or above floor" : "Below floor"} />
        <Stat label="Status" value={<StatusBadge status={neg.status} />} hint={neg.counter ? `Last counter ${inr(neg.counter)}` : "No counter yet"} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Panel title="Agent recommendation">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Recommended action</div>
                <div className="mt-1 font-serif text-xl capitalize">{rec.action}{rec.action === "counter" ? ` at ${inr(rec.price)}/m` : ""}</div>
                <p className="mt-2 max-w-xl text-sm text-muted-foreground">{rec.reason}</p>
              </div>
              <Button onClick={runStep} disabled={!open}>Run agent step</Button>
            </div>
          </Panel>

          <Panel title="Actions">
            {!open && <p className="mb-4 rounded-md border border-border bg-muted p-3 text-sm">This negotiation is <b>{neg.status}</b>{neg.finalPrice ? ` at ${inr(neg.finalPrice)}/m` : ""}.{neg.escalationReason ? ` Reason: ${neg.escalationReason}` : ""}</p>}
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <NumField label="Buyer offer (₹/m) — simulate a new buyer offer" min={1} value={offerInput} onChange={setOfferInput} />
                <Button variant="outline" size="sm" className="mt-2" disabled={!open} onClick={() => apply(setBuyerOffer(neg, offerInput), `buyer offer set to ₹${offerInput}/m`)}>Update buyer offer</Button>
              </div>
              <div>
                <NumField label={`Counteroffer (₹/m) — min ${floor}`} min={floor} value={counterInput} onChange={setCounterInput} />
                <Button variant="outline" size="sm" className="mt-2" disabled={!open} onClick={() => apply(sendCounter(neg, plan, order, counterInput), `countered at ₹${counterInput}/m`)}>Send counteroffer</Button>
              </div>
            </div>
            <div className="mt-5 flex flex-wrap gap-2 border-t border-border pt-4">
              <Button disabled={!open} onClick={() => apply(acceptOffer(neg, plan, order), `accepted ₹${neg.buyerOffer}/m`)}>Accept current offer</Button>
              <Button variant="outline" disabled={!open} onClick={() => apply(rejectOffer(neg), "rejected by cooperative")}>Reject</Button>
              <Button variant="outline" disabled={!open} onClick={() => doEscalate("Manually escalated for officer review.")}>Escalate to officer</Button>
              <Button variant="ghost" onClick={() => { dispatch({ type: "setNegotiation", neg: { ...newNegotiation(order, neg.config, plan.allocated) } }); dispatch({ type: "log", agent: "Negotiation", message: `${order.id}: negotiation restarted.` }); }}>Restart negotiation</Button>
            </div>
            {error && <p role="alert" className="mt-3 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
          </Panel>

          <Panel title="Transcript">
            <ol className="space-y-3">
              {neg.rounds.map((r, i) => (
                <li key={i} className={`flex gap-3 text-sm ${r.actor === "cooperative" ? "flex-row-reverse text-right" : ""}`}>
                  <span className={`mt-0.5 shrink-0 rounded px-2 py-0.5 text-xs ${r.actor === "buyer" ? "bg-secondary" : r.actor === "cooperative" ? "bg-accent/15 text-accent" : "bg-warning/15 text-warning"}`}>{r.actor}</span>
                  <span className="rounded-md border border-border px-3 py-2">{r.message}</span>
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <Panel title="Negotiation rules">
          <div className="space-y-4">
            <NumField label="Officer floor price (₹/m, 0 = none)" min={0} value={neg.config.coopFloor} onChange={(v) => setCfg({ coopFloor: v })} />
            <NumField label="Target margin" suffix="%" min={0} value={neg.config.targetMarginPct} onChange={(v) => setCfg({ targetMarginPct: v })} />
            <NumField label="Concession per round" suffix="%" min={0} max={100} value={neg.config.concessionPct} onChange={(v) => v <= 100 && setCfg({ concessionPct: v })} />
            <NumField label="Max counter rounds" min={1} value={neg.config.maxRounds} onChange={(v) => v >= 1 && setCfg({ maxRounds: Math.round(v) })} />
            <NumField label="Escalate if offer below floor by" suffix="%" min={0} value={neg.config.escalationGapPct} onChange={(v) => setCfg({ escalationGapPct: v })} />
          </div>
          <div className="mt-5 space-y-1 border-t border-border pt-4 text-xs text-muted-foreground">
            <p>Highest weaver minimum: {inr(plan.floorPrice)}/m</p>
            <p>Average production cost: {inr(plan.avgCost)}/m</p>
            <p>Buyer behaviour is simulated deterministically: each round they move halfway toward the counter, up to a hidden limit.</p>
          </div>
        </Panel>
      </div>
    </>
  );
}
