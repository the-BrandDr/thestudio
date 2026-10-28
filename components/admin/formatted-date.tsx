"use client";

import * as React from "react";

export default function FormattedDate({
  date,
  iso,
  value,
  timestamp,
  className = "",
  includeTime = false,
}: {
  date?: string | Date | number | null;
  iso?: string | Date | number | null;
  value?: string | Date | number | null;
  timestamp?: string | Date | number | null;
  className?: string;
  includeTime?: boolean;
}) {
  const raw = date ?? iso ?? value ?? timestamp;
  const [formatted, setFormatted] = React.useState<string>("");

  React.useEffect(() => {
    if (!raw) {
      setFormatted("Just now");
      return;
    }
    const parsed = new Date(raw);
    if (isNaN(parsed.getTime())) {
      setFormatted(String(raw));
      return;
    }
    try {
      const datePart = parsed.toLocaleDateString("en-NG", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      if (includeTime) {
        const timePart = parsed.toLocaleTimeString("en-NG", {
          hour: "2-digit",
          minute: "2-digit",
        });
        setFormatted(`${datePart}, ${timePart}`);
      } else {
        setFormatted(datePart);
      }
    } catch (_) {
      setFormatted(parsed.toISOString().slice(0, 10));
    }
  }, [raw, includeTime]);

  return <span className={className}>{formatted || "—"}</span>;
}
