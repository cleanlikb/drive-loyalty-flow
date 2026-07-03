import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDashboardStats, getMetricDetails } from "@/lib/dashboard.functions";
import { getMyDealer } from "@/lib/dealer.functions";
import { loadDemoData } from "@/lib/demo.functions";
import { listHotLeads, clearHotLead } from "@/lib/replies.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { ArrowRight, Sparkles, Flame, X, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function activityText(a: any) {
  switch (a.kind) {
    case "demo_loaded": return `Demo data loaded (${a.payload?.customers ?? 0} customers, ${a.payload?.stock ?? 0} stock)`;
    case "leads_generated": return `Leads generated — ${a.payload?.added ?? 0} leads`;
    case "cohort_rebuilt": return `Leads generated — ${a.payload?.added ?? 0} leads`;
    case "sequences_started": return `${a.payload?.created ?? 0} sequences started${a.payload?.failed ? ` (${a.payload.failed} failed)` : ""}`;
    case "emails_sent": return `${a.payload?.count ?? 0} emails sent`;
    case "reply_logged": return `Reply received — classified as "${(a.payload?.classification ?? "").replaceAll("_", " ")}"`;
    case "reply_received": return `Reply received — classified as "${(a.payload?.classification ?? "").replaceAll("_", " ")}"`;
    case "stock_synced": return `Stock synced — ${a.payload?.items ?? 0} items`;
    default: return a.kind;
  }
}



function Dashboard() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchStats = useServerFn(getDashboardStats);
  const fetchDealer = useServerFn(getMyDealer);
  const fetchHot = useServerFn(listHotLeads);
  const clearHot = useServerFn(clearHotLead);
  const runDemo = useServerFn(loadDemoData);

  const { data: dealer } = useQuery({ queryKey: ["dealer"], queryFn: () => fetchDealer() });
  const { data: stats } = useQuery({ queryKey: ["dashboard"], queryFn: () => fetchStats() });
  const { data: hotLeads = [] } = useQuery({ queryKey: ["hot-leads"], queryFn: () => fetchHot() });

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

  const clearMut = useMutation({
    mutationFn: (customerId: string) => clearHot({ data: { customerId } }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["hot-leads"] }); },
  });

  const interestedTotal = (stats?.hotLeads ?? 0) + (stats?.interested ?? 0);
  const cards: {
    key: "leads" | "sequencesStarted" | "emailsSent" | "replies" | "interested" | "noLongerOwns";
    label: string;
    value: number;
    sub?: string;
    accent?: boolean;
  }[] = [
    { key: "leads", label: "This month's leads", value: stats?.leads ?? 0 },
    { key: "sequencesStarted", label: "Sequences started", value: stats?.sequencesStarted ?? 0 },
    { key: "emailsSent", label: "Emails sent", value: stats?.emailsSent ?? 0 },
    { key: "replies", label: "Replies", value: stats?.replies ?? 0 },
    {
      key: "interested",
      label: "Interested + hot leads",
      value: interestedTotal,
      sub: `${stats?.hotLeads ?? 0} hot · ${stats?.interested ?? 0} interested`,
      accent: interestedTotal > 0,
    },
    { key: "noLongerOwns", label: "No longer owns removals", value: stats?.noLongerOwns ?? 0 },
  ];

  const [activeMetric, setActiveMetric] = useState<typeof cards[number]["key"]>("emailsSent");
  const fetchDetails = useServerFn(getMetricDetails);
  const { data: details = [], isFetching: detailsLoading } = useQuery({
    queryKey: ["dashboard-details", activeMetric],
    queryFn: () => fetchDetails({ data: { metric: activeMetric } }),
  });
  const activeLabel = cards.find((c) => c.key === activeMetric)?.label ?? "";


  const isEmpty = (stats?.leads ?? 0) === 0 && (stats?.activity?.length ?? 0) === 0;

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

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {cards.map((c: any) => (
          <Card key={c.label} className={`p-5 ${c.accent ? "border-orange-200 bg-orange-50/50" : ""}`}>
            <div className="text-xs text-muted-foreground uppercase tracking-wide flex items-center gap-1">
              {c.accent && <Flame className="h-3 w-3 text-orange-600" />}
              {c.label}
            </div>
            <div className="text-3xl font-semibold tracking-tight mt-2">{c.value}</div>
            {c.sub && <div className="text-xs text-muted-foreground mt-1">{c.sub}</div>}
          </Card>
        ))}
      </div>

      {hotLeads.length > 0 && (
        <Card className="border-orange-200 bg-orange-50/50">
          <div className="px-5 py-4 border-b border-orange-200 flex items-center justify-between">
            <h2 className="font-semibold flex items-center gap-2 text-orange-900">
              <Flame className="h-5 w-5 text-orange-600" /> Hot leads ({hotLeads.length})
            </h2>
            <Link to="/replies" className="text-xs text-orange-700 hover:underline">View all replies →</Link>
          </div>
          <div className="divide-y divide-orange-100">
            {hotLeads.map((l: any) => (
              <div key={l.id} className="px-5 py-3 flex items-center justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{l.name} <span className="text-muted-foreground font-normal">— {l.make} {l.model}</span></div>
                  {l.next_car_notes && <div className="text-xs text-orange-800 mt-0.5 truncate">💡 {l.next_car_notes}</div>}
                </div>
                <span className="text-xs text-muted-foreground">{formatDateTime(l.hot_lead_at)}</span>
                <button
                  onClick={() => clearMut.mutate(l.id)}
                  className="p-1 rounded hover:bg-orange-100 text-muted-foreground"
                  title="Dismiss"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        </Card>
      )}

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
