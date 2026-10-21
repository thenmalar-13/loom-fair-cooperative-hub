// Pure, deterministic business logic for SahakarAI (simulation-backed MVP).
// No UI or storage concerns here so it can later move to a server / be swapped for real AI.

export type Textile = "cotton" | "silk" | "towel";
export const TEXTILES: Textile[] = ["cotton", "silk", "towel"];
export const TEXTILE_LABEL: Record<Textile, string> = {
  cotton: "Cotton handloom",
  silk: "Silk handloom",
  towel: "Cotton towels",
};

export interface Weaver {
  id: string;
  name: string;
  village: string;
  textile: Textile;
  capacity: number; // metres / month available
  cost: number; // production cost ₹/m
  minPrice: number; // minimum acceptable ₹/m
  leadTimeDays: number; // earliest days needed to deliver
}

export interface Order {
  id: string;
  buyer: string;
  textile: Textile;
  quantity: number;
  targetPrice: number; // buyer's opening target ₹/m
  deadlineDays: number;
  minFulfilmentPct: number; // buyer requires at least this % of quantity
}

/* ---------------- Forecasting ---------------- */

export interface ForecastSettings {
  horizon: number; // months 1..12
  window: number; // months used for level 3..12
  trendWeight: number; // 0..1
  adjustmentPct: number; // manual market assumption, -50..50
}

export interface ForecastPoint {
  step: number;
  value: number;
  low: number;
  high: number;
}

export interface ForecastResult {
  level: number;
  slope: number;
  sigma: number;
  points: ForecastPoint[];
  total: number;
  confidence: "High" | "Medium" | "Low";
  usedMonths: number;
}

export function linearRegression(ys: number[]) {
  const n = ys.length;
  const xm = (n - 1) / 2;
  const ym = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  ys.forEach((y, x) => {
    num += (x - xm) * (y - ym);
    den += (x - xm) ** 2;
  });
  const slope = den === 0 ? 0 : num / den;
  return { slope, intercept: ym - slope * xm };
}

export function forecast(history: number[], s: ForecastSettings): ForecastResult {
  if (history.length < 3) throw new Error("At least 3 months of history are required");
  const horizon = clamp(Math.round(s.horizon), 1, 12);
  const window = clamp(Math.round(s.window), 2, history.length);
  const recent = history.slice(-window);
  const level = recent.reduce((a, b) => a + b, 0) / recent.length;
  const { slope, intercept } = linearRegression(history);
  const residuals = history.map((y, x) => y - (intercept + slope * x));
  const sigma = Math.sqrt(residuals.reduce((a, r) => a + r * r, 0) / Math.max(1, history.length - 2));
  const adj = 1 + s.adjustmentPct / 100;
  // Level is centred at the middle of the window; project from there.
  const offset = (window - 1) / 2;
  const points: ForecastPoint[] = [];
  for (let h = 1; h <= horizon; h++) {
    const value = Math.max(0, (level + s.trendWeight * slope * (h + offset)) * adj);
    const band = 1.28 * sigma * Math.sqrt(h) * adj; // ~80% interval
    points.push({
      step: h,
      value: Math.round(value),
      low: Math.round(Math.max(0, value - band)),
      high: Math.round(value + band),
    });
  }
  const cv = level > 0 ? sigma / level : 1;
  return {
    level,
    slope,
    sigma,
    points,
    total: points.reduce((a, p) => a + p.value, 0),
    confidence: cv < 0.08 ? "High" : cv < 0.15 ? "Medium" : "Low",
    usedMonths: history.length,
  };
}

/* ---------------- Aggregation ---------------- */

export interface Allocation {
  weaverId: string;
  quantity: number;
  cost: number;
  minPrice: number;
}

export interface OrderPlan {
  orderId: string;
  requested: number;
  allocated: number;
  allocations: Allocation[];
  totalCost: number;
  avgCost: number;
  fulfilmentPct: number;
  floorPrice: number; // highest weaver minimum among allocated (every weaver must be paid ≥ their minimum)
  eligibleCount: number;
  excluded: { weaverId: string; reason: string }[];
  feasible: boolean;
}

export interface AllocationResult {
  plans: Record<string, OrderPlan>;
  remaining: Record<string, number>;
  used: Record<string, number>;
}

export function planAllocations(weavers: Weaver[], orders: Order[]): AllocationResult {
  const remaining: Record<string, number> = {};
  weavers.forEach((w) => (remaining[w.id] = Math.max(0, Math.floor(w.capacity))));
  const plans: Record<string, OrderPlan> = {};
  const sorted = [...orders].sort((a, b) => a.deadlineDays - b.deadlineDays || a.id.localeCompare(b.id));

  for (const o of sorted) {
    const excluded: OrderPlan["excluded"] = [];
    const eligible = weavers.filter((w) => {
      if (w.textile !== o.textile) return false; // never mix textile categories
      if (w.leadTimeDays > o.deadlineDays) {
        excluded.push({ weaverId: w.id, reason: `Needs ${w.leadTimeDays} days, deadline is ${o.deadlineDays}` });
        return false;
      }
      if ((remaining[w.id] ?? 0) <= 0) {
        excluded.push({ weaverId: w.id, reason: "No remaining capacity" });
        return false;
      }
      return true;
    });
    eligible.sort((a, b) => a.minPrice - b.minPrice || a.cost - b.cost || a.id.localeCompare(b.id));
    let need = Math.max(0, Math.floor(o.quantity));
    const allocations: Allocation[] = [];
    for (const w of eligible) {
      if (need <= 0) break;
      const q = Math.min(need, (remaining[w.id] ?? 0));
      if (q <= 0) continue;
      remaining[w.id] = (remaining[w.id] ?? 0) - q;
      need -= q;
      allocations.push({ weaverId: w.id, quantity: q, cost: w.cost, minPrice: w.minPrice });
    }
    const allocated = allocations.reduce((a, x) => a + x.quantity, 0);
    const totalCost = allocations.reduce((a, x) => a + x.quantity * x.cost, 0);
    const fulfilmentPct = o.quantity > 0 ? (allocated / o.quantity) * 100 : 0;
    plans[o.id] = {
      orderId: o.id,
      requested: o.quantity,
      allocated,
      allocations,
      totalCost,
      avgCost: allocated ? totalCost / allocated : 0,
      fulfilmentPct,
      floorPrice: allocations.reduce((m, x) => Math.max(m, x.minPrice), 0),
      eligibleCount: eligible.length,
      excluded,
      feasible: allocated > 0 && fulfilmentPct >= o.minFulfilmentPct,
    };
  }
  const used: Record<string, number> = {};
  weavers.forEach((w) => (used[w.id] = Math.max(0, Math.floor(w.capacity)) - (remaining[w.id] ?? 0)));
  return { plans, remaining, used };
}

/* ---------------- Negotiation ---------------- */

export type NegStatus = "open" | "accepted" | "rejected" | "escalated";

export interface NegConfig {
  coopFloor: number; // officer-set floor ₹/m (can only raise the computed floor)
  targetMarginPct: number;
  concessionPct: number; // how far cooperative moves toward buyer each round
  maxRounds: number;
  escalationGapPct: number; // escalate if buyer is this far below floor
}

export interface NegRound {
  n: number;
  actor: "buyer" | "cooperative" | "system" | "officer";
  price?: number;
  message: string;
}

export interface Negotiation {
  orderId: string;
  config: NegConfig;
  buyerOffer: number;
  counter: number | null;
  rounds: NegRound[];
  status: NegStatus;
  finalPrice: number | null;
  escalationReason: string | null;
}

export const DEFAULT_NEG_CONFIG: NegConfig = {
  coopFloor: 0,
  targetMarginPct: 18,
  concessionPct: 35,
  maxRounds: 4,
  escalationGapPct: 10,
};

export function newNegotiation(order: Order, config: NegConfig = DEFAULT_NEG_CONFIG, allocatedQty?: number): Negotiation {
  // The transcript must distinguish metres ordered from metres allocated — the price is agreed on the allocated quantity.
  const opening =
    allocatedQty == null
      ? `Opening offer of ₹${order.targetPrice}/m for an order of ${order.quantity} m.`
      : `Opening offer of ₹${order.targetPrice}/m. Order quantity: ${order.quantity} m; allocated for this deal: ${allocatedQty} m.`;
  return {
    orderId: order.id,
    config: { ...config },
    buyerOffer: order.targetPrice,
    counter: null,
    rounds: [{ n: 0, actor: "buyer", price: order.targetPrice, message: opening }],
    status: "open",
    finalPrice: null,
    escalationReason: null,
  };
}

/** Minimum price the cooperative may ever accept. Enforced in code. */
export function computeFloor(plan: OrderPlan, cfg: NegConfig): number {
  return Math.ceil(Math.max(plan.floorPrice, Math.ceil(plan.avgCost), cfg.coopFloor || 0));
}

export function computeTarget(plan: OrderPlan, cfg: NegConfig): number {
  return Math.max(computeFloor(plan, cfg), Math.ceil(plan.avgCost * (1 + cfg.targetMarginPct / 100)));
}

export function counterRounds(n: Negotiation) {
  return n.rounds.filter((r) => r.actor === "cooperative" && r.price != null).length;
}

export type Recommendation =
  | { action: "accept"; reason: string }
  | { action: "counter"; price: number; reason: string }
  | { action: "escalate"; reason: string };

export function recommend(n: Negotiation, plan: OrderPlan, order: Order): Recommendation {
  const floor = computeFloor(plan, n.config);
  const target = computeTarget(plan, n.config);
  if (plan.allocated === 0) return { action: "escalate", reason: "No compatible weaver capacity is available for this order." };
  if (plan.fulfilmentPct < order.minFulfilmentPct)
    return {
      action: "escalate",
      reason: `Only ${plan.fulfilmentPct.toFixed(0)}% can be fulfilled; buyer requires ${order.minFulfilmentPct}%.`,
    };
  const ask = n.counter ?? target;
  if (n.buyerOffer >= ask && n.buyerOffer >= floor)
    return { action: "accept", reason: `Buyer offer ₹${n.buyerOffer} meets the cooperative ask of ₹${ask} and floor of ₹${floor}.` };
  if (n.buyerOffer < floor * (1 - n.config.escalationGapPct / 100))
    return {
      action: "escalate",
      reason: `Buyer offer ₹${n.buyerOffer} is more than ${n.config.escalationGapPct}% below the floor of ₹${floor}.`,
    };
  if (counterRounds(n) >= n.config.maxRounds) {
    if (n.buyerOffer >= floor)
      return { action: "accept", reason: `Round limit reached and ₹${n.buyerOffer} is at or above the floor of ₹${floor}.` };
    return { action: "escalate", reason: `Round limit (${n.config.maxRounds}) reached with offer below floor ₹${floor}.` };
  }
  const price =
    n.counter == null
      ? target
      : Math.max(floor, Math.round(n.counter - (n.config.concessionPct / 100) * (n.counter - n.buyerOffer)));
  return {
    action: "counter",
    price,
    reason:
      n.counter == null
        ? `Open at target ₹${target} = average cost ₹${plan.avgCost.toFixed(0)} + ${n.config.targetMarginPct}% margin (never below floor ₹${floor}).`
        : `Concede ${n.config.concessionPct}% of the gap toward the buyer, clamped at floor ₹${floor}.`,
  };
}

export type ActionResult = { ok: true; neg: Negotiation } | { ok: false; error: string };

function closed(n: Negotiation): string | null {
  return n.status === "open" ? null : `Negotiation is ${n.status}.`;
}

export function acceptOffer(n: Negotiation, plan: OrderPlan, order: Order): ActionResult {
  const c = closed(n);
  if (c) return { ok: false, error: c };
  const floor = computeFloor(plan, n.config);
  if (plan.allocated === 0 || plan.fulfilmentPct < order.minFulfilmentPct)
    return { ok: false, error: "Fulfilment constraint not met — this order cannot be accepted. Escalate instead." };
  if (!(n.buyerOffer >= floor))
    return { ok: false, error: `Offer ₹${n.buyerOffer} is below the floor price ₹${floor}. Acceptance blocked.` };
  return {
    ok: true,
    neg: {
      ...n,
      status: "accepted",
      finalPrice: n.buyerOffer,
      rounds: [...n.rounds, { n: n.rounds.length, actor: "cooperative", message: `Accepted ₹${n.buyerOffer}/m (floor ₹${floor}) for the ${plan.allocated} m allocated (order quantity ${order.quantity} m).` }],
    },
  };
}

/** Buyer simulation: deterministic, moves halfway toward counter up to a hidden reservation price. */
export function buyerReservation(order: Order) {
  return Math.round(order.targetPrice * 1.12);
}

export function sendCounter(n: Negotiation, plan: OrderPlan, order: Order, price: number): ActionResult {
  const c = closed(n);
  if (c) return { ok: false, error: c };
  const floor = computeFloor(plan, n.config);
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "Enter a valid counteroffer price." };
  if (price < floor) return { ok: false, error: `Counteroffer ₹${price} is below floor ₹${floor}. Not allowed.` };
  const rounds = [...n.rounds, { n: n.rounds.length, actor: "cooperative" as const, price, message: `Counteroffer ₹${price}/m.` }];
  const reservation = buyerReservation(order);
  let next: number;
  let msg: string;
  if (price <= reservation && price - n.buyerOffer <= Math.max(3, price * 0.02)) {
    next = price;
    msg = `Buyer agrees to ₹${price}/m.`;
  } else {
    next = Math.min(reservation, Math.round(n.buyerOffer + 0.5 * (price - n.buyerOffer)));
    next = Math.max(next, n.buyerOffer);
    msg = next === n.buyerOffer ? `Buyer holds at ₹${next}/m — this is their limit.` : `Buyer revises offer to ₹${next}/m.`;
  }
  rounds.push({ n: rounds.length, actor: "buyer", price: next, message: msg });
  return { ok: true, neg: { ...n, counter: price, buyerOffer: next, rounds } };
}

export function rejectOffer(n: Negotiation, reason = "Rejected by cooperative."): ActionResult {
  const c = closed(n);
  if (c) return { ok: false, error: c };
  return { ok: true, neg: { ...n, status: "rejected", rounds: [...n.rounds, { n: n.rounds.length, actor: "cooperative", message: reason }] } };
}

export function escalate(n: Negotiation, reason: string): ActionResult {
  const c = closed(n);
  if (c) return { ok: false, error: c };
  return {
    ok: true,
    neg: {
      ...n,
      status: "escalated",
      escalationReason: reason,
      rounds: [...n.rounds, { n: n.rounds.length, actor: "system", message: `Escalated to cooperative officer: ${reason}` }],
    },
  };
}

export function setBuyerOffer(n: Negotiation, price: number): ActionResult {
  const c = closed(n);
  if (c) return { ok: false, error: c };
  if (!Number.isFinite(price) || price <= 0) return { ok: false, error: "Enter a valid buyer offer." };
  return { ok: true, neg: { ...n, buyerOffer: price, rounds: [...n.rounds, { n: n.rounds.length, actor: "buyer", price, message: `Buyer offer updated to ₹${price}/m.` }] } };
}

/* ---------------- Reporting ---------------- */

export interface ReportRow {
  orderId: string;
  buyer: string;
  textile: string;
  quantity: number;
  allocated: number;
  weavers: string;
  productionCost: number;
  price: number;
  priceBasis: "Negotiated" | "Estimated (target)" | "None";
  revenue: number;
  surplus: number;
  fulfilmentPct: number;
  status: string;
  escalation: string;
}

export function buildReport(orders: Order[], weavers: Weaver[], alloc: AllocationResult, negs: Record<string, Negotiation>): ReportRow[] {
  const wname = Object.fromEntries(weavers.map((w) => [w.id, w.name]));
  return orders.map((o) => {
    const p = alloc.plans[o.id];
    const n = negs[o.id];
    const accepted = n?.status === "accepted" && n.finalPrice != null;
    const price = accepted ? n!.finalPrice! : p && p.allocated ? computeTarget(p, n?.config ?? DEFAULT_NEG_CONFIG) : 0;
    const revenue = (n?.status === "rejected" ? 0 : price) * (p?.allocated ?? 0);
    return {
      orderId: o.id,
      buyer: o.buyer,
      textile: TEXTILE_LABEL[o.textile],
      quantity: o.quantity,
      allocated: p?.allocated ?? 0,
      weavers: (p?.allocations ?? []).map((a) => `${a.weaverId} ${wname[a.weaverId]} (${a.quantity}m)`).join("; "),
      productionCost: Math.round(p?.totalCost ?? 0),
      price,
      priceBasis: accepted ? "Negotiated" : price ? "Estimated (target)" : "None",
      revenue: Math.round(revenue),
      surplus: n?.status === "rejected" ? 0 : Math.round(revenue - (p?.totalCost ?? 0)),
      fulfilmentPct: Math.round(p?.fulfilmentPct ?? 0),
      status: n ? n.status : "not started",
      escalation: n?.escalationReason ?? "",
    };
  });
}

export function toCSV(rows: ReportRow[]): string {
  const headers = ["Order ID","Buyer","Textile","Order quantity (m)","Allocated (m)","Assigned weavers","Production cost (INR)","Price per m (INR)","Price basis","Projected revenue (INR, estimate)","Projected surplus (INR, estimate)","Fulfilment %","Negotiation status","Escalation"];
  const esc = (v: unknown) => {
    const s = String(v ?? "");
    return /[",\n;]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const lines = rows.map((r) =>
    [r.orderId, r.buyer, r.textile, r.quantity, r.allocated, r.weavers, r.productionCost, r.price, r.priceBasis, r.revenue, r.surplus, r.fulfilmentPct, r.status, r.escalation].map(esc).join(","),
  );
  return [headers.join(","), ...lines].join("\n");
}

export function clamp(v: number, lo: number, hi: number) {
  return Math.min(hi, Math.max(lo, v));
}

export const inr = (v: number) => "₹" + Math.round(v).toLocaleString("en-IN");
