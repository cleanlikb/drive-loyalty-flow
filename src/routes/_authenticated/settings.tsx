import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyDealer, updateDealerProfile } from "@/lib/dealer.functions";
import { verifySenderEmail, clearSenderEmail, listVerifiedSenderDomains } from "@/lib/sender.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

import { DEFAULT_MILESTONES } from "@/lib/format";
import { X, CheckCircle2, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";


export const Route = createFileRoute("/_authenticated/settings")({
  component: Settings,
});

function Settings() {
  const qc = useQueryClient();
  const fetch = useServerFn(getMyDealer);
  const update = useServerFn(updateDealerProfile);
  const { data } = useQuery({ queryKey: ["dealer"], queryFn: () => fetch() });

  const [form, setForm] = useState({
    dealership_name: "",
    salesperson_name: "",
    website_url: "",
    notification_email: "",
    forward_replies: true,
    milestone_months: DEFAULT_MILESTONES as number[],
    daily_send_cap: 50,
    send_window_start_hour: 9,
    send_window_end_hour: 16,
  });
  useEffect(() => {
    if (data) setForm({
      dealership_name: data.dealership_name ?? "",
      salesperson_name: data.salesperson_name ?? "",
      website_url: data.website_url ?? "",
      notification_email: (data as any).notification_email ?? "",
      forward_replies: (data as any).forward_replies ?? true,
      milestone_months: ((data as any).milestone_months?.length ? (data as any).milestone_months : DEFAULT_MILESTONES) as number[],
      daily_send_cap: (data as any).daily_send_cap ?? 50,
      send_window_start_hour: (data as any).send_window_start_hour ?? 9,
      send_window_end_hour: (data as any).send_window_end_hour ?? 16,
    });
  }, [data]);


  const [customValue, setCustomValue] = useState("");

  function removeMilestone(m: number) {
    setForm((f) => ({ ...f, milestone_months: f.milestone_months.filter((x) => x !== m) }));
  }
  function addMilestone(n: number) {
    if (!Number.isFinite(n) || n < 1 || n > 240) return;
    setForm((f) => {
      if (f.milestone_months.includes(n)) return f;
      return { ...f, milestone_months: [...f.milestone_months, n].sort((a, b) => a - b) };
    });
  }
  function addFromInput() {
    const n = parseInt(customValue, 10);
    if (Number.isNaN(n)) return;
    addMilestone(n);
    setCustomValue("");
  }
  const QUICK_ADDS = [3, 6, 9, 12, 18, 24, 30, 33, 36, 42, 48, 60];



  const mut = useMutation({
    mutationFn: () => update({ data: form }),
    onSuccess: () => { toast.success("Saved"); qc.invalidateQueries({ queryKey: ["dealer"] }); },
    onError: (e: any) => toast.error(e?.message ?? "Failed"),
  });

  return (
    <div className="max-w-2xl mx-auto p-6 md:p-8 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">Update your dealership profile.</p>
      </div>
      <Card className="p-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Dealership name</Label>
          <Input value={form.dealership_name} onChange={(e) => setForm({ ...form, dealership_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Salesperson name (signs emails)</Label>
          <Input value={form.salesperson_name} onChange={(e) => setForm({ ...form, salesperson_name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Website</Label>
          <Input value={form.website_url} onChange={(e) => setForm({ ...form, website_url: e.target.value })} placeholder="https://…" />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Reply forwarding</h2>
          <p className="text-sm text-muted-foreground mt-1">
            When a customer replies to a sequence, we auto-classify it and cancel their remaining emails.
            Optionally forward the reply text to your real inbox so you can respond normally.
          </p>
        </div>
        <div className="space-y-1.5">
          <Label>Notification email</Label>
          <Input
            type="email"
            value={form.notification_email}
            onChange={(e) => setForm({ ...form, notification_email: e.target.value })}
            placeholder="you@dealership.co.uk"
          />
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="forward" className="cursor-pointer">Forward inbound replies to my inbox</Label>
          <Switch
            id="forward"
            checked={form.forward_replies}
            onCheckedChange={(v) => setForm({ ...form, forward_replies: v })}
          />
        </div>
      </Card>

      <Card className="p-6 space-y-4">
        <div>
          <h2 className="font-semibold">Lead intervals</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Set exactly which months-since-purchase trigger new leads. Add any value from 1 to 240 — e.g. 33 to reach out 3 months before the 3-year mark.
          </p>
        </div>

        <div className="flex flex-wrap gap-2 min-h-[2.25rem]">
          {form.milestone_months.length === 0 && (
            <span className="text-xs text-muted-foreground self-center">No intervals selected.</span>
          )}
          {form.milestone_months.map((m) => (
            <span
              key={m}
              className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/30 pl-3 pr-1.5 py-1 text-sm"
            >
              {m} mo
              <button
                type="button"
                onClick={() => removeMilestone(m)}
                className="rounded-full hover:bg-primary/20 p-0.5"
                aria-label={`Remove ${m} months`}
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </span>
          ))}
        </div>

        <div className="flex flex-wrap items-end gap-2">
          <div className="flex-1 min-w-[180px] space-y-1.5">
            <Label htmlFor="custom-interval">Add interval (months)</Label>
            <div className="flex gap-2">
              <Input
                id="custom-interval"
                type="number"
                min={1}
                max={240}
                value={customValue}
                onChange={(e) => setCustomValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") { e.preventDefault(); addFromInput(); }
                }}
                placeholder="e.g. 33"
              />
              <Button type="button" variant="outline" onClick={addFromInput} disabled={!customValue.trim()}>
                Add
              </Button>
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Quick add</Label>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_ADDS.filter((m) => !form.milestone_months.includes(m)).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => addMilestone(m)}
                className="rounded-full border px-2.5 py-1 text-xs hover:bg-accent"
              >
                + {m} mo
              </button>
            ))}
          </div>
        </div>

        {form.milestone_months.length === 0 && (
          <p className="text-xs text-destructive">Add at least one interval.</p>
        )}
      </Card>

      <Card className="p-6 space-y-4">

        <div>
          <h2 className="font-semibold">Send throttling</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Protects deliverability by capping how many first-touch emails go out per day and randomising each send within your chosen window. Steps 2 &amp; 3 land the right number of days after step 1 actually sends.
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="cap">Max first emails / day</Label>
            <Input
              id="cap"
              type="number"
              min={1}
              max={500}
              value={form.daily_send_cap}
              onChange={(e) => setForm({ ...form, daily_send_cap: Math.max(1, parseInt(e.target.value || "0", 10) || 1) })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wstart">Send window start</Label>
            <Input
              id="wstart"
              type="number"
              min={0}
              max={23}
              value={form.send_window_start_hour}
              onChange={(e) => setForm({ ...form, send_window_start_hour: Math.min(23, Math.max(0, parseInt(e.target.value || "0", 10) || 0)) })}
            />
            <p className="text-xs text-muted-foreground">Hour of day (0–23)</p>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="wend">Send window end</Label>
            <Input
              id="wend"
              type="number"
              min={1}
              max={24}
              value={form.send_window_end_hour}
              onChange={(e) => setForm({ ...form, send_window_end_hour: Math.min(24, Math.max(1, parseInt(e.target.value || "0", 10) || 1)) })}
            />
            <p className="text-xs text-muted-foreground">Hour of day (1–24)</p>
          </div>
        </div>
        {form.send_window_end_hour <= form.send_window_start_hour && (
          <p className="text-xs text-destructive">End hour must be after start hour.</p>
        )}
      </Card>






      <div className="flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || form.milestone_months.length === 0}>{mut.isPending ? "Saving…" : "Save changes"}</Button>
      </div>

    </div>
  );
}
