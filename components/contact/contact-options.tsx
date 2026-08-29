"use client";

import { ChevronRight } from "lucide-react";
import { GlassSurface } from "@/components/glass";
import { SoundLink } from "@/components/sound/sound-link";
import { useSound } from "@/components/sound/sound-provider";
import { buildFeedbackMailtoHref } from "@/lib/help/mailto";
import { cn } from "@/lib/utils";

const OPTIONS = [
  {
    href: "/contact/chat",
    external: false,
    title: "ClassFinder Help",
    description: "Quick answers about finding rooms, reporting, and how things work.",
  },
  {
    href: buildFeedbackMailtoHref(),
    external: true,
    title: "Send feedback",
    description: "Spotted a problem or have an idea? Opens your email app.",
  },
  {
    href: "/contact/community",
    external: false,
    title: "Common questions",
    description: "Browse questions and answers. No accounts or public posts.",
  },
] as const;

function OptionRow({
  title,
  description,
  className,
}: {
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-h-11 items-center justify-between gap-3 px-4 py-3.5 sm:px-5",
        className,
      )}
    >
      <div className="min-w-0 space-y-0.5">
        <p className="font-medium text-foreground">{title}</p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {description}
        </p>
      </div>
      <ChevronRight
        className="h-4 w-4 shrink-0 text-muted-foreground"
        aria-hidden
      />
    </div>
  );
}

export function ContactOptions() {
  const { play } = useSound();

  return (
    <nav aria-label="Contact options">
      <GlassSurface variant="regular" className="overflow-hidden shadow-token-sm">
        <ul>
          {OPTIONS.map((option, index) => {
            const row = (
              <OptionRow
                title={option.title}
                description={option.description}
                className={index > 0 ? "border-t border-border/70" : undefined}
              />
            );

            return (
              <li key={option.title}>
                {option.external ? (
                  <a
                    href={option.href}
                    className="block transition-standard hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                    data-feedback-mailto="true"
                    onClick={() => play("click")}
                  >
                    {row}
                  </a>
                ) : (
                  <SoundLink
                    href={option.href}
                    className="block transition-standard hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  >
                    {row}
                  </SoundLink>
                )}
              </li>
            );
          })}
        </ul>
      </GlassSurface>
    </nav>
  );
}
