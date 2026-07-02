import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getMyDealer, updateDealerProfile } from "@/lib/dealer.functions";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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

  const [form, setForm] = useState({ dealership_name: "", salesperson_name: "", website_url: "", stock_page_url: "" });
  useEffect(() => {
    if (data) setForm({
      dealership_name: data.dealership_name ?? "",
      salesperson_name: data.salesperson_name ?? "",
      website_url: data.website_url ?? "",
      stock_page_url: data.stock_page_url ?? "",
    });
  }, [data]);

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
        <div className="space-y-1.5">
          <Label>Stock page URL</Label>
          <Input value={form.stock_page_url} onChange={(e) => setForm({ ...form, stock_page_url: e.target.value })} placeholder="https://…/used-cars" />
        </div>
        <div className="flex justify-end">
          <Button onClick={() => mut.mutate()} disabled={mut.isPending}>{mut.isPending ? "Saving…" : "Save changes"}</Button>
        </div>
      </Card>
    </div>
  );
}
