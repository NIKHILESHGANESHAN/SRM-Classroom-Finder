"use client";

import { useEffect } from "react";

/**
 * Replaces the root layout when it itself throws.
 * Must define its own <html>/<body> — cannot reuse the root layout.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[global]", error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily:
            'ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif',
          background: "#f8fafc",
          color: "#0F2C59",
          padding: "1.5rem",
          textAlign: "center",
        }}
      >
        <div style={{ maxWidth: "24rem" }}>
          <h1 style={{ fontSize: "1.5rem", marginBottom: "0.75rem" }}>
            Something went wrong
          </h1>
          <p style={{ color: "#64748b", fontSize: "0.875rem", marginBottom: "1.25rem" }}>
            The app hit an unexpected error. Please try again.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              minHeight: "2.75rem",
              padding: "0 1.25rem",
              borderRadius: "0.75rem",
              border: "none",
              background: "#0F2C59",
              color: "#f8fafc",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
