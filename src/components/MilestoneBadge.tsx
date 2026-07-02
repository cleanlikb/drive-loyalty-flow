import { cn } from "@/lib/utils";

const map: Record<number, string> = {
  12: "milestone-12",
  18: "milestone-18",
  24: "milestone-24",
  36: "milestone-36",
  48: "milestone-48",
  60: "milestone-60",
};

export function MilestoneBadge({ months, className }: { months: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", map[months] ?? "bg-muted text-muted-foreground", className)}>
      {months} mo
    </span>
  );
}
