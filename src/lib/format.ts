export function formatGbp(n: number | null | undefined): string {
  if (n === null || n === undefined || Number.isNaN(Number(n))) return "—";
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(Number(n));
}

export function formatDate(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(date);
}

export function formatDateTime(d: string | Date | null | undefined): string {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(date);
}

export function monthsAgo(saleDate: string | Date, ref: Date = new Date()): number {
  const d = typeof saleDate === "string" ? new Date(saleDate) : saleDate;
  return (ref.getFullYear() - d.getFullYear()) * 12 + (ref.getMonth() - d.getMonth());
}

export const MILESTONES = [12, 18, 24, 36, 48, 60] as const;
export const DEFAULT_MILESTONES: number[] = [12, 18, 24, 36, 48, 60];
export const AVAILABLE_MILESTONES: number[] = [6, 12, 18, 24, 30, 36, 42, 48, 54, 60, 72, 84];
export type Milestone = typeof MILESTONES[number];

