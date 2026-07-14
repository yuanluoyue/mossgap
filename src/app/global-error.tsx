"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
}: {
  error: Error & { digest?: string };
}) {
  useEffect(() => {
    console.error("[GlobalError]", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div style={{ display: "flex", minHeight: "100vh", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "1rem", textAlign: "center", fontFamily: "system-ui, -apple-system, sans-serif" }}>
          <p style={{ fontSize: "11px", letterSpacing: "0.1em", textTransform: "uppercase", color: "#6b7280", margin: 0 }}>
            Error
          </p>
          <h1 style={{ marginTop: "0.75rem", fontSize: "1.875rem", fontWeight: 700, color: "#111827", margin: 0 }}>
            Something went wrong
          </h1>
          <p style={{ marginTop: "0.75rem", fontSize: "0.875rem", color: "#6b7280", maxWidth: "28rem" }}>
            An unexpected error occurred. Please refresh the page or try again later.
          </p>
        </div>
      </body>
    </html>
  );
}
