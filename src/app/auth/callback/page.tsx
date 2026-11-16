"use client";

import * as React from "react";
import { useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "/";
  const mode = searchParams.get("mode") || "signin"; // "signin" | "signup"
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");

  useEffect(() => {
    const handleCallback = async () => {
      if (error) {
        console.error('[AuthCallback] OAuth error:', error, errorDescription);
        
        // Handle specific Better Auth errors
        let userMessage = errorDescription || error;
        
        if (error === "account_not_linked" || error === "ACCOUNT_NOT_LINKED") {
          userMessage = "This email is already registered. Please sign in with your email and password, then link your Google account in Settings.";
        }
        
        // For signin/signup, redirect to sign-in with error
        router.push(`/sign-in?error=${encodeURIComponent(userMessage)}`);
        return;
      }

      // Wait a moment for Neon Auth to establish the session
      await new Promise(resolve => setTimeout(resolve, 500));

      try {
        // Check if user exists in our app database
        const roleResponse = await fetch("/api/auth/role", {
          credentials: "include",
        });

        if (roleResponse.ok) {
          const { role } = await roleResponse.json();
          
          if (mode === "signup" && role === "student") {
            // New user from sign-up flow - redirect to role selection/onboarding
            router.push("/onboarding");
            return;
          }

          // Existing user - redirect to appropriate dashboard
          switch (role) {
            case "admin":
              router.push("/admin/lti/platforms");
              break;
            case "teacher":
              router.push("/teacher/dashboard");
              break;
            case "student":
              router.push("/student/classes");
              break;
            case "parent":
              router.push("/parent/children");
              break;
            default:
              router.push(callbackUrl);
          }
          router.refresh();
        } else {
          console.error('[AuthCallback] Role lookup failed:', roleResponse.status);
          // If role lookup fails, try the fallback callback URL
          router.push(callbackUrl);
        }
      } catch (err) {
        console.error('[AuthCallback] Error:', err);
        router.push(callbackUrl);
      }
    };

    handleCallback();
  }, [router, callbackUrl, mode, error, errorDescription]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="text-center">
        <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">
          {mode === "signup" ? "Setting up your account..." : "Signing you in..."}
        </p>
      </div>
    </div>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}