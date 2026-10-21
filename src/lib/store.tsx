import { createContext, useContext, useEffect, useMemo, useReducer, useState, type ReactNode } from "react";
import {
  DEFAULT_NEG_CONFIG,
  buildReport,
  forecast,
  newNegotiation,
  planAllocations,
  TEXTILES,
  type ForecastResult,
  type ForecastSettings,
  type Negotiation,
  type Order,
  type Textile,
  type Weaver,
} from "./engine";
import { SEED_FORECAST_SETTINGS, SEED_HISTORY, SEED_ORDERS, SEED_WEAVERS } from "./seed";

export interface Activity {
  id: number;
  agent: "Forecasting" | "Aggregation" | "Negotiation" | "System";
  message: string;
  at: string;
}
export interface Escalation {
  id: number;
  orderId: string;
  reason: string;
  price: number;
  at: string;
}

export interface AppState {
  weavers: Weaver[];
  orders: Order[];
  history: Record<Textile, number[]>;
  forecastSettings: ForecastSettings;
  negotiations: Record<string, Negotiation>;
  activity: Activity[];
  escalations: Escalation[];
  planConfirmed: boolean;
}

type Action =
  | { type: "load"; state: AppState }
  | { type: "reset" }
  | { type: "updateWeaver"; id: string; patch: Partial<Weaver> }
  | { type: "updateOrder"; id: string; patch: Partial<Order> }
  | { type: "addOrder"; order: Order }
  | { type: "removeOrder"; id: string }
  | { type: "forecastSettings"; patch: Partial<ForecastSettings> }
  | { type: "setNegotiation"; neg: Negotiation }
  | { type: "log"; agent: Activity["agent"]; message: string }
  | { type: "escalation"; orderId: string; reason: string; price: number }
  | { type: "confirmPlan"; value: boolean };

const KEY = "sahakarai-demo-v2"; // bumped: discard stale v1 demo state saved before the seed corrections

export function seedState(): AppState {
  const seedPlans = planAllocations(SEED_WEAVERS, SEED_ORDERS).plans;
  return {
    weavers: SEED_WEAVERS.map((w) => ({ ...w })),
    orders: SEED_ORDERS.map((o) => ({ ...o })),
    history: { cotton: [...SEED_HISTORY.cotton], silk: [...SEED_HISTORY.silk], towel: [...SEED_HISTORY.towel] },
    forecastSettings: { ...SEED_FORECAST_SETTINGS },
    negotiations: Object.fromEntries(SEED_ORDERS.map((o) => [o.id, newNegotiation(o, DEFAULT_NEG_CONFIG, seedPlans[o.id]?.allocated)])),
    activity: [{ id: 1, agent: "System", message: "Demo scenario loaded with fictional cooperative data.", at: new Date().toISOString() }],
    escalations: [],
    planConfirmed: false,
  };
}

let seq = Date.now();
function reducer(s: AppState, a: Action): AppState {
  const now = new Date().toISOString();
  switch (a.type) {
    case "load":
      return a.state;
    case "reset":
      return seedState();
    case "updateWeaver":
      return { ...s, planConfirmed: false, weavers: s.weavers.map((w) => (w.id === a.id ? { ...w, ...a.patch } : w)) };
    case "updateOrder":
      return { ...s, planConfirmed: false, orders: s.orders.map((o) => (o.id === a.id ? { ...o, ...a.patch } : o)) };
    case "addOrder": {
      const plans = planAllocations(s.weavers, [...s.orders, a.order]).plans;
      return { ...s, planConfirmed: false, orders: [...s.orders, a.order], negotiations: { ...s.negotiations, [a.order.id]: newNegotiation(a.order, DEFAULT_NEG_CONFIG, plans[a.order.id]?.allocated) } };
    }
    case "removeOrder": {
      const negotiations = { ...s.negotiations };
      delete negotiations[a.id];
      return { ...s, planConfirmed: false, orders: s.orders.filter((o) => o.id !== a.id), negotiations };
    }
    case "forecastSettings":
      return { ...s, forecastSettings: { ...s.forecastSettings, ...a.patch } };
    case "setNegotiation":
      return { ...s, negotiations: { ...s.negotiations, [a.neg.orderId]: a.neg } };
    case "log":
      return { ...s, activity: [{ id: ++seq, agent: a.agent, message: a.message, at: now }, ...s.activity].slice(0, 80) };
    case "escalation":
      return { ...s, escalations: [{ id: ++seq, orderId: a.orderId, reason: a.reason, price: a.price, at: now }, ...s.escalations] };
    case "confirmPlan":
      return { ...s, planConfirmed: a.value };
  }
}

function useDerived(state: AppState) {
  return useMemo(() => {
    const alloc = planAllocations(state.weavers, state.orders);
    const forecasts = {} as Record<Textile, ForecastResult>;
    TEXTILES.forEach((t) => (forecasts[t] = forecast(state.history[t], state.forecastSettings)));
    const report = buildReport(state.orders, state.weavers, alloc, state.negotiations);
    return { alloc, forecasts, report };
  }, [state]);
}

type Ctx = { state: AppState; dispatch: (a: Action) => void; ready: boolean } & ReturnType<typeof useDerived>;
const StoreCtx = createContext<Ctx | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, seedState);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) dispatch({ type: "load", state: JSON.parse(raw) });
    } catch {
      localStorage.removeItem(KEY);
    }
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) localStorage.setItem(KEY, JSON.stringify(state));
  }, [state, ready]);
  const derived = useDerived(state);
  return <StoreCtx.Provider value={{ state, dispatch, ready, ...derived }}>{children}</StoreCtx.Provider>;
}

export function useStore() {
  const c = useContext(StoreCtx);
  if (!c) throw new Error("useStore outside provider");
  return c;
}
