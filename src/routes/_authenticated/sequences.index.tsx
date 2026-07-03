import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSequences,
  updateEmailDraft,
  stopSequence,
  regenerateSequenceEmail,
  startSequence,
} from "@/lib/sequences.functions";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { toast } from "sonner";
import { useState } from "react";
import { Sparkles, Send, StopCircle, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sequences/")({
  component: Sequences,
});

function EmailBlock({
  e,
  onSave,
  onRegen,
}: {
  e: any;
  onSave: (p: { id: string; subject: string; body: string }) => Promise<void>;
  onRegen: (p: { id: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(e.subject);
  const [body, setBody] = useState(e.body);
  const [saving, setSaving] = useState(false);
  const [regen, setRegen] = useState(false);
  const canEdit = e.status === "draft" || e.status === "scheduled";
  return (
    <div className="rounded-lg border bg-background p-4">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="h-7 w-7 rounded-full bg-primary/10 text-primary grid place-items-center text-xs font-semibold">
            {e.step}
          </div>
          <div className="text-xs text-muted-foreground">
            Day {e.send_offset_days}
            {e.sent_at
              ? ` · Sent ${formatDateTime(e.sent_at)}`
              : e.scheduled_for
              ? ` · Scheduled ${formatDateTime(e.scheduled_for)}`
              : ""}
          </div>
        </div>
        <StatusBadge status={e.status} />
      </div>

      {editing ? (
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Subject</Label>
            <Input value={subject} onChange={(ev) => setSubject(ev.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Body</Label>
            <Textarea rows={8} value={body} onChange={(ev) => setBody(ev.target.value)} />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setSubject(e.subject);
                setBody(e.body);
                setEditing(false);
              }}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  await onSave({ id: e.id, subject, body });
                  toast.success("Saved");
                  setEditing(false);
                } catch (er: any) {
                  toast.error(er?.message ?? "Save failed");
                } finally {
                  setSaving(false);
                }
              }}
            >
              {saving ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="font-medium text-sm">{e.subject}</div>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground font-sans">
            {e.body}
          </pre>
          {canEdit && (
            <div className="pt-2 flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                Edit draft
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={regen}
                onClick={async () => {
                  setRegen(true);
                  try {
                    await onRegen({ id: e.id });
                    toast.success("Regenerated");
                  } catch (er: any) {
                    toast.error(er?.message ?? "Regenerate failed");
                  } finally {
                    setRegen(false);
                  }
                }}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {regen ? "Regenerating…" : "Regenerate"}
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Sequences() {
  const fetchSeqs = useServerFn(listSequences);
  const update = useServerFn(updateEmailDraft);
  const stop = useServerFn(stopSequence);
  const regen = useServerFn(regenerateSequenceEmail);
  const startFn = useServerFn(startSequence);
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["sequences"],
    queryFn: () => fetchSeqs(),
  });

  const stopMut = useMutation({
    mutationFn: (id: string) => stop({ data: { id } }),
    onSuccess: () => {
      toast.success("Sequence stopped");
      qc.invalidateQueries({ queryKey: ["sequences"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const startMut = useMutation({
    mutationFn: (id: string) => startFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Sequence started — emails will send on schedule");
      qc.invalidateQueries({ queryKey: ["sequences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });


  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sequences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Click a customer to review or edit their 3-email sequence.
        </p>
      </div>

      <Card className="p-2">
        {data.length === 0 ? (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No sequences yet. Start one from the Leads page.
          </div>
        ) : (
          <Accordion type="multiple" className="w-full">
            {data.map((s: any) => {
              const emails = (s.sequence_emails ?? []).sort(
                (a: any, b: any) => a.step - b.step,
              );
              const isDraft = s.status === "drafting";
              const canStop = ["active", "scheduled", "drafting"].includes(s.status);
              const sentCount = emails.filter((e: any) => e.status === "sent").length;

              return (
                <AccordionItem key={s.id} value={s.id} className="border-b last:border-0">
                  <AccordionTrigger className="hover:no-underline px-3 py-3">
                    <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-left">
                      <div className="md:col-span-2">
                        <div className="font-medium">{s.customer?.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {s.customer?.email}
                        </div>
                      </div>
                      <div className="text-sm">
                        {s.customer?.make} {s.customer?.model}
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">
                          {emails.map((e: any) => (
                            <span
                              key={e.step}
                              title={`Step ${e.step}: ${e.status}`}
                              className={`h-2 w-6 rounded-sm ${
                                e.status === "sent"
                                  ? "bg-success"
                                  : e.status === "scheduled"
                                  ? "bg-chart-1"
                                  : e.status === "cancelled"
                                  ? "bg-destructive/50"
                                  : "bg-muted"
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-xs text-muted-foreground">
                          {sentCount}/{emails.length}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 md:justify-end">
                        <StatusBadge status={s.status} />
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-4">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                        <div>
                          Started {formatDate(s.started_at)} · Milestone{" "}
                          {s.customer?.sale_date
                            ? `from ${formatDate(s.customer.sale_date)}`
                            : ""}
                        </div>
                        <div className="flex gap-2">
                          {isDraft && (
                            <Button
                              size="sm"
                              disabled={startMut.isPending}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                startMut.mutate(s.id);
                              }}
                            >
                              <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                              Start sequence
                            </Button>
                          )}
                          {canStop && (
                            <Button
                              variant="outline"
                              size="sm"
                              disabled={stopMut.isPending}
                              onClick={(ev) => {
                                ev.stopPropagation();
                                stopMut.mutate(s.id);
                              }}
                            >
                              <StopCircle className="h-3.5 w-3.5 mr-1.5" />
                              Stop sequence
                            </Button>
                          )}
                        </div>
                      </div>

                      {isDraft ? (
                        <div className="rounded-md bg-muted/60 border px-3 py-2 text-xs text-muted-foreground flex items-center gap-2">
                          <PlayCircle className="h-3.5 w-3.5" />
                          Draft — review and edit the emails below, then click Start sequence to schedule sending.
                        </div>
                      ) : canStop ? (
                        <div className="rounded-md bg-primary/5 border border-primary/20 px-3 py-2 text-xs text-primary flex items-center gap-2">
                          <Send className="h-3.5 w-3.5" />
                          Sequence is live — emails will send on their scheduled dates.
                        </div>
                      ) : null}


                      <div className="space-y-3">
                        {emails.map((e: any) => (
                          <EmailBlock
                            key={e.id}
                            e={e}
                            onSave={async (p) => {
                              await update({ data: p });
                              qc.invalidateQueries({ queryKey: ["sequences"] });
                            }}
                            onRegen={async (p) => {
                              await regen({ data: p });
                              qc.invalidateQueries({ queryKey: ["sequences"] });
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        )}
      </Card>
    </div>
  );
}
