import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getCurrentCohort, rebuildCurrentCohort, toggleCohortSelection } from "@/lib/cohorts.functions";
import { startSequencesForSelected } from "@/lib/sequences.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { MilestoneBadge } from "@/components/MilestoneBadge";
import { MILESTONES, formatDate, formatGbp } from "@/lib/format";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { RefreshCw, Send } from "lucide-react";

export const Route = createFileRoute("/_authenticated/leads")({
  component: Leads,
});

function Leads() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchCohort = useServerFn(getCurrentCohort);
  const rebuild = useServerFn(rebuildCurrentCohort);
  const toggle = useServerFn(toggleCohortSelection);
  const startSeq = useServerFn(startSequencesForSelected);

  const { data, isLoading } = useQuery({ queryKey: ["cohort"], queryFn: () => fetchCohort() });
  const [busy, setBusy] = useState(false);

  const generateLeads = useMutation({
    mutationFn: () => rebuild(),
    onSuccess: (r) => { toast.success(`Leads generated — ${r.added} leads`); qc.invalidateQueries({ queryKey: ["cohort"] }); qc.invalidateQueries({ queryKey: ["dashboard"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });


  const grouped = useMemo(() => {
    const rows = data?.rows ?? [];
    const g: Record<number, any[]> = {};
    for (const m of MILESTONES) g[m] = [];
    for (const r of rows) { (g[r.milestone_months] ??= []).push(r); }
    return g;
  }, [data]);

  const availableRows = (data?.rows ?? []).filter((r: any) => !r.sequence_id);
  const selectedIds = availableRows.filter((r: any) => r.selected).map((r: any) => r.id);

  async function toggleRow(id: string, selected: boolean) {
    await toggle({ data: { ids: [id], selected } });
    qc.invalidateQueries({ queryKey: ["cohort"] });
  }
  async function toggleGroup(months: number, selected: boolean) {
    const ids = grouped[months].filter((r: any) => !r.sequence_id).map((r: any) => r.id);
    if (ids.length === 0) return;
    await toggle({ data: { ids, selected } });
    qc.invalidateQueries({ queryKey: ["cohort"] });
  }
  async function toggleAll(selected: boolean) {
    const ids = availableRows.map((r: any) => r.id);
    if (ids.length === 0) return;
    await toggle({ data: { ids, selected } });
    qc.invalidateQueries({ queryKey: ["cohort"] });
  }

  async function startForSelected() {
    if (selectedIds.length === 0) return;
    setBusy(true);
    try {
      const r = await startSeq({ data: { cohortCustomerIds: selectedIds } });
      toast.success(`${r.created} draft sequences generated — review and start them on the Sequences page`);
      qc.invalidateQueries();
      navigate({ to: "/sequences" });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate sequences");
    } finally { setBusy(false); }
  }

  const totalActive = availableRows.length;

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Monthly leads</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Customers hitting a purchase anniversary this month.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => generateLeads.mutate()} disabled={generateLeads.isPending}>
            <RefreshCw className={`h-4 w-4 mr-2 ${generateLeads.isPending ? "animate-spin" : ""}`} />
            Generate leads
          </Button>

          <Button onClick={startForSelected} disabled={selectedIds.length === 0 || busy}>
            <Send className="h-4 w-4 mr-2" />
            {busy ? "Generating…" : `Generate sequences for selected (${selectedIds.length})`}
          </Button>
        </div>
      </div>

      {!isLoading && totalActive === 0 && (
        <Card className="p-8 text-center">
          {(data?.rows?.length ?? 0) === 0 ? (
            <p className="text-sm text-muted-foreground">
              No leads found for this month yet. Click <strong>Generate leads</strong> to find customers whose purchase anniversary falls this month.
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">
              All available leads for this month have already had sequences started.
            </p>
          )}
        </Card>
      )}


      {totalActive > 0 && (
        <Card className="p-4 flex items-center gap-3 bg-accent/30">
          <Checkbox
            checked={selectedIds.length === totalActive}
            onCheckedChange={(v) => toggleAll(Boolean(v))}
          />
          <span className="text-sm font-medium">Select all ({totalActive})</span>
        </Card>
      )}

      {MILESTONES.map((m) => {
        const rows = grouped[m] ?? [];
        if (rows.length === 0) return null;
        const groupSelected = rows.filter((r: any) => !r.sequence_id).every((r: any) => r.selected);
        return (
          <Card key={m}>
            <div className="px-5 py-3 border-b flex items-center gap-3">
              <Checkbox checked={groupSelected && rows.some((r: any) => !r.sequence_id)} onCheckedChange={(v) => toggleGroup(m, Boolean(v))} />
              <MilestoneBadge months={m} />
              <span className="text-sm text-muted-foreground">{rows.length} customer{rows.length === 1 ? "" : "s"}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/40 text-muted-foreground">
                  <tr>
                    <th className="w-10"></th>
                    <th className="text-left px-4 py-2 font-medium">Customer</th>
                    <th className="text-left px-4 py-2 font-medium">Their car</th>
                    <th className="text-left px-4 py-2 font-medium">Purchase date</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {rows.map((r: any) => (
                    <tr key={r.id} className="hover:bg-accent/20">
                      <td className="pl-4 py-3">
                        <Checkbox
                          disabled={!!r.sequence_id}
                          checked={r.selected}
                          onCheckedChange={(v) => toggleRow(r.id, Boolean(v))}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.customer?.name}</div>
                        <div className="text-xs text-muted-foreground">{r.customer?.email ?? "—"}</div>
                      </td>
                      <td className="px-4 py-3">
                        <div>{r.customer?.make} {r.customer?.model}</div>
                        <div className="text-xs text-muted-foreground">{r.customer?.trim ?? ""} · {formatGbp(r.customer?.sale_price)}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{formatDate(r.customer?.sale_date)}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {r.sequence_id ? "In sequence" : "Ready"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
