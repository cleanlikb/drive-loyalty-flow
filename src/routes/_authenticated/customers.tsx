import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { listCustomers, setCustomerStatus, bulkInsertCustomers } from "@/lib/customers.functions";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { formatDate, formatGbp } from "@/lib/format";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem,
} from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { CsvImportDialog } from "@/components/CsvImportDialog";

export const Route = createFileRoute("/_authenticated/customers")({
  component: Customers,
});

function Customers() {
  const qc = useQueryClient();
  const fetch = useServerFn(listCustomers);
  const setStatus = useServerFn(setCustomerStatus);
  const { data = [] } = useQuery({ queryKey: ["customers"], queryFn: () => fetch() });
  const [q, setQ] = useState("");

  const mut = useMutation({
    mutationFn: (v: { id: string; status: any }) => setStatus({ data: v }),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["customers"] }); },
  });

  const filtered = q ? data.filter((c: any) =>
    [c.name, c.email, c.make, c.model, c.vehicle_reg].some((v) => v && String(v).toLowerCase().includes(q.toLowerCase()))
  ) : data;

  return (
    <div className="max-w-6xl mx-auto p-6 md:p-8 space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Customers</h1>
          <p className="text-sm text-muted-foreground mt-1">Your full sales history.</p>
        </div>
        <Input placeholder="Search…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-xs" />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-muted-foreground">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Customer</th>
                <th className="text-left px-4 py-2 font-medium">Vehicle</th>
                <th className="text-left px-4 py-2 font-medium">Reg</th>
                <th className="text-left px-4 py-2 font-medium">Sale date</th>
                <th className="text-left px-4 py-2 font-medium">Price</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filtered.map((c: any) => (
                <tr key={c.id} className="hover:bg-accent/20">
                  <td className="px-4 py-3">
                    <div className="font-medium">{c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email ?? "—"}</div>
                  </td>
                  <td className="px-4 py-3">{c.make} {c.model} <span className="text-muted-foreground">{c.trim ?? ""}</span></td>
                  <td className="px-4 py-3 text-muted-foreground">{c.vehicle_reg ?? "—"}</td>
                  <td className="px-4 py-3 text-muted-foreground">{formatDate(c.sale_date)}</td>
                  <td className="px-4 py-3">{formatGbp(c.sale_price)}</td>
                  <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                  <td className="px-4 py-3">
                    <DropdownMenu>
                      <DropdownMenuTrigger><MoreHorizontal className="h-4 w-4 text-muted-foreground" /></DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => mut.mutate({ id: c.id, status: "active" })}>Mark active</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => mut.mutate({ id: c.id, status: "no_longer_owns" })}>No longer owns car</DropdownMenuItem>
                        <DropdownMenuItem onClick={() => mut.mutate({ id: c.id, status: "unsubscribed" })}>Unsubscribed</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="text-center py-10 text-muted-foreground">No customers.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
