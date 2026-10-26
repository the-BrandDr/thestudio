'use client';

import * as React from "react";

interface FormattedDateProps {
  dateString: string | null | undefined;
}

export default function FormattedDate({ dateString }: FormattedDateProps) {
  const [formatted, setFormatted] = React.useState<string>("");

  React.useEffect(() => {
    if (!dateString) {
      setFormatted("N/A");
      return;
    }
    try {
      const d = new Date(dateString);
      setFormatted(d.toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric"
      }));
    } catch {
      setFormatted(dateString);
    }
  }, [dateString]);

  return <span>{formatted || "Loading..."}</span>;
}
