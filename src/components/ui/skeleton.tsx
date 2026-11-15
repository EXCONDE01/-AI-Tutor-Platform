"use client";

import { cn } from "@/lib/utils";

/**
 * Base Skeleton component with animation
 */
export function Skeleton({
  className,
  variant = "rectangular",
  width,
  height,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & {
  variant?: "rectangular" | "circular" | "text";
  width?: string | number;
  height?: string | number;
}) {
  return (
    <div
      className={cn(
        "animate-pulse bg-muted",
        {
          "rounded-md": variant === "rectangular",
          "rounded-full": variant === "circular",
          "h-4 w-full": variant === "text",
        },
        className
      )}
      style={{
        width: width ? (typeof width === "number" ? `${width}px` : width) : undefined,
        height: height ? (typeof height === "number" ? `${height}px` : height) : undefined,
      }}
      {...props}
    />
  );
}

/**
 * Card Skeleton - mimics Card component structure
 */
export function CardSkeleton({
  className,
  showHeader = true,
  showContent = true,
  showFooter = false,
  contentLines = 3,
}: {
  className?: string;
  showHeader?: boolean;
  showContent?: boolean;
  showFooter?: boolean;
  contentLines?: number;
}) {
  return (
    <div className={cn("card w-full", className)}>
      {showHeader && (
        <div className="card-header p-6 pb-4 border-b">
          <Skeleton className="h-6 w-1/3 mb-2" variant="text" />
          <Skeleton className="h-4 w-1/2" variant="text" />
        </div>
      )}
      {showContent && (
        <div className="card-content p-6 space-y-3">
          {Array.from({ length: contentLines }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" variant="text" />
          ))}
        </div>
      )}
      {showFooter && (
        <div className="card-footer p-6 pt-0 border-t flex gap-2">
          <Skeleton className="h-10 w-24" variant="rectangular" />
          <Skeleton className="h-10 w-24" variant="rectangular" />
        </div>
      )}
    </div>
  );
}

/**
 * Table Row Skeleton
 */
export function TableRowSkeleton({
  columns = 4,
  className,
}: {
  columns?: number;
  className?: string;
}) {
  return (
    <tr className={cn("border-t", className)}>
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="py-3 px-4">
          <Skeleton className="h-4 w-3/4" variant="text" />
        </td>
      ))}
    </tr>
  );
}

/**
 * Table Skeleton with header
 */
export function TableSkeleton({
  columns = 4,
  rows = 5,
  className,
}: {
  columns?: number;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full">
        <thead>
          <tr className="border-b text-left text-sm text-muted-foreground">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="pb-3 px-4">
                <Skeleton className="h-4 w-3/4" variant="text" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

/**
 * List Item Skeleton
 */
export function ListItemSkeleton({
  className,
  showAvatar = false,
  showAction = false,
  lines = 2,
}: {
  className?: string;
  showAvatar?: boolean;
  showAction?: boolean;
  lines?: number;
}) {
  return (
    <div className={cn("flex items-start gap-3 p-3 rounded-lg border hover:bg-accent transition-colors", className)}>
      {showAvatar && <Skeleton className="h-10 w-10 shrink-0" variant="circular" />}
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-2">
          <Skeleton className="h-5 w-1/4" variant="text" />
          {showAction && <Skeleton className="h-8 w-20 ml-auto shrink-0" variant="rectangular" />}
        </div>
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} className={`h-4 ${i === lines - 1 ? "w-3/4" : "w-full"}`} variant="text" />
        ))}
      </div>
    </div>
  );
}

/**
 * Dashboard Stat Card Skeleton
 */
export function StatCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card", className)}>
      <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
        <Skeleton className="h-4 w-1/3" variant="text" />
        <Skeleton className="h-4 w-4" variant="circular" />
      </div>
      <div className="card-content">
        <Skeleton className="h-8 w-1/4" variant="text" />
        <Skeleton className="h-3 w-1/2 mt-2" variant="text" />
      </div>
    </div>
  );
}

/**
 * Chart Skeleton
 */
export function ChartSkeleton({
  className,
  height = 200,
  type = "line",
}: {
  className?: string;
  height?: number;
  type?: "line" | "bar";
}) {
  return (
    <div className={cn("card", className)}>
      <div className="card-header">
        <Skeleton className="h-5 w-1/3" variant="text" />
      </div>
      <div className="card-content">
        <div className="h-full" style={{ height }}>
          {type === "bar" ? (
            <div className="flex items-end justify-around h-full p-4">
              {Array.from({ length: 7 }).map((_, i) => (
                <div
                  key={i}
                  className="flex-1 max-w-12 bg-muted rounded-t transition-all duration-500 animate-pulse"
                  style={{ height: `${20 + (i * 8) % 60}%` }}
                />
              ))}
            </div>
          ) : (
            <div className="w-full h-full bg-muted/30 rounded" />
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * Form Skeleton
 */
export function FormSkeleton({
  fields = 4,
  className,
}: {
  fields?: number;
  className?: string;
}) {
  return (
    <form className={cn("space-y-4", className)}>
      {Array.from({ length: fields }).map((_, i) => (
        <div key={i} className="space-y-1.5">
          <Skeleton className="h-4 w-1/4" variant="text" />
          <Skeleton className="h-10 w-full" variant="rectangular" />
        </div>
      ))}
      <div className="flex gap-3 pt-4">
        <Skeleton className="h-10 w-24 flex-1" variant="rectangular" />
        <Skeleton className="h-10 w-24 flex-1" variant="rectangular" />
      </div>
    </form>
  );
}

/**
 * Avatar Skeleton
 */
export function AvatarSkeleton({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}) {
  const sizes = {
    sm: "h-8 w-8",
    md: "h-10 w-10",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };
  return (
    <div className={cn("rounded-full bg-muted animate-pulse", sizes[size], className)} />
  );
}

/**
 * Badge Skeleton
 */
export function BadgeSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-5 w-16 shrink-0 rounded-full", className)} variant="rectangular" />
  );
}

/**
 * Button Skeleton
 */
export function ButtonSkeleton({
  variant = "default",
  className,
}: {
  variant?: "default" | "sm" | "lg" | "icon";
  className?: string;
}) {
  const sizes = {
    default: "h-10 w-24",
    sm: "h-8 w-20",
    lg: "h-12 w-32",
    icon: "h-10 w-10",
  };
  return (
    <Skeleton className={cn(sizes[variant], className)} variant="rectangular" />
  );
}

/**
 * Navigation Skeleton (for sidebar)
 */
export function NavSkeleton({ items = 5, className }: { items?: number; className?: string }) {
  return (
    <nav className={cn("flex flex-col gap-1 p-4", className)} aria-label="Main navigation" aria-busy="true">
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium opacity-50"
        >
          <Skeleton className="h-5 w-5" variant="rectangular" />
          <Skeleton className="h-5 w-20" variant="text" />
        </div>
      ))}
    </nav>
  );
}

/**
 * Page Header Skeleton
 */
export function PageHeaderSkeleton({
  className,
  showActions = false,
  showDescription = true,
}: {
  className?: string;
  showActions?: boolean;
  showDescription?: boolean;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-1/4 mb-2" variant="text" />
          {showDescription && <Skeleton className="h-4 w-1/2" variant="text" />}
        </div>
        {showActions && (
          <div className="flex items-center gap-2">
            <ButtonSkeleton variant="sm" />
            <ButtonSkeleton variant="sm" />
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Empty State Skeleton
 */
export function EmptyStateSkeleton({ className, icon = true, lines = 2 }: { className?: string; icon?: boolean; lines?: number }) {
  return (
    <div className={cn("card text-center py-12", className)}>
      {icon && <Skeleton className="h-10 w-10 mx-auto mb-4 opacity-50" variant="circular" />}
      <Skeleton className="h-4 w-3/4 mx-auto mb-2" variant="text" />
      {Array.from({ length: lines - 1 }).map((_, i) => (
        <Skeleton key={i} className="h-4 w-1/2 mx-auto mb-2" variant="text" />
      ))}
    </div>
  );
}

/**
 * Grid Skeleton (for card grids)
 */
export function GridSkeleton({
  columns = 3,
  rows = 2,
  className,
  gap = "gap-4",
}: {
  columns?: number;
  rows?: number;
  className?: string;
  gap?: string;
}) {
  return (
    <div className={cn(`grid ${gap} md:grid-cols-2 lg:grid-cols-${columns}`, className)}>
      {Array.from({ length: columns * rows }).map((_, i) => (
        <CardSkeleton key={i} />
      ))}
    </div>
  );
}

/**
 * Select/Dropdown Skeleton
 */
export function SelectSkeleton({ className }: { className?: string }) {
  return (
    <Skeleton className={cn("h-10 w-full", className)} variant="rectangular" />
  );
}

/**
 * Tabs Skeleton
 */
export function TabsSkeleton({
  tabs = 4,
  className,
  contentHeight = 200,
}: {
  tabs?: number;
  className?: string;
  contentHeight?: number;
}) {
  return (
    <div className={cn("space-y-4", className)}>
      <div className="flex gap-1 border-b">
        {Array.from({ length: tabs }).map((_, i) => (
          <Skeleton key={i} className="h-10 w-20 shrink-0" variant="rectangular" />
        ))}
      </div>
      <div className="h-full" style={{ height: contentHeight }}>
        <div className="space-y-3 p-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" variant="text" />
          ))}
        </div>
      </div>
    </div>
  );
}

/**
 * Profile/User Card Skeleton
 */
export function UserCardSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("card p-6 space-y-4", className)}>
      <div className="flex items-center gap-4">
        <AvatarSkeleton size="xl" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-6 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/2" variant="text" />
          <BadgeSkeleton />
        </div>
      </div>
      <div className="border-t pt-4 space-y-3">
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="text-center">
              <Skeleton className="h-8 w-1/2 mx-auto mb-1" variant="text" />
              <Skeleton className="h-3 w-3/4 mx-auto" variant="text" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}