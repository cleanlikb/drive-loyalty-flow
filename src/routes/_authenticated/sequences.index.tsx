import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  listSequences,
  updateEmailDraft,
  stopSequence,
  regenerateSequenceEmail,
  startSequence,
  startSequencesBulk,
} from "@/lib/sequences.functions";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatDateTime } from "@/lib/format";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useMemo, useState } from "react";
import { Sparkles, Send, StopCircle, PlayCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sequences/")({
  component: Sequences,
});

type SeqType = "trade_in" | "buy_back";

function RegenDialog({
  open,
  onOpenChange,
  currentType,
  onConfirm,
  busy,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  currentType: SeqType;
  onConfirm: (type: SeqType, instruction?: string) => Promise<void>;
  busy: boolean;
}) {
  const [type, setType] = useState<SeqType>(currentType);
  const [instruction, setInstruction] = useState("");
  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (v) {
          setType(currentType);
          setInstruction("");
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Regenerate email</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Sequence type</Label>
            <Select value={type} onValueChange={(v) => setType(v as SeqType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="trade_in">Trade-in / Upgrade</SelectItem>
                <SelectItem value="buy_back">Buy-back offer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label>Extra instruction (optional)</Label>
            <Textarea
              rows={3}
              placeholder="e.g. mention we take cars in any condition"
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            disabled={busy}
            onClick={() => onConfirm(type, instruction.trim() || undefined)}
          >
            <Sparkles className="h-3.5 w-3.5 mr-1.5" />
            {busy ? "Regenerating…" : "Regenerate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EmailBlock({
  e,
  seqType,
  onSave,
  onRegen,
}: {
  e: any;
  seqType: SeqType;
  onSave: (p: { id: string; subject: string; body: string }) => Promise<void>;
  onRegen: (p: { id: string; sequenceType: SeqType; instruction?: string }) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [subject, setSubject] = useState(e.subject);
  const [body, setBody] = useState(e.body);
  const [saving, setSaving] = useState(false);
  const [regenOpen, setRegenOpen] = useState(false);
  const [regenBusy, setRegenBusy] = useState(false);
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
                disabled={regenBusy}
                onClick={() => setRegenOpen(true)}
              >
                <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                {regenBusy ? "Regenerating…" : "Regenerate"}
              </Button>
              <RegenDialog
                open={regenOpen}
                onOpenChange={setRegenOpen}
                currentType={seqType}
                busy={regenBusy}
                onConfirm={async (type, instruction) => {
                  setRegenBusy(true);
                  try {
                    await onRegen({ id: e.id, sequenceType: type, instruction });
                    toast.success("Regenerated");
                    setRegenOpen(false);
                  } catch (er: any) {
                    toast.error(er?.message ?? "Regenerate failed");
                  } finally {
                    setRegenBusy(false);
                  }
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SequenceRow({
  s,
  selectable,
  selected,
  onToggle,
  isDraft,
  canStop,
  startPending,
  stopPending,
  onStart,
  onStop,
  onSave,
  onRegen,
}: {
  s: any;
  selectable: boolean;
  selected: boolean;
  onToggle: (id: string) => void;
  isDraft: boolean;
  canStop: boolean;
  startPending: boolean;
  stopPending: boolean;
  onStart: (id: string) => void;
  onStop: (id: string) => void;
  onSave: (p: { id: string; subject: string; body: string }) => Promise<void>;
  onRegen: (p: { id: string; sequenceType: SeqType; instruction?: string }) => Promise<void>;
}) {
  const emails = (s.sequence_emails ?? []).sort((a: any, b: any) => a.step - b.step);
  const sentCount = emails.filter((e: any) => e.status === "sent").length;
  const seqType = (s.sequence_type ?? "trade_in") as SeqType;

  return (
    <AccordionItem value={s.id} className="border-b last:border-0">
      <div className="flex items-center gap-2 pl-3">
        {selectable && (
          <Checkbox
            checked={selected}
            onCheckedChange={() => onToggle(s.id)}
            onClick={(e) => e.stopPropagation()}
            aria-label="Select sequence"
          />
        )}
        <AccordionTrigger className="hover:no-underline px-2 py-3 flex-1">
          <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-3 items-center text-left">
            <div className="md:col-span-2">
              <div className="font-medium">{s.customer?.name}</div>
              <div className="text-xs text-muted-foreground">{s.customer?.email}</div>
            </div>
            <div className="text-sm">
              {s.customer?.make} {s.customer?.model}
              <div className="text-xs text-muted-foreground">
                {seqType === "buy_back" ? "Buy-back" : "Trade-in"}
              </div>
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
      </div>
      <AccordionContent className="px-3 pb-4">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div>
              {s.started_at ? `Started ${formatDate(s.started_at)}` : "Not started yet"}
              {s.customer?.sale_date ? ` · Bought ${formatDate(s.customer.sale_date)}` : ""}
            </div>
            <div className="flex gap-2">
              {isDraft && (
                <Button
                  size="sm"
                  disabled={startPending}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onStart(s.id);
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
                  disabled={stopPending}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onStop(s.id);
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
                seqType={seqType}
                onSave={onSave}
                onRegen={onRegen}
              />
            ))}
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  );
}

function Sequences() {
  const fetchSeqs = useServerFn(listSequences);
  const update = useServerFn(updateEmailDraft);
  const stop = useServerFn(stopSequence);
  const regen = useServerFn(regenerateSequenceEmail);
  const startFn = useServerFn(startSequence);
  const bulkStart = useServerFn(startSequencesBulk);
  const qc = useQueryClient();
  const { data = [] } = useQuery({
    queryKey: ["sequences"],
    queryFn: () => fetchSeqs(),
  });

  const [selected, setSelected] = useState<Set<string>>(new Set());

  const groups = useMemo(() => {
    const drafts: any[] = [];
    const active: any[] = [];
    const done: any[] = [];
    for (const s of data as any[]) {
      if (s.status === "drafting") drafts.push(s);
      else if (["active", "scheduled"].includes(s.status)) active.push(s);
      else done.push(s);
    }
    return { drafts, active, done };
  }, [data]);

  const draftIds = groups.drafts.map((s) => s.id);
  const allSelected = draftIds.length > 0 && draftIds.every((id) => selected.has(id));
  const someSelected = draftIds.some((id) => selected.has(id));

  const toggleOne = (id: string) => {
    setSelected((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  };
  const toggleAll = () => {
    setSelected((prev) => {
      if (draftIds.every((id) => prev.has(id))) return new Set();
      return new Set(draftIds);
    });
  };

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
      toast.success("Sequence started — emails scheduled");
      qc.invalidateQueries({ queryKey: ["sequences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const bulkStartMut = useMutation({
    mutationFn: (ids: string[]) => bulkStart({ data: { ids } }),
    onSuccess: (r: any) => {
      toast.success(`Started ${r.started} sequence${r.started === 1 ? "" : "s"}`);
      setSelected(new Set());
      qc.invalidateQueries({ queryKey: ["sequences"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  const onSave = async (p: { id: string; subject: string; body: string }) => {
    await update({ data: p });
    qc.invalidateQueries({ queryKey: ["sequences"] });
  };
  const onRegen = async (p: { id: string; sequenceType: SeqType; instruction?: string }) => {
    await regen({ data: p });
    qc.invalidateQueries({ queryKey: ["sequences"] });
  };

  const renderGroup = (title: string, list: any[], selectable: boolean) => (
    <Card className="p-2">
      <div className="px-3 py-2 flex items-center justify-between">
        <div className="text-sm font-semibold">
          {title} <span className="text-muted-foreground font-normal">({list.length})</span>
        </div>
      </div>
      {list.length === 0 ? (
        <div className="text-center py-6 text-xs text-muted-foreground">None</div>
      ) : (
        <Accordion type="multiple" className="w-full">
          {list.map((s) => (
            <SequenceRow
              key={s.id}
              s={s}
              selectable={selectable}
              selected={selected.has(s.id)}
              onToggle={toggleOne}
              isDraft={s.status === "drafting"}
              canStop={["active", "scheduled", "drafting"].includes(s.status)}
              startPending={startMut.isPending}
              stopPending={stopMut.isPending}
              onStart={(id) => startMut.mutate(id)}
              onStop={(id) => stopMut.mutate(id)}
              onSave={onSave}
              onRegen={onRegen}
            />
          ))}
        </Accordion>
      )}
    </Card>
  );

  return (
    <div className="max-w-5xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sequences</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Review drafts, start them individually or in bulk, and track live sequences.
        </p>
      </div>

      {data.length === 0 ? (
        <Card className="p-10 text-center text-sm text-muted-foreground">
          No sequences yet. Generate some from the Leads page.
        </Card>
      ) : (
        <>
          {groups.drafts.length > 0 && (
            <div className="rounded-lg border bg-muted/40 p-3 flex flex-wrap items-center gap-3 justify-between">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <Checkbox
                  checked={allSelected ? true : someSelected ? "indeterminate" : false}
                  onCheckedChange={toggleAll}
                />
                Select all drafts ({draftIds.length})
              </label>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">
                  {selected.size} selected
                </span>
                <Button
                  size="sm"
                  disabled={selected.size === 0 || bulkStartMut.isPending}
                  onClick={() => bulkStartMut.mutate(Array.from(selected))}
                >
                  <PlayCircle className="h-3.5 w-3.5 mr-1.5" />
                  {bulkStartMut.isPending ? "Starting…" : "Start selected"}
                </Button>
              </div>
            </div>
          )}

          {renderGroup("Drafts", groups.drafts, true)}
          {renderGroup("Live", groups.active, false)}
          {groups.done.length > 0 && renderGroup("Completed & stopped", groups.done, false)}
        </>
      )}
    </div>
  );
}
