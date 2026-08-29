import type { Metadata } from "next";
import { ContactHeader } from "@/components/contact/contact-header";
import { ContactOptions } from "@/components/contact/contact-options";
import { PRODUCT_NAME } from "@/lib/design-tokens";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Need help with ClassFinder? Chat, send feedback, or browse common questions.",
  openGraph: {
    title: `Contact · ${PRODUCT_NAME}`,
    description:
      "Need help with ClassFinder? Chat, send feedback, or browse common questions.",
  },
};

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col gap-6 overflow-x-hidden sm:max-w-2xl sm:gap-7">
      <ContactHeader
        title="Contact"
        subtitle="Help and feedback"
        showProductName
      />
      <header className="space-y-2 px-1">
        <h1 className="type-title text-foreground">Need help?</h1>
        <p className="max-w-lg text-pretty text-sm leading-relaxed text-muted-foreground">
          Found something broken, or have an idea? Pick an option below.
        </p>
      </header>
      <ContactOptions />
    </div>
  );
}
