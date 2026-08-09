"use client";

import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { BarChart3, PenLine, Search } from "lucide-react";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DURATION_UI, EASE_OUT_EXPO, SPRING_HOVER } from "@/lib/motion";

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
 * Landing hero cards — staggered fade+slide (~80ms), spring hover scale+shadow.
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
                duration: DURATION_UI,
                delay: reduceMotion ? 0 : card.delay,
                ease: EASE_OUT_EXPO,
              }}
              whileHover={
                reduceMotion
                  ? undefined
                  : {
                      scale: 1.02,
                      y: -2,
                      transition: SPRING_HOVER,
                    }
              }
              whileTap={reduceMotion ? undefined : { scale: 0.97 }}
              className="rounded-xl"
            >
              <Link
                href={card.href}
                className="block h-full rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Card className="h-full min-h-[160px] border-border/80 shadow-md transition-shadow duration-300 ease-out-expo hover:shadow-xl dark:shadow-black/40 dark:hover:shadow-black/55">
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
        className="flex flex-col items-center"
        initial={reduceMotion ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{
          delay: reduceMotion ? 0 : 0.2,
          duration: DURATION_UI,
          ease: EASE_OUT_EXPO,
        }}
      >
        <Link
          href="/stats"
          className="inline-flex min-h-11 items-center gap-2 rounded-md px-2 text-sm text-muted-foreground underline-offset-4 hover:text-foreground hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        >
          <BarChart3 className="h-4 w-4" aria-hidden />
          Stats
        </Link>
      </motion.div>
    </div>
  );
}
