"use client";

import { useId, useState } from "react";
import { ChevronDown } from "lucide-react";
import { getFaqSections } from "@/lib/help/faq";
import { cn } from "@/lib/utils";

export function FaqAccordion() {
  const sections = getFaqSections();
  const baseId = useId();
  const [openKey, setOpenKey] = useState<string | null>(null);

  return (
    <div className="space-y-8">
      {sections.map((section) => (
        <section key={section.category} className="space-y-3">
          <h2 className="text-lg font-semibold tracking-tight text-primary">
            {section.category}
          </h2>
          <div className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-card">
            {section.entries.map((entry) => {
              const key = `${section.category}-${entry.id}`;
              const open = openKey === key;
              const panelId = `${baseId}-${key}-panel`;
              const buttonId = `${baseId}-${key}-button`;
              return (
                <div key={key}>
                  <h3>
                    <button
                      type="button"
                      id={buttonId}
                      className="flex min-h-11 w-full items-center justify-between gap-3 px-4 py-3 text-left text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                      aria-expanded={open}
                      aria-controls={panelId}
                      onClick={() => setOpenKey(open ? null : key)}
                    >
                      <span>{entry.question}</span>
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 shrink-0 text-muted-foreground motion-reduce:transition-none",
                          open && "rotate-180",
                        )}
                        aria-hidden
                      />
                      <span className="sr-only">
                        {open ? "Collapse" : "Expand"}
                      </span>
                    </button>
                  </h3>
                  <div
                    id={panelId}
                    role="region"
                    aria-labelledby={buttonId}
                    hidden={!open}
                    className="px-4 pb-4 text-sm leading-relaxed text-muted-foreground"
                  >
                    {entry.answer}
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
