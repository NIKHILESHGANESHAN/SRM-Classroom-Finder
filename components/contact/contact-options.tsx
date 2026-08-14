import Link from "next/link";
import { MessageCircle, Mail, Users } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { buildFeedbackMailtoHref } from "@/lib/help/mailto";

const OPTIONS = [
  {
    href: "/contact/chat",
    external: false,
    title: "Chat with us",
    description: "Get help with SRM KTR Classroom Finder.",
    icon: MessageCircle,
    emoji: "💬",
  },
  {
    href: buildFeedbackMailtoHref(),
    external: true,
    title: "Send feedback",
    description: "Share feedback or report an issue.",
    icon: Mail,
    emoji: "✉",
  },
  {
    href: "/contact/community",
    external: false,
    title: "Community",
    description: "Browse common questions and answers.",
    icon: Users,
    emoji: "👥",
  },
] as const;

export function ContactOptions() {
  return (
    <ul className="grid gap-4 md:grid-cols-3">
      {OPTIONS.map((option) => {
        const Icon = option.icon;
        const className =
          "block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background";
        const card = (
          <Card className="h-full min-h-[11rem] border-border/80 shadow-sm transition-shadow hover:shadow-md dark:shadow-black/30">
            <CardHeader className="gap-3 p-5">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                <Icon className="h-5 w-5" aria-hidden />
              </div>
              <CardTitle className="text-lg">
                <span aria-hidden className="mr-1.5">
                  {option.emoji}
                </span>
                {option.title}
              </CardTitle>
              <CardDescription className="text-sm leading-relaxed">
                {option.description}
              </CardDescription>
            </CardHeader>
          </Card>
        );

        return (
          <li key={option.title}>
            {option.external ? (
              <a
                href={option.href}
                className={className}
                data-feedback-mailto="true"
              >
                {card}
              </a>
            ) : (
              <Link href={option.href} className={className}>
                {card}
              </Link>
            )}
          </li>
        );
      })}
    </ul>
  );
}
