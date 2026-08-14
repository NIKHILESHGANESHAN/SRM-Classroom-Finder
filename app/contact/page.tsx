import type { Metadata } from "next";
import Link from "next/link";
import { ContactHeader } from "@/components/contact/contact-header";
import { ContactOptions } from "@/components/contact/contact-options";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Contact us",
  description:
    "Get help with SRM KTR Classroom Finder — chat, send feedback, or browse the community FAQ.",
};

export default function ContactPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-8">
      <ContactHeader title="Contact us" />
      <p className="max-w-lg text-pretty text-muted-foreground">
        Need help with SRM KTR Classroom Finder? We&apos;re here to help.
      </p>
      <ContactOptions />
      <Button variant="ghost" className="min-h-11 w-fit px-0" asChild>
        <Link href="/">← Back to Classroom Finder</Link>
      </Button>
    </div>
  );
}
