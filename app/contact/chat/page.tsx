import type { Metadata } from "next";
import { ContactHeader } from "@/components/contact/contact-header";
import { HelpChat } from "@/components/contact/help-chat";
import { PRODUCT_NAME } from "@/lib/design-tokens";

export const metadata: Metadata = {
  title: "Help",
  description:
    "ClassFinder Help — finding rooms, reporting, confirmations, and using the site at SRM KTR.",
  openGraph: {
    title: `Help · ${PRODUCT_NAME}`,
    description:
      "ClassFinder Help — finding rooms, reporting, confirmations, and using the site.",
  },
};

export default function ContactChatPage() {
  return (
    <div className="mx-auto flex w-full min-w-0 max-w-xl flex-col gap-5 overflow-x-hidden sm:max-w-2xl sm:gap-6">
      <ContactHeader
        title="ClassFinder Help"
        subtitle="Answers from the help guide and live Finder data"
        backHref="/contact"
        backLabel="Back to Contact"
      />
      <header className="space-y-2 px-1">
        <h1 className="type-title text-foreground">ClassFinder Help</h1>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Ask about finding rooms, reporting, confirmations, or how ClassFinder
          works. Live room answers use the same Finder data as the floating
          assistant.
        </p>
      </header>
      <HelpChat />
    </div>
  );
}
