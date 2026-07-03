import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listReplies, overrideReplyClassification } from "@/lib/replies.functions";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatDateTime } from "@/lib/format";
import { toast } from "sonner";
import { Flame, MessageSquare } from "lucide-react";

export const Route = createFileRoute("/_authenticated/replies")({
  component: RepliesPage,
});

const LABELS: Record<string, string> = {
  hot_lead: "Hot lead",
  interested: "Interested",
  no_longer_owns: "No longer owns",
  unsubscribe: "Unsubscribed",
  replied: "Other reply",
};

function classBadge(c: string) {
  const variants: Record<string, string> = {
    hot_lead: "bg-orange-100 text-orange-800 border-orange-200",
    interested: "bg-blue-100 text-blue-800 border-blue-200",
    no_longer_owns: "bg-gray-100 text-gray-700 border-gray-200",
    unsubscribe: "bg-red-100 text-red-800 border-red-200",
    replied: "bg-slate-100 text-slate-700 border-slate-200",
  };
  return variants[c] ?? variants.replied;
}

function RepliesPage() {
  const qc = useQueryClient();
  const fetch = useServerFn(listReplies);
  const override = useServerFn(overrideReplyClassification);
  const { data: replies = [], isLoading } = useQuery({
    queryKey: ["replies"],
    queryFn: () => fetch(),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
  });

  const mut = useMutation({
    mutationFn: (v: { id: string; classification: any }) => override({ data: v }),
    onSuccess: () => {
      toast.success("Classification updated");
      qc.invalidateQueries({ queryKey: ["replies"] });
      qc.invalidateQueries({ queryKey: ["hot-leads"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          <MessageSquare className="h-6 w-6" /> Replies
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Every inbound reply, AI-classified. Override any that look wrong — we'll re-apply the customer actions.
        </p>
      </div>

      <Card>
        <div className="divide-y">
          {isLoading && <div className="px-5 py-8 text-sm text-muted-foreground text-center">Loading…</div>}
          {!isLoading && replies.length === 0 && (
            <div className="px-5 py-12 text-sm text-muted-foreground text-center">No replies yet.</div>
          )}
          {replies.map((r: any) => (
            <div key={r.id} className="px-5 py-4 space-y-2">
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {r.classification === "hot_lead" && <Flame className="h-4 w-4 text-orange-600" />}
                    <Link
                      to="/sequences/$id"
                      params={{ id: r.sequence_id }}
                      className="font-medium hover:underline"
                    >
                      {r.customer?.name ?? "Unknown"}
                    </Link>
                    <span className="text-xs text-muted-foreground">
                      {r.customer?.make} {r.customer?.model}
                    </span>
                    <Badge className={classBadge(r.classification) + " border"}>
                      {LABELS[r.classification] ?? r.classification}
                    </Badge>
                    {r.manual_override && <Badge variant="outline" className="text-xs">manual</Badge>}
                    {r.confidence != null && !r.manual_override && (
                      <span className="text-xs text-muted-foreground">
                        {Math.round(r.confidence * 100)}% confident
                      </span>
                    )}
                  </div>
                  {r.subject && <div className="text-sm mt-1 text-muted-foreground truncate">Re: {r.subject}</div>}
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
                  <Select
                    value={r.classification}
                    onValueChange={(v) => mut.mutate({ id: r.id, classification: v })}
                  >
                    <SelectTrigger className="h-8 w-40 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {r.summary && <div className="text-sm text-foreground/80"><span className="text-muted-foreground">Summary:</span> {r.summary}</div>}
              {r.next_car_notes && (
                <div className="text-sm text-orange-800 bg-orange-50 border border-orange-200 rounded px-3 py-2">
                  <strong>Next-car mention:</strong> {r.next_car_notes}
                </div>
              )}
              <details className="text-sm">
                <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Read reply</summary>
                <pre className="mt-2 whitespace-pre-wrap text-sm bg-muted/50 p-3 rounded max-h-64 overflow-auto">{r.raw_text}</pre>
              </details>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
