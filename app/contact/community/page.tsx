import type { Metadata } from "next";
import { ContactHeader } from "@/components/contact/contact-header";
import { FaqAccordion } from "@/components/contact/faq-accordion";
import { PRODUCT_NAME } from "@/lib/design-tokens";

export const metadata: Metadata = {
  title: "Common questions",
  description:
    "Questions and answers about ClassFinder at SRM KTR. No accounts or public posts.",
  openGraph: {
    title: `Common questions · ${PRODUCT_NAME}`,
    description:
      "Questions and answers about ClassFinder. No accounts or public posts.",
  },
};

export default function ContactCommunityPage() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col gap-6 overflow-x-hidden sm:max-w-2xl sm:gap-7">
      <ContactHeader
        title="Common questions"
        subtitle="Curated answers about ClassFinder"
        backHref="/contact"
        backLabel="Back to Contact"
      />
      <header className="space-y-2 px-1">
        <h1 className="type-title text-foreground">Common questions</h1>
        <h2 className="text-lg font-semibold text-foreground">
          Got a suggestion for ClassFinder?
        </h2>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Spotted something weird? Browse these answers first. This is a curated
          FAQ — no accounts, comments, or public posts.
        </p>
      </header>
      <FaqAccordion />
    </div>
  );
}
