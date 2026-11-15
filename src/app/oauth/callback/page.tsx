"use client";

import * as React from "react";
import { useEffect, Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { OAuthCallbackSkeleton } from "@/components/ui/page-skeletons";

function OAuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // The OAuth flow is handled by the server, this page just redirects
    // after the server sets the session cookie
    const timer = setTimeout(async () => {
      // Fetch the app-level role from the API
      try {
        const roleResponse = await fetch("/api/auth/role");
        if (roleResponse.ok) {
          const { role } = await roleResponse.json();
          
          if (role === "admin") {
            router.push("/admin/lti/platforms");
            router.refresh();
          } else if (role === "teacher") {
            router.push("/teacher/dashboard");
            router.refresh();
          } else if (role === "student") {
            router.push("/student/classes");
            router.refresh();
          } else if (role === "parent") {
            router.push("/parent/children");
            router.refresh();
          } else {
            router.push(callbackUrl);
            router.refresh();
          }
        } else {
          router.push(callbackUrl);
          router.refresh();
        }
      } catch {
        router.push(callbackUrl);
        router.refresh();
      }
    }, 100);

    return () => clearTimeout(timer);
  }, [router, callbackUrl]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Completing sign in...</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}