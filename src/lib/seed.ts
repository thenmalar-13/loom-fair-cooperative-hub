// FICTIONAL DEMONSTRATION DATA — not real people, cooperatives, or buyers.
import type { ForecastSettings, Order, Textile, Weaver } from "./engine";

const raw: [string, string, Textile, number, number, number, number][] = [
  ["Meenakshi Sundaram", "Kanchipuram", "silk", 160, 1180, 1320, 30],
  ["Arumugam Velu", "Arani", "silk", 140, 1210, 1360, 35],
  ["Lakshmi Ramasamy", "Kanchipuram", "silk", 180, 1150, 1290, 40],
  ["Selvaraj Murugan", "Thirubuvanam", "silk", 120, 1260, 1400, 28],
  ["Kavitha Palani", "Arani", "silk", 150, 1190, 1340, 50],
  ["Ganesan Subbiah", "Thirubuvanam", "silk", 130, 1230, 1380, 45],
  ["Valli Chinnasamy", "Chennimalai", "cotton", 420, 168, 196, 14],
  ["Ravi Kandasamy", "Chennimalai", "cotton", 380, 172, 200, 18],
  ["Pushpa Natarajan", "Kurinjipadi", "cotton", 350, 165, 192, 21],
  ["Murali Shanmugam", "Salem", "cotton", 400, 175, 205, 25],
  ["Saraswathi Mani", "Kurinjipadi", "cotton", 300, 160, 188, 12],
  ["Kannan Periyasamy", "Salem", "cotton", 360, 178, 210, 30],
  ["Deepa Raju", "Paramakudi", "cotton", 320, 170, 198, 16],
  ["Senthil Kumaran", "Paramakudi", "cotton", 280, 182, 215, 35],
  ["Jothi Annamalai", "Karur", "towel", 520, 92, 110, 10],
  ["Balu Ayyasamy", "Karur", "towel", 480, 96, 114, 14],
  ["Revathi Govindan", "Erode", "towel", 450, 90, 108, 18],
  ["Manikandan Sekar", "Erode", "towel", 500, 98, 118, 21],
  ["Anitha Durai", "Karur", "towel", 400, 94, 112, 25],
  ["Prakash Elango", "Erode", "towel", 430, 100, 120, 30],
];

export const SEED_WEAVERS: Weaver[] = raw.map(([name, village, textile, capacity, cost, minPrice, leadTimeDays], i) => ({
  id: `W${String(i + 1).padStart(3, "0")}`,
  name,
  village,
  textile,
  capacity,
  cost,
  minPrice,
  leadTimeDays,
}));

export const SEED_ORDERS: Order[] = [
  { id: "ORD-101", buyer: "Marina Retail Co. (Chennai)", textile: "cotton", quantity: 2000, targetPrice: 215, deadlineDays: 30, minFulfilmentPct: 90 },
  { id: "ORD-102", buyer: "Indigo Loom Boutique (Bengaluru)", textile: "silk", quantity: 600, targetPrice: 1330, deadlineDays: 45, minFulfilmentPct: 100 },
  { id: "ORD-103", buyer: "Coastal Stays Hotels (Puducherry)", textile: "towel", quantity: 1800, targetPrice: 104, deadlineDays: 21, minFulfilmentPct: 80 },
  { id: "ORD-104", buyer: "Nordic Fair Trade Export", textile: "cotton", quantity: 1400, targetPrice: 230, deadlineDays: 20, minFulfilmentPct: 75 },
];

// 12 months of fictional demand history (metres), oldest first.
export const MONTHS = ["Nov", "Dec", "Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct"];
export const SEED_HISTORY: Record<Textile, number[]> = {
  cotton: [2650, 2900, 2780, 2820, 3010, 3100, 2980, 3150, 3240, 3180, 3380, 3460],
  silk: [820, 1040, 760, 700, 740, 690, 880, 760, 720, 800, 960, 1010],
  towel: [2100, 2050, 2180, 2240, 2300, 2380, 2350, 2420, 2500, 2480, 2560, 2620],
};

export const SEED_FORECAST_SETTINGS: ForecastSettings = { horizon: 6, window: 4, trendWeight: 0.6, adjustmentPct: 0 };
