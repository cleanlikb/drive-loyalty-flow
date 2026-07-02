import type { Milestone } from "./format";

export interface StockRow {
  id: string;
  make: string;
  model: string;
  year: number | null;
  trim: string | null;
  price: number | null;
  active: boolean;
}

export interface CustomerLite {
  make: string | null;
  model: string | null;
  sale_price: number | null;
  sale_date: string | null;
}

export interface MatchResult {
  stockId: string | null;
  score: number;
  reasons: string[];
}

function norm(s: string | null | undefined): string {
  return (s ?? "").trim().toLowerCase();
}

export function scoreMatch(customer: CustomerLite, stock: StockRow, milestone: Milestone): MatchResult {
  let score = 0;
  const reasons: string[] = [];
  const custMake = norm(customer.make);
  const custModel = norm(customer.model);
  const stMake = norm(stock.make);
  const stModel = norm(stock.model);
  const purchaseYear = customer.sale_date ? new Date(customer.sale_date).getFullYear() : null;

  if (custMake && custMake === stMake) {
    score += 40;
    reasons.push(`Same make (${stock.make})`);
    if (custModel && custModel === stModel) {
      score += 30;
      reasons.push(`Same model (${stock.model})`);
      if (stock.year && purchaseYear && stock.year > purchaseYear) {
        score += 20;
        reasons.push(`Newer year (${stock.year} vs ${purchaseYear})`);
      }
    } else if (custModel && stModel && (custModel.startsWith(stModel[0]) || stModel.includes(custModel.slice(0, 3)))) {
      score += 10;
      reasons.push(`Similar model in range`);
    }
  }

  if (customer.sale_price && stock.price) {
    const ratio = Number(stock.price) / Number(customer.sale_price);
    if (ratio >= 0.85 && ratio <= 1.25) {
      score += 15;
      reasons.push(`Similar price band (${Math.round(ratio * 100)}% of original)`);
    }
  }

  // Milestone bonus — longer ownership = more upgrade-worthy match
  if (milestone >= 36) {
    score += 5;
    reasons.push(`Long ownership window (${milestone} months)`);
  }

  return { stockId: stock.id, score: Math.min(100, score), reasons };
}

export function findBestMatch(customer: CustomerLite, stock: StockRow[], milestone: Milestone): MatchResult {
  const active = stock.filter((s) => s.active);
  if (active.length === 0) return { stockId: null, score: 0, reasons: ["No active stock"] };
  let best: MatchResult = { stockId: null, score: -1, reasons: [] };
  for (const s of active) {
    const r = scoreMatch(customer, s, milestone);
    if (r.score > best.score) best = r;
  }
  if (best.score <= 0) return { stockId: null, score: 0, reasons: ["No suitable match found"] };
  return best;
}
