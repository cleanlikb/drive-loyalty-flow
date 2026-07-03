import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyDealer, updateDealerProfile } from "@/lib/dealer.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { AVAILABLE_MILESTONES, DEFAULT_MILESTONES } from "@/lib/format";
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
  });
  useEffect(() => {
    if (data) setForm({
      dealership_name: data.dealership_name ?? "",
      salesperson_name: data.salesperson_name ?? "",
      website_url: data.website_url ?? "",
      notification_email: (data as any).notification_email ?? "",
      forward_replies: (data as any).forward_replies ?? true,
      milestone_months: ((data as any).milestone_months?.length ? (data as any).milestone_months : DEFAULT_MILESTONES) as number[],
    });
  }, [data]);

  function toggleMilestone(m: number, on: boolean) {
    setForm((f) => {
      const set = new Set(f.milestone_months);
      if (on) set.add(m); else set.delete(m);
      return { ...f, milestone_months: Array.from(set).sort((a, b) => a - b) };
    });
  }


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
            Choose which ownership anniversaries (in months since purchase) trigger new leads each month.
          </p>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
          {AVAILABLE_MILESTONES.map((m) => {
            const active = form.milestone_months.includes(m);
            return (
              <label
                key={m}
                className={`flex items-center gap-2 rounded-md border px-3 py-2 text-sm cursor-pointer transition ${active ? "bg-primary/10 border-primary/40 text-primary" : "hover:bg-accent/40"}`}
              >
                <Checkbox
                  checked={active}
                  onCheckedChange={(v) => toggleMilestone(m, Boolean(v))}
                />
                <span>{m} mo</span>
              </label>
            );
          })}
        </div>
        {form.milestone_months.length === 0 && (
          <p className="text-xs text-destructive">Select at least one interval.</p>
        )}
      </Card>


      <div className="flex justify-end">
        <Button onClick={() => mut.mutate()} disabled={mut.isPending || form.milestone_months.length === 0}>{mut.isPending ? "Saving…" : "Save changes"}</Button>
      </div>

    </div>
  );
}
