import type { Metadata } from "next";
import { ContactHeader } from "@/components/contact/contact-header";
import { HelpChat } from "@/components/contact/help-chat";

export const metadata: Metadata = {
  title: "Classroom Finder Assistant",
  description:
    "Controlled help for SRM KTR Classroom Finder — finding rooms, reporting, privacy, and using the site.",
};

export default function ContactChatPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <ContactHeader
        title="Classroom Finder Assistant"
        subtitle="SRM KTR Help"
        backHref="/contact"
        backLabel="Back to Contact us"
      />
      <HelpChat />
    </div>
  );
}
