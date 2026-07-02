import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDashboardStats } from "@/lib/dashboard.functions";
import { getMyDealer } from "@/lib/dealer.functions";
import { loadDemoData } from "@/lib/demo.functions";
import { listHotLeads, clearHotLead } from "@/lib/replies.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Flame, X } from "lucide-react";
import { useEffect } from "react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function activityText(a: any) {
  switch (a.kind) {
    case "demo_loaded": return `Demo data loaded (${a.payload?.customers ?? 0} customers, ${a.payload?.stock ?? 0} stock)`;
    case "cohort_rebuilt": return `Monthly cohort rebuilt — ${a.payload?.added ?? 0} leads`;
    case "sequences_started": return `${a.payload?.created ?? 0} sequences started${a.payload?.failed ? ` (${a.payload.failed} failed)` : ""}`;
    case "reply_logged": return `Reply logged — classified as "${(a.payload?.classification ?? "").replaceAll("_", " ")}"`;
    case "stock_synced": return `Stock synced — ${a.payload?.items ?? 0} items`;
    default: return a.kind;
  }
}

function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchStats = useServerFn(getDashboardStats);
  const fetchDealer = useServerFn(getMyDealer);
  const runDemo = useServerFn(loadDemoData);

  const { data: dealer } = useQuery({ queryKey: ["dealer"], queryFn: () => fetchDealer() });
  const { data: stats } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchStats() });

  useEffect(() => {
    if (dealer && !dealer.onboarded_at) navigate({ to: "/onboarding" });
  }, [dealer, navigate]);

  const demoMut = useMutation({
    mutationFn: () => runDemo(),
    onSuccess: () => {
      toast.success("Demo data loaded");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const cards = [
    { label: "This month's cohort", value: stats?.cohortSize ?? 0 },
    { label: "Sequences started", value: stats?.sequencesStarted ?? 0 },
    { label: "Emails sent", value: stats?.emailsSent ?? 0 },
    { label: "Replies", value: stats?.replies ?? 0 },
    { label: "No longer owns removals", value: stats?.noLongerOwns ?? 0 },
  ];

  const isEmpty = (stats?.cohortSize ?? 0) === 0 && (stats?.activity?.length ?? 0) === 0;

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-8">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground mt-1">Welcome{dealer?.dealership_name ? `, ${dealer.dealership_name}` : ""}.</p>
        </div>
        <Link to="/leads"><Button>View this month's leads <ArrowRight className="ml-2 h-4 w-4" /></Button></Link>
      </div>

      {isEmpty && (
        <Card className="p-6 bg-accent/30 border-accent">
          <div className="flex items-start gap-4">
            <div className="rounded-md bg-primary/10 p-2"><Sparkles className="h-5 w-5 text-primary" /></div>
            <div className="flex-1">
              <h3 className="font-semibold">Try it with realistic UK demo data</h3>
              <p className="text-sm text-muted-foreground mt-1">Load ~20 customers spanning every milestone, 10 stock cars, and one active sequence in one click.</p>
              <Button className="mt-3" onClick={() => demoMut.mutate()} disabled={demoMut.isPending}>
                {demoMut.isPending ? "Loading…" : "Load demo data"}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {cards.map((c) => (
          <Card key={c.label} className="p-5">
            <div className="text-xs text-muted-foreground uppercase tracking-wide">{c.label}</div>
            <div className="text-3xl font-semibold tracking-tight mt-2">{c.value}</div>
          </Card>
        ))}
      </div>

      <Card>
        <div className="px-5 py-4 border-b">
          <h2 className="font-semibold">Recent activity</h2>
        </div>
        <div className="divide-y">
          {(stats?.activity ?? []).length === 0 && (
            <div className="px-5 py-8 text-sm text-muted-foreground text-center">Nothing yet.</div>
          )}
          {(stats?.activity ?? []).map((a: any) => (
            <div key={a.id} className="px-5 py-3 flex items-center justify-between text-sm">
              <span>{activityText(a)}</span>
              <span className="text-muted-foreground">{formatDateTime(a.created_at)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
