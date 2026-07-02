import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import Papa from "papaparse";
import { useServerFn } from "@tanstack/react-start";
import { completeOnboarding } from "@/lib/dealer.functions";
import { bulkInsertCustomers } from "@/lib/customers.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Check } from "lucide-react";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

type Row = Record<string, string>;

const FIELDS = [
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

function guessMapping(header: string): string | null {
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

function parseDate(s: string): string | null {
  if (!s) return null;
  const iso = /^\d{4}-\d{2}-\d{2}/.exec(s);
  if (iso) return s.slice(0, 10);
  const uk = /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/.exec(s);
  if (uk) {
    const [_, d, m, y] = uk;
    const year = y.length === 2 ? Number("20" + y) : Number(y);
    return `${year}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }
  const d = new Date(s);
  if (!isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

function toNumber(s: string): number | null {
  if (!s) return null;
  const n = Number(String(s).replace(/[£,\s]/g, ""));
  return isNaN(n) ? null : n;
}

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [dealership, setDealership] = useState("");
  const [salesperson, setSalesperson] = useState("");
  const [website, setWebsite] = useState("");
  const [rawRows, setRawRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const saveProfile = useServerFn(completeOnboarding);
  const uploadCustomers = useServerFn(bulkInsertCustomers);

  function handleFile(f: File) {
    Papa.parse<Row>(f, {
      header: true,
      skipEmptyLines: true,
      complete: (res) => {
        const rows = res.data.filter((r) => Object.values(r).some((v) => v && String(v).trim()));
        const hdrs = res.meta.fields ?? [];
        setRawRows(rows);
        setHeaders(hdrs);
        const initial: Record<string, string> = {};
        for (const h of hdrs) {
          const guess = guessMapping(h);
          if (guess) initial[guess] = h;
        }
        setMapping(initial);
      },
    });
  }

  async function finish() {
    setLoading(true);
    try {
      await saveProfile({ data: {
        dealership_name: dealership,
        salesperson_name: salesperson,
        website_url: website || null,
      }});

      if (rawRows.length > 0) {
        const mapped = rawRows.map((r) => {
          const out: any = {};
          for (const f of FIELDS) {
            const src = mapping[f.key];
            if (!src) continue;
            const val = r[src];
            if (val === undefined || val === "") continue;
            if (f.key === "sale_date") out[f.key] = parseDate(val);
            else if (f.key === "sale_price" || f.key === "finance_term_months") {
              const n = toNumber(val);
              if (n !== null) out[f.key] = n;
            } else out[f.key] = String(val).trim();
          }
          return out;
        }).filter((r) => r.name);

        // Batch in chunks of 500
        for (let i = 0; i < mapped.length; i += 500) {
          await uploadCustomers({ data: { rows: mapped.slice(i, i + 500) } });
        }
        toast.success(`Imported ${mapped.length} customers`);
      }
      navigate({ to: "/dashboard" });
    } catch (e: any) {
      toast.error(e?.message ?? "Onboarding failed");
    } finally {
      setLoading(false);
    }
  }

  const steps = ["Dealership", "Team", "Sales history", "Column mapping"];

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <div className="flex items-center gap-3 mb-8">
        {steps.map((s, i) => (
          <div key={s} className="flex items-center gap-3">
            <div className={`h-7 w-7 rounded-full grid place-items-center text-xs font-medium ${i < step ? "bg-primary text-primary-foreground" : i === step ? "border-2 border-primary text-primary" : "border text-muted-foreground"}`}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </div>
            <span className={`text-sm ${i === step ? "font-medium" : "text-muted-foreground"}`}>{s}</span>
            {i < steps.length - 1 && <div className="w-8 h-px bg-border" />}
          </div>
        ))}
      </div>

      <Card className="p-6">
        {step === 0 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Tell us about your dealership</h2>
              <p className="text-sm text-muted-foreground">This appears on your emails.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Dealership name</Label>
              <Input value={dealership} onChange={(e) => setDealership(e.target.value)} placeholder="Whitfield Motors" />
            </div>
            <div className="space-y-1.5">
              <Label>Website (optional)</Label>
              <Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" />
            </div>
            <div className="flex justify-end">
              <Button disabled={!dealership.trim()} onClick={() => setStep(1)}>Continue</Button>
            </div>
          </div>
        )}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Who's signing the emails?</h2>
              <p className="text-sm text-muted-foreground">Every email is signed off by this salesperson.</p>
            </div>
            <div className="space-y-1.5">
              <Label>Salesperson name</Label>
              <Input value={salesperson} onChange={(e) => setSalesperson(e.target.value)} placeholder="James Whitfield" />
            </div>
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(0)}>Back</Button>
              <Button disabled={!salesperson.trim()} onClick={() => setStep(2)}>Continue</Button>
            </div>
          </div>
        )}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Upload your sales history</h2>
              <p className="text-sm text-muted-foreground">CSV with columns for customer, vehicle and sale date. We'll map them in the next step. You can skip this and add data later.</p>
            </div>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            {rawRows.length > 0 && (
              <div className="text-sm text-muted-foreground">Parsed {rawRows.length} rows, {headers.length} columns.</div>
            )}
            <div className="flex justify-between">
              <Button variant="ghost" onClick={() => setStep(1)}>Back</Button>
              <div className="flex gap-2">
                <Button variant="outline" onClick={finish} disabled={loading}>Skip for now</Button>
                <Button onClick={() => setStep(3)} disabled={rawRows.length === 0}>Continue</Button>
              </div>
            </div>
          </div>
        )}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-semibold">Map your columns</h2>
              <p className="text-sm text-muted-foreground">We've guessed where we could. Only "Customer name" is required — missing columns are fine.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>{f.label}{"required" in f && f.required && <span className="text-destructive ml-1">*</span>}</Label>
                  <Select value={mapping[f.key] ?? "__none"} onValueChange={(v) => setMapping((m) => ({ ...m, [f.key]: v === "__none" ? "" : v }))}>
                    <SelectTrigger><SelectValue placeholder="— not in file —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— not in file —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-4">
              <Button variant="ghost" onClick={() => setStep(2)}>Back</Button>
              <Button disabled={!mapping.name || loading} onClick={finish}>
                {loading ? "Importing…" : `Import & finish`}
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
