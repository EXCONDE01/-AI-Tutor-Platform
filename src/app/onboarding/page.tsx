"use client";

import * as React from "react";
import { useState, Suspense, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, UserCog, GraduationCap, ShieldUser, Check, AlertCircle } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

type Role = "teacher" | "student" | "parent";

interface RoleOption {
  value: Role;
  label: string;
  description: string;
  icon: React.ElementType;
}

const ROLE_OPTIONS: RoleOption[] = [
  {
    value: "teacher",
    label: "Teacher",
    description: "Create classes, configure tutors, and monitor student sessions",
    icon: UserCog,
  },
  {
    value: "student",
    label: "Student",
    description: "Chat with AI tutor, track progress, and get help 24/7",
    icon: GraduationCap,
  },
  {
    value: "parent",
    label: "Parent",
    description: "View your child's progress, sessions, and give consent",
    icon: ShieldUser,
  },
];

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const registered = searchParams.get("registered") === "true";

  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleRoleSelect = (role: Role) => {
    startTransition(() => {
      setSelectedRole(role);
      setErrorMessage(null);
    });
  };

  const handleSubmit = async () => {
    if (!selectedRole) {
      setErrorMessage("Please select your role");
      return;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Register app-level role via onboarding API
      console.log('[Onboarding] Calling onboarding with role:', selectedRole);
      const onboardingRes = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role: selectedRole }),
      });
      const onboardingData = await onboardingRes.json();
      console.log('[Onboarding] Onboarding response:', onboardingRes.status, onboardingData);

      if (!onboardingRes.ok) {
        throw new Error(onboardingData.error || "Failed to complete onboarding");
      }

      // Redirect based on role
      switch (selectedRole) {
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
          router.push("/");
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setErrorMessage(message || "An unexpected error occurred. Please try again.");
      console.error('[Onboarding] Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-12">
      <Card className="w-full max-w-lg">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-2xl font-bold tracking-tight">
            {registered ? "Welcome!" : "Complete your setup"}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {registered 
              ? "Thanks for signing up! Let's finish setting up your account."
              : "Select your role to continue"}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {errorMessage && (
            <Alert variant="destructive" className="gap-2">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <AlertDescription className="text-sm">{errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Role Selection - vertical stack for readability */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-foreground">I am a</h3>
            <div className="space-y-2" role="radiogroup" aria-label="Select your role">
              {ROLE_OPTIONS.map((option) => {
                const Icon = option.icon;
                const isSelected = selectedRole === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="radio"
                    aria-checked={isSelected}
                    onClick={() => handleRoleSelect(option.value)}
                    className={cn(
                      "relative w-full p-4 text-left transition-all duration-200 rounded-xl border-2",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-[0_0_0_1px_rgba(var(--primary),0.1)]"
                        : "border-border hover:border-primary/50 hover:bg-accent/30",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
                    )}
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={cn(
                          "flex-shrink-0 flex h-12 w-12 items-center justify-center rounded-lg transition-colors",
                          isSelected ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Icon className="h-6 w-6" aria-hidden="true" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className={cn(
                          "font-medium text-base leading-tight",
                          isSelected ? "text-primary" : "text-foreground"
                        )}>
                          {option.label}
                        </div>
                        <div className={cn(
                          "text-sm mt-1.5 leading-relaxed",
                          isSelected ? "text-primary/80" : "text-muted-foreground"
                        )}>
                          {option.description}
                        </div>
                      </div>
                      {isSelected && (
                        <div className="flex-shrink-0 text-primary">
                          <Check className="h-5 w-5" aria-hidden="true" />
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          <Button 
            type="button" 
            className="w-full" 
            size="lg" 
            disabled={isLoading || !selectedRole}
            onClick={handleSubmit}
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Setting up...
              </>
            ) : (
              "Continue"
            )}
          </Button>

          {!selectedRole && (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground">
                Select your role above to continue
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center">
          <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary" />
          <p className="mt-4 text-muted-foreground">Loading...</p>
        </div>
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}