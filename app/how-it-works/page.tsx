import type { Metadata } from "next";
import Link from "next/link";
import {
  Clock,
  Eye,
  Flag,
  Search,
  Shield,
  Timer,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = {
  title: "How it works",
  description:
    "How SRM KTR Classroom Finder shows rooms that students report free — freshness, Still Free, occupied reports, and automatic expiry. No account required.",
};

const STEPS = [
  {
    n: "1",
    title: "Find a classroom",
    body: "Open Class Finder and choose a building and floor. You’ll see rooms students have currently reported free for this period.",
    icon: Search,
  },
  {
    n: "2",
    title: "Check freshness",
    body: "Each card shows when the room was last verified and how much time remains before the report expires.",
    icon: Eye,
  },
  {
    n: "3",
    title: "Confirm or report",
    body: "If the room is still empty, tap Still Free. If it’s occupied, tap Report Occupied. Both are anonymous.",
    icon: Flag,
  },
  {
    n: "4",
    title: "Automatic protection",
    body: "Two independent occupied reports from different devices hide a listing. The same device can’t count twice.",
    icon: Shield,
  },
  {
    n: "5",
    title: "Automatic expiry",
    body: "Reports expire when the class period ends. The list also refreshes on its own while Finder is open.",
    icon: Timer,
  },
  {
    n: "6",
    title: "Anonymous by design",
    body: "No account, OTP, or login. The app only uses a local device token to prevent duplicate reports — never a name or email.",
    icon: Clock,
  },
  {
    n: "7",
    title: "Community-powered",
    body: "Listings come from students on campus. Share a room, star buildings on your device, or report the next empty classroom you find.",
    icon: Users,
  },
] as const;

export default function HowItWorksPage() {
  return (
    <main className="relative min-h-screen px-4 py-8 sm:py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(214_71%_20%_/_0.06),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_hsl(38_92%_50%_/_0.1),_transparent_40%)]"
      />
      <div className="relative z-10 mx-auto w-full max-w-2xl space-y-8">
        <header className="space-y-3">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
            About 30 seconds
          </p>
          <h1 className="text-3xl font-bold tracking-tight text-primary">
            How SRM KTR Classroom Finder works
          </h1>
          <p className="max-w-lg text-pretty text-muted-foreground">
            Students report empty rooms. Classmates confirm them. Occupied
            reports and period end keep the list honest.
          </p>
        </header>

        <ol className="grid gap-3 sm:grid-cols-2">
          {STEPS.map((step) => {
            const Icon = step.icon;
            return (
              <li key={step.n} className={step.n === "7" ? "sm:col-span-2" : ""}>
                <Card className="h-full border-border/80 shadow-sm">
                  <CardHeader className="gap-2 p-4 sm:p-5">
                    <div className="flex items-center gap-3">
                      <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-sm font-bold text-primary-foreground">
                        {step.n}
                      </span>
                      <Icon className="h-5 w-5 text-primary" aria-hidden />
                    </div>
                    <CardTitle className="text-base">{step.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">
                      {step.body}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </li>
            );
          })}
        </ol>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button className="min-h-11" asChild>
            <Link href="/finder">Open Class Finder</Link>
          </Button>
          <Button variant="outline" className="min-h-11" asChild>
            <Link href="/contribute">Report a room</Link>
          </Button>
          <Button variant="ghost" className="min-h-11" asChild>
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
