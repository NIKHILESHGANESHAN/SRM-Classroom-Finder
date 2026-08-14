import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { MoreOptionsMenu } from "@/components/more-options-menu";
import { Button } from "@/components/ui/button";

type ContactHeaderProps = {
  title: string;
  subtitle?: string;
  backHref?: string;
  backLabel?: string;
};

export function ContactHeader({
  title,
  subtitle,
  backHref = "/",
  backLabel = "Back to Classroom Finder",
}: ContactHeaderProps) {
  return (
    <div className="flex items-start gap-3">
      <Button variant="ghost" size="icon" className="min-h-11 min-w-11" asChild>
        <Link href={backHref} aria-label={backLabel}>
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </Button>
      <div className="min-w-0 flex-1">
        <h1 className="text-2xl font-bold tracking-tight text-primary">{title}</h1>
        {subtitle ? (
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        ) : null}
      </div>
      <MoreOptionsMenu />
    </div>
  );
}
