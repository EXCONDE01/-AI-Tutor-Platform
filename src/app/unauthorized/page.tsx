import Link from "next/link";
import { ShieldAlert, LogIn, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getAppUser } from "@/lib/auth/provision";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Access denied",
};

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

const ROLE_LABELS: Record<string, string> = {
  admin: "administrator",
  teacher: "teacher",
  parent: "parent",
  student: "student",
};

const ROLE_DASHBOARDS: Record<string, string> = {
  admin: "/admin",
  teacher: "/teacher/dashboard",
  parent: "/parent/children",
  student: "/student/classes",
};

function normalizeRole(role: string | string[] | undefined): string | null {
  if (!role) return null;
  const single = Array.isArray(role) ? role[0] : role;
  return ROLE_LABELS[single] ? single : null;
}

export default async function UnauthorizedPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const requiredRole = normalizeRole(params.requiredRole);

  // Try to get the current user's app role to link to their dashboard
  let userDashboardHref = "/";
  let userDashboardLabel = "Go home";

  try {
    const appUser = await getAppUser();
    if (appUser?.role && ROLE_DASHBOARDS[appUser.role]) {
      userDashboardHref = ROLE_DASHBOARDS[appUser.role];
      userDashboardLabel = `Go to ${ROLE_LABELS[appUser.role]} dashboard`;
    }
  } catch {
    // Silently fail — fall back to home
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-background px-4" role="main">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldAlert className="h-6 w-6" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl font-bold">Access denied</CardTitle>
          <CardDescription className="mt-2">
            You don&apos;t have access to this area.
            {requiredRole && (
              <>
                <br />
                This section requires an {ROLE_LABELS[requiredRole]} account.
              </>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-col gap-3">
            <Button
              asChild
              size="lg"
              className="w-full justify-center gap-2"
            >
              <Link href={userDashboardHref}>
                {userDashboardLabel}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <Button
              asChild
              variant="outline"
              size="lg"
              className="w-full justify-center gap-2"
            >
              <Link href="/sign-in">
                <LogIn className="h-4 w-4" aria-hidden="true" />
                Sign in as a different user
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </main>
  );
}