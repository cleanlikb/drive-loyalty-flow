export const FIELDS = [
  { key: "name", label: "Customer name", required: true },
  { key: "email", label: "Email" },
  { key: "vehicle_reg", label: "Vehicle registration" },
  { key: "make", label: "Make" },
  { key: "model", label: "Model" },
  { key: "trim", label: "Trim" },
  { key: "sale_date", label: "Sale date (YYYY-MM-DD or DD/MM/YYYY)" },
  { key: "sale_price", label: "Sale price (£)" },
  { key: "finance_type", label: "Finance type" },
  { key: "finance_term_months", label: "Finance term (months)" },
] as const;

export type FieldKey = typeof FIELDS[number]["key"];

export function guessMapping(header: string): FieldKey | null {
  const h = header.toLowerCase().trim();
  if (/(name)/.test(h) && !/(user|company|dealer)/.test(h)) return "name";
  if (/mail/.test(h)) return "email";
  if (/reg/.test(h)) return "vehicle_reg";
  if (/make|manufacturer|brand/.test(h)) return "make";
  if (/model/.test(h)) return "model";
  if (/trim|variant/.test(h)) return "trim";
  if (/date/.test(h)) return "sale_date";
  if (/price|amount|total/.test(h)) return "sale_price";
  if (/(finance).*(type)|deal type/.test(h)) return "finance_type";
  if (/term|months/.test(h)) return "finance_term_months";
  return null;
}

export function parseDate(s: string): string | null {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(s);
  if (iso) return s.slice(0, 10);
  const uk = /^(\d{1,2})[\/-](\d{1,2})[\/-](\d{2,4})/.exec(s);
  if (uk) {
    const [_, d, m, y] = uk;
    const year = y.length === 2 ? Number("20" + y) : Number(y);
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

export function toNumber(s: string): number | null {
  if (!s) return null;
  const n = Number(String(s).replace(/[£,\s]/g, ""));
  return isNaN(n) ? null : n;
}

export type Row = Record<string, string>;

export function mapRows(
  rows: Row[],
  mapping: Record<string, string>,
): Array<Record<string, any>> {
  return rows
    .map((r) => {
      const out: Record<string, any> = {};
      for (const f of FIELDS) {
        const src = mapping[f.key];
        if (!src) continue;
        const val = r[src];
        if (val === undefined || val === "") continue;
        if (f.key === "sale_date") {
          const parsed = parseDate(val);
          if (parsed) out[f.key] = parsed;
        } else if (f.key === "sale_price" || f.key === "finance_term_months") {
          const n = toNumber(val);
          if (n !== null) out[f.key] = n;
        } else {
          out[f.key] = String(val).trim();
        }
      }
      return out;
    })
    .filter((r) => r.name);
}
