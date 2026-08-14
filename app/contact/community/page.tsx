import type { Metadata } from "next";
import { ContactHeader } from "@/components/contact/contact-header";
import { FaqAccordion } from "@/components/contact/faq-accordion";

export const metadata: Metadata = {
  title: "Community FAQ",
  description:
    "Curated questions and answers about SRM KTR Classroom Finder. No accounts or public posts.",
};

export default function ContactCommunityPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <ContactHeader
        title="Community"
        subtitle="Common questions about Classroom Finder"
        backHref="/contact"
        backLabel="Back to Contact us"
      />
      <p className="text-sm text-muted-foreground">
        This is a curated FAQ. There are no accounts, comments, or public posts.
      </p>
      <FaqAccordion />
    </div>
  );
}
