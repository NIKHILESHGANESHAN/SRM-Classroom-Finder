import Link from "next/link";
import { cn } from "@/lib/utils";

type HowItWorksLinkProps = {
  className?: string;
};

export function HowItWorksLink({ className }: HowItWorksLinkProps) {
  return (
    <Link
      href="/how-it-works"
      className={cn(
        "inline-flex min-h-11 items-center text-sm font-medium text-muted-foreground underline-offset-4 hover:text-foreground hover:underline",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        className,
      )}
    >
      How it works
    </Link>
  );
}
