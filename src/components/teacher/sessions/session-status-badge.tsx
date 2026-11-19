"use client";

import { Badge } from "@/components/ui/badge";
import { sessionStatusVariant, formatSessionStatus } from "@/lib/sessions/format";

export function SessionStatusBadge({
  status,
  className,
  showDot = false,
}: {
  status: string;
  className?: string;
  showDot?: boolean;
}) {
  const variant = sessionStatusVariant(status);
  const label = formatSessionStatus(status);
  const isActive = status === "active";

  return (
    <Badge
      variant={variant}
      className={className}
    >
      {isActive && showDot && (
        <span
          className="inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse mr-1.5"
          aria-hidden="true"
        />
      )}
      {label}
    </Badge>
  );
}