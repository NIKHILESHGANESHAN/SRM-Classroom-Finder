import { cn } from "@/lib/utils";

const STATUS_LABELS: Record<string, string> = {
  confirmed: "Confirmed",
  unverified: "Unverified",
  expired: "Expired",
  hidden: "Hidden",
};

export function reportStatusLabel(status: string): string {
  return STATUS_LABELS[status] ?? status;
}

export function ReportStatusBadge({ status }: { status: string }) {
  const label = reportStatusLabel(status);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-control border px-2 py-0.5 text-xs font-medium",
        status === "confirmed" &&
          "border-cf-accent/30 bg-cf-accent-muted text-foreground",
        status === "unverified" &&
          "border-border bg-muted/50 text-foreground",
        status === "expired" &&
          "border-border bg-muted/30 text-muted-foreground",
        status === "hidden" &&
          "border-destructive/25 bg-destructive/10 text-destructive",
        !["confirmed", "unverified", "expired", "hidden"].includes(status) &&
          "border-border bg-muted/40 text-foreground",
      )}
    >
      {label}
    </span>
  );
}
