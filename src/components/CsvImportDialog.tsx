import { useState } from "react";
import Papa from "papaparse";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FIELDS, guessMapping, Row, mapRows } from "@/lib/csv-import";

export function CsvImportDialog({
  children,
  onImport,
}: {
  children: React.ReactNode;
  onImport: (rows: Array<Record<string, any>>) => Promise<void> | void;
}) {
  const [open, setOpen] = useState(false);
  const [rawRows, setRawRows] = useState<Row[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"upload" | "map">("upload");

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
        setStep("map");
      },
    });
  }

  async function confirm() {
    if (!mapping.name) return;
    const mapped = mapRows(rawRows, mapping);
    if (mapped.length === 0) {
      toast.error("No rows with a customer name found");
      return;
    }
    setLoading(true);
    try {
      await onImport(mapped);
      toast.success(`Imported ${mapped.length} customers`);
      setOpen(false);
      reset();
    } catch (e: any) {
      toast.error(e?.message ?? "Import failed");
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setRawRows([]);
    setHeaders([]);
    setMapping({});
    setStep("upload");
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) reset(); }}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Import customers from CSV</DialogTitle>
        </DialogHeader>
        {step === "upload" ? (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Upload a CSV of your previous sales. We'll match the columns in the next step.
              Only "Customer name" is required — the rest help us personalise emails.
            </p>
            <input
              type="file"
              accept=".csv,text/csv"
              onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
              className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
            />
            <div className="text-sm text-muted-foreground">
              <span className="font-medium">Expected columns:</span>{" "}
              Customer name*, Email, Vehicle reg, Make, Model, Trim, Sale date, Sale price, Finance type, Finance term.
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Parsed {rawRows.length} rows, {headers.length} columns. We guessed where we could — adjust if needed.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {FIELDS.map((f) => (
                <div key={f.key} className="space-y-1.5">
                  <Label>
                    {f.label}
                    {"required" in f && f.required && <span className="text-destructive ml-1">*</span>}
                  </Label>
                  <Select
                    value={mapping[f.key] ?? "__none"}
                    onValueChange={(v) =>
                      setMapping((m) => ({ ...m, [f.key]: v === "__none" ? "" : v }))
                    }
                  >
                    <SelectTrigger><SelectValue placeholder="— not in file —" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none">— not in file —</SelectItem>
                      {headers.map((h) => <SelectItem key={h} value={h}>{h}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
            <div className="flex justify-between pt-2">
              <Button variant="ghost" onClick={() => setStep("upload")}>Back</Button>
              <Button disabled={!mapping.name || loading} onClick={confirm}>
                {loading ? "Importing…" : `Import ${mapRows(rawRows, mapping).length} customers`}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
