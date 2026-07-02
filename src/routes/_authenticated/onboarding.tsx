import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
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
import { FIELDS, guessMapping, Row, mapRows } from "@/lib/csv-import";

export const Route = createFileRoute("/_authenticated/onboarding")({
  component: Onboarding,
});

function Onboarding() {
  const navigate = useNavigate();
  const qc = useQueryClient();
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
        const mapped = mapRows(rawRows, mapping);
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
