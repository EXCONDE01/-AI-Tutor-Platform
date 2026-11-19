import { Skeleton, CardSkeleton, StatCardSkeleton } from "@/components/ui/skeleton";

export default function SessionDetailLoading() {
  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <Skeleton className="h-8 w-24 shrink-0" variant="rectangular" />
        <div className="flex-1 min-w-0 space-y-2">
          <Skeleton className="h-8 w-1/3" variant="text" />
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-20" variant="rectangular" />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <Skeleton className="h-4 w-40" variant="text" />
            <Skeleton className="h-4 w-24" variant="text" />
          </div>
        </div>
      </div>

      {/* Student & Class Info Card Skeleton */}
      <CardSkeleton showHeader={false} showContent contentLines={3} className="p-6" />

      {/* Stats Row Skeleton - 4 stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Session Summary Card Skeleton */}
      <CardSkeleton showHeader showContent contentLines={3} />

      {/* Transcript Card Skeleton */}
      <CardSkeleton
        showHeader
        showContent
        contentLines={1}
        className="p-0"
      />
    </div>
  );
}