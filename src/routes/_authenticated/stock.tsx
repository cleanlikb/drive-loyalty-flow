import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listStock, syncStockFromUrl, bulkInsertStock } from "@/lib/stock.functions";
import { getMyDealer } from "@/lib/dealer.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatDateTime, formatGbp } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import Papa from "papaparse";
import { RefreshCw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/stock")({
  component: Stock,
});

function Stock() {
  const qc = useQueryClient();
  const fetchStock = useServerFn(listStock);
  const fetchDealer = useServerFn(getMyDealer);
  const sync = useServerFn(syncStockFromUrl);
  const uploadCsv = useServerFn(bulkInsertStock);

  const { data } = useQuery({ queryKey: ["stock"], queryFn: () => fetchStock() });
  const { data: dealer } = useQuery({ queryKey: ["dealer"], queryFn: () => fetchDealer() });
  const [url, setUrl] = useState("");

  const syncMut = useMutation({
    mutationFn: (u: string) => sync({ data: { url: u } }),
    onSuccess: (r) => {
      if (r.error) toast.error(`Sync issue: ${r.error}`);
      else toast.success(`Synced ${r.itemsFound} items`);
      qc.invalidateQueries({ queryKey: ["stock"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  function handleCsv(f: File) {
    Papa.parse<Record<string, string>>(f, {
      header: true, skipEmptyLines: true,
      complete: async (res) => {
        const rows = res.data.map((r) => ({
          make: r.make || r.Make || "",
          model: r.model || r.Model || "",
          year: r.year ? Number(r.year) : r.Year ? Number(r.Year) : null,
          trim: r.trim || r.Trim || null,
          price: r.price ? Number(String(r.price).replace(/[£,]/g, "")) : null,
          image_url: r.image_url || r.Image || null,
          listing_url: r.listing_url || r.URL || null,
        })).filter((r) => r.make && r.model);
        if (rows.length === 0) { toast.error("No valid rows"); return; }
        try {
          await uploadCsv({ data: { rows } });
          toast.success(`Imported ${rows.length} stock items`);
          qc.invalidateQueries({ queryKey: ["stock"] });
        } catch (e: any) { toast.error(e?.message ?? "Failed"); }
      },
    });
  }

  const stockUrl = dealer?.stock_page_url ?? "";

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Stock</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Last synced: {data?.lastSync ? formatDateTime(data.lastSync.ran_at) : "never"}
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold">Sync from your website</h3>
          <p className="text-sm text-muted-foreground">Paste your stock listings page. We re-scan daily.</p>
          <div className="space-y-1.5">
            <Label>Stock page URL</Label>
            <Input value={url || stockUrl} onChange={(e) => setUrl(e.target.value)} placeholder="https://yourdealership.co.uk/used-cars" />
          </div>
          <Button onClick={() => syncMut.mutate(url || stockUrl)} disabled={syncMut.isPending || !(url || stockUrl)}>
            <RefreshCw className={`h-4 w-4 mr-2 ${syncMut.isPending ? "animate-spin" : ""}`} />
            {syncMut.isPending ? "Syncing…" : "Sync now"}
          </Button>
        </Card>
        <Card className="p-5 space-y-3">
          <h3 className="font-semibold">Or upload a CSV</h3>
          <p className="text-sm text-muted-foreground">Columns: make, model, year, trim, price, image_url, listing_url.</p>
          <input
            type="file" accept=".csv,text/csv"
            onChange={(e) => e.target.files?.[0] && handleCsv(e.target.files[0])}
            className="block w-full text-sm file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
          />
        </Card>
      </div>

      <Card>
        <div className="px-5 py-3 border-b flex items-center justify-between">
          <h3 className="font-semibold">Current stock ({data?.items?.length ?? 0})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Vehicle</th>
                <th className="text-left px-4 py-2 font-medium">Year</th>
                <th className="text-left px-4 py-2 font-medium">Price</th>
                <th className="text-left px-4 py-2 font-medium">Source</th>
                <th className="text-left px-4 py-2 font-medium">Last seen</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {(data?.items ?? []).map((s: any) => (
                <tr key={s.id} className="hover:bg-accent/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{s.make} {s.model}</div>
                    <div className="text-xs text-muted-foreground">{s.trim ?? ""}</div>
                  </td>
                  <td className="px-4 py-3">{s.year ?? "—"}</td>
                  <td className="px-4 py-3">{formatGbp(s.price)}</td>
                  <td className="px-4 py-3 text-xs uppercase tracking-wide text-muted-foreground">{s.source}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDateTime(s.last_seen_at)}</td>
                </tr>
              ))}
              {(data?.items?.length ?? 0) === 0 && (
                <tr><td colSpan={5} className="text-center py-10 text-muted-foreground">No stock yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
