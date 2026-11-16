"use client";

import { cn } from "@/lib/utils";
import { Skeleton, StatCardSkeleton, CardSkeleton, ChartSkeleton, TableSkeleton, ListItemSkeleton, AvatarSkeleton } from "./skeleton";

/**
 * Teacher Dashboard Page Skeleton - matches exact layout
 */
export function TeacherDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Welcome Section - matches h1 + p */}
      <div className="mb-8">
        <Skeleton className="h-8 w-1/3" variant="text" />
        <Skeleton className="h-4 w-1/2 mt-2" variant="text" />
      </div>

      {/* Stats Grid - 4 exact stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Two Column Layout */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Quick Actions Card - matches header + list of 4 action items */}
        <CardSkeleton 
          showHeader 
          showContent 
          contentLines={4}
          className="h-full"
        />
        
        {/* Recent Activity Card - matches header + 3 activity items */}
        <CardSkeleton 
          showHeader 
          showContent 
          contentLines={3}
          className="h-full"
        />
      </div>
    </div>
  );
}

/**
 * Teacher Sessions Page Skeleton - matches exact layout
 */
export function TeacherSessionsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Page Header - h1 + p + button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <Skeleton className="h-8 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/2 mt-2" variant="text" />
        </div>
        <Skeleton className="h-10 w-32 shrink-0" variant="rectangular" />
      </div>

      {/* Sessions Table Card */}
      <CardSkeleton 
        showHeader 
        showContent 
        contentLines={1}
        className="h-full"
      />
    </div>
  );
}

/**
 * Teacher Settings Page Skeleton - matches exact layout
 */
export function TeacherSettingsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-8 w-8" variant="circular" />
        <Skeleton className="h-8 w-1/4" variant="text" />
      </div>

      {/* Google Workspace Card */}
      <CardSkeleton 
        showHeader 
        showContent 
        contentLines={3}
      />

      {/* Mobile App Download Card */}
      <CardSkeleton 
        showHeader 
        showContent 
        contentLines={3}
      />

      {/* Account Card */}
      <CardSkeleton 
        showHeader 
        showContent 
        contentLines={1}
      />
    </div>
  );
}

/**
 * Teacher Analytics Page Skeleton - matches exact layout
 */
export function TeacherAnalyticsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <Skeleton className="h-8 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/2 mt-2" variant="text" />
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <Skeleton className="h-10 w-36" variant="rectangular" /> {/* Select: Time range */}
          <Skeleton className="h-10 w-40" variant="rectangular" /> {/* Select: Class */}
          <Skeleton className="h-10 w-24" variant="rectangular" /> {/* Refresh button */}
        </div>
      </div>

      {/* Overview Stats - 4 stat cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      {/* Charts Row 1 - 2 charts */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <ChartSkeleton type="line" height={300} />
        <ChartSkeleton type="line" height={300} />
      </div>

      {/* Charts Row 2 - Token usage + Weekly progress */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <CardSkeleton 
          showHeader 
          showContent 
          contentLines={3}
        />
        <ChartSkeleton type="bar" height={250} />
      </div>

      {/* Tabs Content - Topics & Struggles */}
      <div className="grid gap-6 lg:grid-cols-2 mb-6">
        <ChartSkeleton type="bar" height={350} />
        <ChartSkeleton type="bar" height={350} />
      </div>

      {/* Interventions Card */}
      <CardSkeleton 
        showHeader 
        showContent 
        contentLines={3}
      />
    </div>
  );
}

/**
 * Student Classes Page Skeleton - matches exact layout
 */
export function StudentClassesSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      {/* Class Cards Grid - 3 cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton showHeader={false} showContent contentLines={4} className="p-6 h-full" />
        <CardSkeleton showHeader={false} showContent contentLines={4} className="p-6 h-full" />
        <CardSkeleton showHeader={false} showContent contentLines={4} className="p-6 h-full" />
      </div>
    </div>
  );
}

/**
 * Student Sessions Page Skeleton - matches exact layout
 */
export function StudentSessionsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Tutor Chat Area */}
        <div className="lg:col-span-2">
          <TutorChatSkeleton />
        </div>
        
        {/* Sidebar Cards */}
        <div className="space-y-4">
          <CardSkeleton showHeader showContent contentLines={4} />
          <CardSkeleton showHeader showContent contentLines={5} />
        </div>
      </div>
    </div>
  );
}

/**
 * Student Notifications Page Skeleton - matches exact layout
 */
export function StudentNotificationsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <CardSkeleton showHeader={false} showContent contentLines={3} />
    </div>
  );
}

/**
 * Student Artifacts Page Skeleton - matches exact layout
 */
export function StudentArtifactsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <CardSkeleton showHeader={false} showContent contentLines={3} />
    </div>
  );
}

/**
 * Generic Page Header Skeleton
 */
export function PageHeaderSkeleton({
  showActions = false,
  showDescription = true,
  actionCount = 2,
}: {
  showActions?: boolean;
  showDescription?: boolean;
  actionCount?: number;
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
      <div>
        <Skeleton className="h-8 w-1/3" variant="text" />
        {showDescription && <Skeleton className="h-4 w-1/2 mt-2" variant="text" />}
      </div>
      {showActions && (
        <div className="flex flex-wrap items-center gap-4">
          {Array.from({ length: actionCount }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24" variant="rectangular" />
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Card Grid Skeleton - for grid of cards
 */
export function CardGridSkeleton({
  columns = 3,
  rows = 1,
  contentLines = 3,
}: {
  columns?: number;
  rows?: number;
  contentLines?: number;
}) {
  return (
    <div className={`grid gap-4 md:grid-cols-2 lg:grid-cols-${columns}`}>
      {Array.from({ length: columns * rows }).map((_, i) => (
        <CardSkeleton 
          key={i} 
          showHeader={false} 
          showContent 
          contentLines={contentLines}
          className="h-full"
        />
      ))}
    </div>
  );
}

/**
 * Empty Card Skeleton with icon placeholder
 */
export function EmptyCardSkeleton({
  className,
  icon = true,
  lines = 2,
}: {
  className?: string;
  icon?: boolean;
  lines?: number;
}) {
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
 * Session List Skeleton - for student/teacher session history
 */
export function SessionListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="p-3 rounded-lg border">
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-1/3" variant="text" />
            <Skeleton className="h-5 w-16" variant="rectangular" /> {/* Badge */}
          </div>
          <Skeleton className="h-4 w-full mt-2" variant="text" />
        </div>
      ))}
    </div>
  );
}

/**
 * Teacher New Session Page Skeleton - matches exact layout
 */
export function TeacherNewSessionSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-2xl">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="h-10 w-10" variant="circular" />
        <div>
          <Skeleton className="h-8 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/2 mt-2" variant="text" />
        </div>
      </div>

      {/* Student Card */}
      <CardSkeleton showHeader showContent contentLines={3} />

      {/* Class Card */}
      <CardSkeleton showHeader showContent contentLines={2} />

      {/* Actions Row */}
      <div className="flex gap-4 pt-4">
        <Skeleton className="h-10 flex-1" variant="rectangular" />
        <Skeleton className="h-10 w-48 flex-1" variant="rectangular" />
      </div>
    </div>
  );
}

/**
 * Teacher Classes Page Skeleton - matches exact layout
 */
export function TeacherClassesSkeleton() {
  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/2 mt-2" variant="text" />
        </div>
        <Skeleton className="h-10 w-32 shrink-0" variant="rectangular" />
      </div>

      {/* Create Form Card */}
      <CardSkeleton showHeader showContent contentLines={5} />

      {/* Classes Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton showHeader={false} showContent contentLines={4} className="p-5 h-full" />
        <CardSkeleton showHeader={false} showContent contentLines={4} className="p-5 h-full" />
        <CardSkeleton showHeader={false} showContent contentLines={4} className="p-5 h-full" />
      </div>
    </div>
  );
}

/**
 * LTI NRPS Page Skeleton - matches exact layout
 */
export function NRPSPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/2 mt-2" variant="text" />
        </div>
      </div>

      {/* Selection Cards Grid - 3 cards */}
      <div className="grid gap-4 md:grid-cols-3 mb-6">
        <CardSkeleton showHeader showContent contentLines={3} />
        <CardSkeleton showHeader showContent contentLines={3} />
        <CardSkeleton showHeader showContent contentLines={2} />
      </div>

      {/* Contexts Card */}
      <CardSkeleton showHeader showContent contentLines={3} className="mb-6" />

      {/* Members Table Card */}
      <CardSkeleton showHeader showContent contentLines={1} className="mb-6" />
    </div>
  );
}

/**
 * LTI AGS Page Skeleton - matches exact layout
 */
export function AGSPageSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/2 mt-2" variant="text" />
        </div>
      </div>

      {/* Filters Card */}
      <CardSkeleton showHeader showContent contentLines={3} className="mb-6" />

      {/* Line Items Card */}
      <CardSkeleton showHeader showContent contentLines={1} className="mb-6" />

      {/* Create Dialog Skeleton */}
      <CardSkeleton showHeader showContent contentLines={6} />
    </div>
  );
}

/**
 * Google Classroom Page Skeleton - matches exact layout
 */
export function GoogleClassroomSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div>
          <Skeleton className="h-8 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/2 mt-2" variant="text" />
        </div>
        <Skeleton className="h-10 w-24 shrink-0" variant="rectangular" />
      </div>

      {/* Connect Card */}
      <CardSkeleton showHeader showContent contentLines={2} className="mb-6" />

      {/* Courses Table Card */}
      <CardSkeleton showHeader showContent contentLines={1} className="mb-6" />

      {/* Roster Card */}
      <CardSkeleton showHeader showContent contentLines={3} className="mb-6" />

      {/* Import Card */}
      <CardSkeleton showHeader showContent contentLines={3} />
    </div>
  );
}

/**
 * Deletion Request Page Skeleton - matches exact layout
 */
export function DeletionRequestSkeleton() {
  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-8 w-1/3" variant="text" />
          <Skeleton className="h-4 w-1/2 mt-2" variant="text" />
        </div>
      </div>

      {/* Request Form Card */}
      <CardSkeleton showHeader showContent contentLines={4} className="mb-6" />

      {/* Verification Card */}
      <CardSkeleton showHeader showContent contentLines={3} className="mb-6" />

      {/* History Table Card */}
      <CardSkeleton showHeader showContent contentLines={1} />
    </div>
  );
}

/**
 * OAuth Callback Page Skeleton - matches exact layout
 */
export function OAuthCallbackSkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <Skeleton className="h-12 w-12 mx-auto animate-pulse" variant="circular" />
        <Skeleton className="mt-4 h-4 w-1/3 mx-auto" variant="text" />
      </div>
    </div>
  );
}

/**
 * Unauthorized Page Skeleton - matches exact layout
 */
export function UnauthorizedSkeleton() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4">
      <CardSkeleton showHeader showContent contentLines={2} className="w-full max-w-md mx-auto" />
    </main>
  );
}

/**
 * Parent Children Page Skeleton - matches exact layout
 */
export function ParentChildrenSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <CardSkeleton showHeader={false} showContent contentLines={5} className="p-6 h-full" />
        <CardSkeleton showHeader={false} showContent contentLines={5} className="p-6 h-full" />
        <CardSkeleton showHeader={false} showContent contentLines={5} className="p-6 h-full" />
      </div>
    </div>
  );
}

/**
 * Parent Consent Page Skeleton - matches exact layout
 */
export function ParentConsentSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-xl mx-auto">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <CardSkeleton showHeader showContent contentLines={6} />
    </div>
  );
}

/**
 * Parent Child Detail Page Skeleton
 */
export function ParentChildDetailSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4 mb-6">
        <AvatarSkeleton size="lg" />
        <div>
          <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
          <Skeleton className="h-4 w-1/2" variant="text" />
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CardSkeleton showHeader showContent contentLines={6} className="h-full" />
        </div>
        <div className="space-y-4">
          <CardSkeleton showHeader showContent contentLines={4} />
          <CardSkeleton showHeader showContent contentLines={4} />
        </div>
      </div>
    </div>
  );
}

/**
 * Student Settings Page Skeleton
 */
export function StudentSettingsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-8 w-8" variant="circular" />
        <Skeleton className="h-8 w-1/4" variant="text" />
      </div>

      <CardSkeleton 
        showHeader 
        showContent 
        contentLines={3}
      />

      <CardSkeleton 
        showHeader 
        showContent 
        contentLines={1}
      />
    </div>
  );
}

/**
 * Parent Settings Page Skeleton
 */
export function ParentSettingsSkeleton() {
  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <Skeleton className="h-8 w-8" variant="circular" />
        <Skeleton className="h-8 w-1/4" variant="text" />
      </div>

      <CardSkeleton 
        showHeader 
        showContent 
        contentLines={3}
      />

      <CardSkeleton 
        showHeader 
        showContent 
        contentLines={1}
      />
    </div>
  );
}

/**
 * Admin Dashboard Page Skeleton
 */
export function AdminDashboardSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
        <StatCardSkeleton />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <CardSkeleton showHeader showContent contentLines={4} className="h-full" />
        <CardSkeleton showHeader showContent contentLines={4} className="h-full" />
      </div>
    </div>
  );
}

/**
 * Admin LTI Platforms Page Skeleton
 */
export function AdminLtiPlatformsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <CardSkeleton showHeader showContent contentLines={1} className="mb-6" />
      <CardSkeleton showHeader showContent contentLines={1} />
    </div>
  );
}

/**
 * Admin LTI Deployments Page Skeleton
 */
export function AdminLtiDeploymentsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <CardSkeleton showHeader showContent contentLines={1} className="mb-6" />
      <CardSkeleton showHeader showContent contentLines={1} />
    </div>
  );
}

/**
 * Admin Districts Page Skeleton
 */
export function AdminDistrictsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-6">
        <CardSkeleton showHeader={false} showContent contentLines={5} className="p-6 h-full" />
        <CardSkeleton showHeader={false} showContent contentLines={5} className="p-6 h-full" />
        <CardSkeleton showHeader={false} showContent contentLines={5} className="p-6 h-full" />
      </div>
    </div>
  );
}

/**
 * Admin Deletion Requests Page Skeleton
 */
export function AdminDeletionRequestsSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <CardSkeleton showHeader showContent contentLines={1} />
    </div>
  );
}

/**
 * Admin Compliance Consent Page Skeleton
 */
export function AdminComplianceConsentSkeleton() {
  return (
    <div className="space-y-6 p-6 max-w-2xl">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <CardSkeleton showHeader showContent contentLines={4} />
    </div>
  );
}

/**
 * Admin Audit Page Skeleton
 */
export function AdminAuditSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <CardSkeleton showHeader showContent contentLines={1} />
    </div>
  );
}

/**
 * Admin Retention Page Skeleton
 */
export function AdminRetentionSkeleton() {
  return (
    <div className="space-y-6 p-6">
      <div>
        <Skeleton className="h-8 w-1/3 mb-2" variant="text" />
        <Skeleton className="h-4 w-1/2" variant="text" />
      </div>

      <CardSkeleton showHeader showContent contentLines={4} />
    </div>
  );
}

/**
 * Tutor Chat Area Skeleton
 */
export function TutorChatSkeleton() {
  return (
    <div className="card h-[600px] flex flex-col">
      {/* Header */}
      <div className="card-header p-4 border-b">
        <div className="flex items-center gap-3">
          <Skeleton className="h-10 w-10" variant="circular" />
          <div>
            <Skeleton className="h-5 w-1/3" variant="text" />
            <Skeleton className="h-3 w-1/4" variant="text" />
          </div>
        </div>
      </div>
      
      {/* Messages */}
      <div className="card-content flex-1 overflow-y-auto p-4 space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-8 w-8 shrink-0" variant="circular" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-3/4" variant="text" />
              <Skeleton className="h-4 w-1/2" variant="text" />
            </div>
          </div>
        ))}
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 shrink-0" variant="circular" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" variant="text" />
            <Skeleton className="h-4 w-1/3" variant="text" />
          </div>
        </div>
      </div>
      
      {/* Input */}
      <div className="card-footer p-4 border-t">
        <div className="flex gap-2">
          <Skeleton className="h-10 flex-1" variant="rectangular" />
          <Skeleton className="h-10 w-10 shrink-0" variant="rectangular" />
        </div>
      </div>
    </div>
  );
}