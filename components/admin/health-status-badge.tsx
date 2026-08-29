import { cn } from "@/lib/utils";
import type { HealthStatus } from "@/lib/admin/operations";

const LABELS: Record<HealthStatus, string> = {
  healthy: "Healthy",
  warning: "Warning",
  error: "Error",
  unknown: "Unknown",
};

export function healthStatusLabel(status: HealthStatus): string {
  return LABELS[status];
}

export function HealthStatusBadge({ status }: { status: HealthStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-control border px-2 py-0.5 text-xs font-medium",
        status === "healthy" &&
          "border-cf-accent/30 bg-cf-accent-muted text-foreground",
        status === "warning" &&
          "border-amber-500/30 bg-amber-500/10 text-foreground",
        status === "error" &&
          "border-destructive/25 bg-destructive/10 text-destructive",
        status === "unknown" &&
          "border-border bg-muted/40 text-muted-foreground",
      )}
    >
      {healthStatusLabel(status)}
    </span>
  );
}
