"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, PenLine, Search } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const EASE = [0.22, 1, 0.36, 1] as const;

const cards = [
  {
    href: "/finder",
    title: "Class Finder",
    description: "See which classrooms are free right now across UB, TP1, and TP2.",
    icon: Search,
    delay: 0,
  },
  {
    href: "/contribute",
    title: "Contributor",
    description: "Spot an empty room? Report it in a few taps — no login needed.",
    icon: PenLine,
    delay: 0.08,
  },
] as const;

/**
 * Landing hero cards — Framer Motion entrance + spring hover.
 * Routes are wired; page content lands in later build phases.
 */
export function LandingCards() {
  const reduceMotion = useReducedMotion();

  return (
    <div className="flex w-full max-w-2xl flex-col gap-8">
      <div className="grid gap-4 sm:grid-cols-2">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <motion.div
              key={card.href}
              initial={reduceMotion ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: 0.35,
                delay: reduceMotion ? 0 : card.delay,
                ease: EASE,
              }}
              whileHover={
                reduceMotion
                  ? undefined
                  : { scale: 1.02, transition: { type: "spring", stiffness: 300, damping: 20 } }
              }
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
            >
              <Link href={card.href} className="block h-full focus-visible:outline-none">
                <Card className="h-full min-h-[160px] border-border/80 shadow-md transition-shadow hover:shadow-lg">
                  <CardHeader className="gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                      <Icon className="h-5 w-5" aria-hidden />
                    </div>
                    <CardTitle className="text-xl">{card.title}</CardTitle>
                    <CardDescription className="text-base leading-relaxed">
                      {card.description}
                    </CardDescription>
                  </CardHeader>
                </Card>
              </Link>
            </motion.div>
          );
        })}
      </div>

      <motion.div
        className="flex flex-col items-center gap-4"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: reduceMotion ? 0 : 0.2, duration: 0.3, ease: EASE }}
      >
        <Link
          href="/stats"
          className="inline-flex min-h-11 items-center gap-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
        >
          <BarChart3 className="h-4 w-4" aria-hidden />
          Stats
        </Link>

        {/* Smoke-test control for sonner — removed once contribute flow ships */}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            toast.success("Stack check passed", {
              description: "Framer Motion, shadcn/ui, and sonner are wired up.",
            })
          }
        >
          Test toast
        </Button>
      </motion.div>
    </div>
  );
}
