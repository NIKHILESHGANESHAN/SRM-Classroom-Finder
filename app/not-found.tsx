import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Custom 404 — App Router `not-found.tsx`.
 * Triggered by `notFound()` or unknown routes.
 */
export default function NotFound() {
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_hsl(214_71%_20%_/_0.08),_transparent_55%),radial-gradient(ellipse_at_bottom_right,_hsl(38_92%_50%_/_0.12),_transparent_45%)]"
      />

      <div className="relative z-10 flex max-w-md flex-col items-center gap-5 text-center">
        <p className="text-sm font-medium uppercase tracking-[0.2em] text-accent">
          404
        </p>
        <h1 className="text-balance text-3xl font-bold tracking-tight text-primary sm:text-4xl">
          Page not found
        </h1>
        <p className="text-pretty text-muted-foreground">
          That URL doesn’t exist in Classroom Finder. Head home to open Class
          Finder or Contributor.
        </p>
        <div className="flex flex-wrap justify-center gap-3 pt-2">
          <Button className="min-h-11" asChild>
            <Link href="/">Back home</Link>
          </Button>
          <Button variant="outline" className="min-h-11" asChild>
            <Link href="/finder">Class Finder</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
