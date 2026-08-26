import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { GlassNavigation } from "@/components/glass";
import { MoreOptionsMenu } from "@/components/more-options-menu";
import { Button } from "@/components/ui/button";
import { PRODUCT_NAME } from "@/lib/design-tokens";

type ContactHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
  showProductName?: boolean;
};

export function ContactHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Back to home",
  showProductName = false,
}: ContactHeaderProps) {
  return (
    <GlassNavigation
      aria-label="Contact navigation"
      className="flex items-center gap-2 px-2 py-2 sm:px-3"
    >
      <Button
        variant="ghost"
        size="icon"
        className="btn-press min-h-11 min-w-11"
        asChild
      >
        <Link href={backHref} aria-label={backLabel}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        {showProductName ? (
          <>
            <p className="truncate text-base font-semibold text-foreground sm:text-lg">
              {PRODUCT_NAME}
            </p>
            <p className="truncate text-xs text-muted-foreground">{title}</p>
          </>
        ) : (
          <>
            <p className="truncate text-base font-semibold text-foreground sm:text-lg">
              {title}
            </p>
            {subtitle ? (
              <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
            ) : null}
          </>
        )}
      </div>
      <MoreOptionsMenu className="shrink-0" />
    </GlassNavigation>
  );
}
