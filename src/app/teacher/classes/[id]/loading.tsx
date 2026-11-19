import { CardSkeleton, StatCardSkeleton, TableSkeleton, Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TeacherClassDetailLoading() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Breadcrumb/Back skeleton */}
      <Skeleton className="h-8 w-24" variant="rectangular" />

      {/* Header Card Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-8 w-3/4" variant="text" />
          <Skeleton className="h-5 w-1/3 mt-2" variant="rectangular" />
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-4 w-1/2" variant="text" />
          <Skeleton className="h-4 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/4" variant="text" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32 flex-1" variant="rectangular" />
            <Skeleton className="h-10 w-32 flex-1" variant="rectangular" />
          </div>
        </CardContent>
      </Card>

      {/* Join Code Card Skeleton */}
      <Card>
        <CardContent className="space-y-3 p-6">
          <Skeleton className="h-3 w-1/4" variant="text" />
          <Skeleton className="h-10 w-1/3" variant="rectangular" />
          <Skeleton className="h-3 w-1/2" variant="text" />
        </CardContent>
      </Card>

      {/* Stat Cards Skeleton */}
      <div className="grid gap-4 md:grid-cols-3">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Roster Table Skeleton */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-5 w-1/4" variant="text" />
          <Skeleton className="h-5 w-16" variant="rectangular" />
        </CardHeader>
        <CardContent>
          <TableSkeleton columns={4} rows={5} />
        </CardContent>
      </Card>
    </div>
  );
}