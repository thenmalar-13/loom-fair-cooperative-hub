import { describe, expect, it } from "vitest";
import { acceptOffer, buildReport, computeFloor, forecast, newNegotiation, planAllocations, recommend, sendCounter, toCSV, DEFAULT_NEG_CONFIG } from "./engine";
import { SEED_HISTORY, SEED_ORDERS, SEED_WEAVERS } from "./seed";

describe("aggregation", () => {
  it("never allocates more than a weaver's capacity", () => {
    const orders = SEED_ORDERS.map((o) => ({ ...o, quantity: o.quantity * 5 }));
    const r = planAllocations(SEED_WEAVERS, orders);
    for (const w of SEED_WEAVERS) expect(r.used[w.id]).toBeLessThanOrEqual(w.capacity);
  });
  it("never mixes textile categories or late weavers", () => {
    const r = planAllocations(SEED_WEAVERS, SEED_ORDERS);
    for (const o of SEED_ORDERS)
      for (const a of r.plans[o.id]!.allocations) {
        const w = SEED_WEAVERS.find((x) => x.id === a.weaverId)!;
        expect(w.textile).toBe(o.textile);
        expect(w.leadTimeDays).toBeLessThanOrEqual(o.deadlineDays);
      }
  });
  it("updates when capacity changes", () => {
    const ws = SEED_WEAVERS.map((w) => (w.textile === "silk" ? { ...w, capacity: 0 } : w));
    expect(planAllocations(ws, SEED_ORDERS).plans["ORD-102"]!.allocated).toBe(0);
  });
});

describe("negotiation", () => {
  const order = SEED_ORDERS[1]!;
  const plan = planAllocations(SEED_WEAVERS, SEED_ORDERS).plans[order.id]!;
  it("blocks acceptance below the floor", () => {
    const n = { ...newNegotiation(order), buyerOffer: computeFloor(plan, DEFAULT_NEG_CONFIG) - 1 };
    expect(acceptOffer(n, plan, order).ok).toBe(false);
  });
  it("blocks counteroffers below the floor", () => {
    expect(sendCounter(newNegotiation(order), plan, order, 1).ok).toBe(false);
  });
  it("officer floor raises the floor", () => {
    expect(computeFloor(plan, { ...DEFAULT_NEG_CONFIG, coopFloor: 5000 })).toBe(5000);
  });
  it("escalates when far below floor", () => {
    const n = { ...newNegotiation(order), buyerOffer: 500 };
    expect(recommend(n, plan, order).action).toBe("escalate");
  });
});

describe("forecast and report", () => {
  it("recalculates with assumptions", () => {
    const base = { horizon: 3, window: 4, trendWeight: 0, adjustmentPct: 0 };
    const a = forecast(SEED_HISTORY.towel, base);
    const b = forecast(SEED_HISTORY.towel, { ...base, adjustmentPct: 10 });
    expect(a.points).toHaveLength(3);
    expect(b.total).toBeGreaterThan(a.total);
  });
  it("exports one CSV line per order", () => {
    const r = buildReport(SEED_ORDERS, SEED_WEAVERS, planAllocations(SEED_WEAVERS, SEED_ORDERS), {});
    expect(toCSV(r).split("\n")).toHaveLength(SEED_ORDERS.length + 1);
  });
});
