import { cn } from "@/lib/utils";

const tones: Record<string, string> = {
  active: "bg-success/15 text-success",
  scheduled: "bg-chart-1/15 text-chart-1",
  drafting: "bg-muted text-muted-foreground",
  completed: "bg-primary/10 text-primary",
  stopped: "bg-destructive/15 text-destructive",
  paused_rematch: "bg-warning/25 text-warning-foreground",
  sent: "bg-success/15 text-success",
  cancelled: "bg-destructive/15 text-destructive",
  draft: "bg-muted text-muted-foreground",
  no_longer_owns: "bg-destructive/15 text-destructive",
  unsubscribed: "bg-muted text-muted-foreground",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const label = status.replaceAll("_", " ");
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium capitalize", tones[status] ?? "bg-muted text-muted-foreground", className)}>
      {label}
    </span>
  );
}
