import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { listSequences } from "@/lib/sequences.functions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate } from "@/lib/format";

export const Route = createFileRoute("/_authenticated/sequences/")({
  component: Sequences,
});

function Sequences() {
  const fetchSeqs = useServerFn(listSequences);
  const navigate = useNavigate();
  const { data = [] } = useQuery({ queryKey: ["sequences"], queryFn: () => fetchSeqs() });

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sequences</h1>
        <p className="text-sm text-muted-foreground mt-1">All customer email sequences.</p>
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Customer</th>
                <th className="text-left px-4 py-2 font-medium">Their car</th>
                <th className="text-left px-4 py-2 font-medium">Matched to</th>
                <th className="text-left px-4 py-2 font-medium">Timeline</th>
                <th className="text-left px-4 py-2 font-medium">Started</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((s: any) => {
                const emails = (s.sequence_emails ?? []).sort((a: any, b: any) => a.step - b.step);
                return (
                  <tr
                    key={s.id}
                    onClick={() => navigate({ to: "/sequences/$id", params: { id: s.id } })}
                    className="hover:bg-accent/30 cursor-pointer"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium hover:underline">{s.customer?.name}</div>
                      <div className="text-xs text-muted-foreground">{s.customer?.email}</div>
                    </td>
                    <td className="px-4 py-3">{s.customer?.make} {s.customer?.model}</td>
                    <td className="px-4 py-3">{s.stock ? `${s.stock.year ?? ""} ${s.stock.make} ${s.stock.model}` : "—"}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        {emails.map((e: any) => (
                          <span key={e.step} title={`Step ${e.step}: ${e.status}`}
                            className={`h-2 w-6 rounded-sm ${e.status === "sent" ? "bg-success" : e.status === "scheduled" ? "bg-chart-1" : e.status === "cancelled" ? "bg-destructive/50" : "bg-muted"}`}
                          />
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{formatDate(s.started_at)}</td>
                    <td className="px-4 py-3"><StatusBadge status={s.status} /></td>
                  </tr>
                );
              })}
              {data.length === 0 && (
                <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">No sequences yet. Start one from the Leads page.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
