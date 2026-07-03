import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getSequence, updateEmailDraft, stopSequence, logReply, regenerateSequenceEmail } from "@/lib/sequences.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDateTime, formatGbp, formatDate } from "@/lib/format";
import { toast } from "sonner";
import { useState } from "react";
import { ArrowLeft, Sparkles, Eye, MousePointerClick, MessageSquare, Send } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";


export const Route = createFileRoute("/_authenticated/sequences/$id")({
  component: SequenceDetail,
});

function EmailCard({ e, seqType, onSave, onRegen }: { e: any; seqType: "trade_in" | "buy_back"; onSave: (payload: { id: string; subject: string; body: string }) => Promise<void>; onRegen: (payload: { id: string; sequenceType: "trade_in" | "buy_back"; instruction?: string }) => Promise<void> }) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(e.subject);
  const [body, setBody] = useState(e.body);
  const [saving, setSaving] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenType, setRegenType] = useState<"trade_in" | "buy_back">(seqType);
  const [regenInstr, setRegenInstr] = useState("");
  const canEdit = e.status === "draft" || e.status === "scheduled";
  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-primary/10 text-primary grid place-items-center text-sm font-semibold">{e.step}</div>
          <div>
            <div className="text-xs text-muted-foreground">Day {e.send_offset_days}</div>
            <div className="font-medium">Step {e.step}</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={e.status} />
          {e.status === "sent" && <EngagementTimeline e={e} />}
          <span className="text-xs text-muted-foreground">
            {e.sent_at ? `Sent ${formatDateTime(e.sent_at)}` : e.scheduled_for ? `Scheduled ${formatDateTime(e.scheduled_for)}` : ""}
          </span>
        </div>
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Subject</Label><Input value={subject} onChange={(ev) => setSubject(ev.target.value)} /></div>
          <div className="space-y-1.5"><Label>Body</Label><Textarea rows={10} value={body} onChange={(ev) => setBody(ev.target.value)} /></div>
          <div className="flex gap-2 justify-end">
            <Button variant="ghost" onClick={() => { setSubject(e.subject); setBody(e.body); setEditing(false); }}>Cancel</Button>
            <Button
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try { await onSave({ id: e.id, subject, body }); toast.success("Saved"); setEditing(false); }
                catch (er: any) { toast.error(er?.message ?? "Save failed"); }
                finally { setSaving(false); }
              }}
            >{saving ? "Saving…" : "Save"}</Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="font-medium">{e.subject}</div>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">{e.body}</pre>
          {canEdit && (
            <div className="pt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>Edit draft</Button>
              <Button
                variant="outline"
                size="sm"
                disabled={regenerating}
                onClick={() => { setRegenType(seqType); setRegenInstr(""); setRegenOpen(true); }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {regenerating ? "Regenerating…" : "Regenerate"}
              </Button>
              <Dialog open={regenOpen} onOpenChange={setRegenOpen}>
                <DialogContent>
                  <DialogHeader><DialogTitle>Regenerate email</DialogTitle></DialogHeader>
                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label>Sequence type</Label>
                      <Select value={regenType} onValueChange={(v) => setRegenType(v as "trade_in" | "buy_back")}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="trade_in">Trade-in / Upgrade</SelectItem>
                          <SelectItem value="buy_back">Buy-back offer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Extra instruction (optional)</Label>
                      <Textarea rows={3} value={regenInstr} onChange={(ev) => setRegenInstr(ev.target.value)} placeholder="e.g. mention we take cars in any condition" />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="ghost" onClick={() => setRegenOpen(false)}>Cancel</Button>
                    <Button
                      disabled={regenerating}
                      onClick={async () => {
                        setRegenerating(true);
                        try {
                          await onRegen({ id: e.id, sequenceType: regenType, instruction: regenInstr.trim() || undefined });
                          toast.success("Regenerated");
                          setRegenOpen(false);
                        } catch (er: any) { toast.error(er?.message ?? "Regenerate failed"); }
                        finally { setRegenerating(false); }
                      }}
                    >
                      <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                      {regenerating ? "Regenerating…" : "Regenerate"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}


function EngagementTimeline({ e }: { e: any }) {
  const nodes = [
    { icon: Send, label: "Sent", active: !!e.sent_at, at: e.sent_at },
    { icon: Eye, label: "Opened", active: !!e.opened_at, at: e.opened_at, count: e.open_count },
    { icon: MousePointerClick, label: "Clicked", active: !!e.first_clicked_at, at: e.first_clicked_at, count: e.click_count },
    { icon: MessageSquare, label: "Replied", active: !!e.replied_at, at: e.replied_at },
  ];
  return (
    <div className="flex items-center gap-1" aria-label="Engagement timeline">
      {nodes.map((n, i) => (
        <div key={n.label} className="flex items-center">
          <div
            className={`flex items-center justify-center h-6 w-6 rounded-full border ${n.active ? "bg-primary/10 border-primary text-primary" : "bg-muted border-muted-foreground/20 text-muted-foreground/40"}`}
            title={`${n.label}${n.at ? ` — ${formatDateTime(n.at)}` : ""}${n.count && n.count > 1 ? ` (${n.count} times)` : ""}`}
          >
            <n.icon className="h-3 w-3" />
          </div>
          {i < nodes.length - 1 && (
            <div className={`w-3 h-px ${n.active ? "bg-primary/30" : "bg-muted-foreground/20"}`} />
          )}
        </div>
      ))}
    </div>
  );
}

function SequenceDetail() {

  const { id } = Route.useParams();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const fetchOne = useServerFn(getSequence);
  const update = useServerFn(updateEmailDraft);
  const stop = useServerFn(stopSequence);
  const reply = useServerFn(logReply);
  const regen = useServerFn(regenerateSequenceEmail);
  const { data } = useQuery({ queryKey: ["sequence", id], queryFn: () => fetchOne({ data: { id } }) });
  const [replyText, setReplyText] = useState("");
  const [replyOpen, setReplyOpen] = useState(false);

  const stopMut = useMutation({
    mutationFn: () => stop({ data: { id } }),
    onSuccess: () => { toast.success("Sequence stopped"); qc.invalidateQueries(); },
  });

  const replyMut = useMutation({
    mutationFn: (text: string) => reply({ data: { sequenceId: id, text } }),
    onSuccess: (r) => {
      toast.success(`Reply logged — classified as ${r.classification.classification.replaceAll("_", " ")}`);
      setReplyOpen(false); setReplyText("");
      qc.invalidateQueries();
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  if (!data) return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;

  return (
    <div className="max-w-4xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <button onClick={() => navigate({ to: "/sequences" })} className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-3">
          <ArrowLeft className="h-4 w-4" /> Back to sequences
        </button>
        <div className="flex items-start justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">{data.customer?.name}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {data.customer?.email} · Bought {data.customer?.make} {data.customer?.model} on {formatDate(data.customer?.sale_date)} for {formatGbp(data.customer?.sale_price)}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <StatusBadge status={data.status} />
            {["active", "scheduled", "drafting"].includes(data.status) && (
              <>
                <Dialog open={replyOpen} onOpenChange={setReplyOpen}>
                  <DialogTrigger asChild><Button variant="outline">Log reply</Button></DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Log a customer reply</DialogTitle></DialogHeader>
                    <p className="text-sm text-muted-foreground">Paste or summarise their reply. Wynback classifies it, cancels remaining emails, and flags the customer if needed.</p>
                    <Textarea rows={6} value={replyText} onChange={(e) => setReplyText(e.target.value)} placeholder="e.g. Thanks, but I sold the car last year — please take me off the list." />
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setReplyOpen(false)}>Cancel</Button>
                      <Button onClick={() => replyMut.mutate(replyText)} disabled={!replyText.trim() || replyMut.isPending}>{replyMut.isPending ? "Analysing…" : "Log & classify"}</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Button variant="outline" onClick={() => stopMut.mutate()} disabled={stopMut.isPending}>Stop</Button>
              </>
            )}
          </div>
        </div>
        {data.stopped_reason && (
          <div className="mt-3 text-sm text-muted-foreground">Reason: {data.stopped_reason}</div>
        )}
      </div>

      <div className="space-y-4">
        {(data.sequence_emails ?? []).map((e: any) => (
          <EmailCard key={e.id} e={e} seqType={(data.sequence_type ?? "trade_in") as "trade_in" | "buy_back"}
            onSave={async (payload) => {
              await update({ data: payload });
              qc.invalidateQueries({ queryKey: ["sequence", id] });
            }}
            onRegen={async (payload) => {
              await regen({ data: payload });
              qc.invalidateQueries({ queryKey: ["sequence", id] });
            }}
          />
        ))}
      </div>

      {(data.replies ?? []).length > 0 && (
        <Card>
          <div className="px-5 py-3 border-b"><h3 className="font-semibold">Replies</h3></div>
          <div className="divide-y">
            {data.replies.map((r: any) => (
              <div key={r.id} className="p-5">
                <div className="flex items-center gap-2 mb-2">
                  <StatusBadge status={r.classification} />
                  <span className="text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
                </div>
                <p className="text-sm whitespace-pre-wrap">{r.raw_text}</p>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
