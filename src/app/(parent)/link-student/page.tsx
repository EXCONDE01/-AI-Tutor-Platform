"use client";

import * as React from "react";
import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Link2, CheckCircle, AlertCircle, Info } from "lucide-react";
import { toast } from "sonner";

export default function ParentLinkStudentPage() {
  const [linkingCode, setLinkingCode] = useState("");
  const [linking, setLinking] = useState(false);
  const [success, setSuccess] = useState<{ studentName: string; studentId: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLinking(true);

    try {
      const res = await fetch("/api/parent/link-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ linkingCode }),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setSuccess({ studentName: data.studentName, studentId: data.studentId });
        toast.success(`Successfully linked to ${data.studentName}`);
      } else {
        setError(data.error || "Failed to link student");
        toast.error(data.error || "Failed to link student");
      }
    } catch (err) {
      setError("An unexpected error occurred");
      toast.error("An unexpected error occurred");
    } finally {
      setLinking(false);
    }
  };

  const handleNewLink = () => {
    setLinkingCode("");
    setSuccess(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Link a Student</h1>
          <p className="text-muted-foreground">
            Enter a student linking code to connect your account to their profile
          </p>
        </div>
        <Link href="/parent/children">
          <Button variant="outline">← Back to Children</Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link2 className="h-5 w-5" />
            Link Student Account
          </CardTitle>
          <CardDescription>
            Students can generate a linking code from their account settings. Enter the code below to request access to view their progress.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {success ? (
            <div className="space-y-4">
              <Alert className="border-green-200 bg-green-50">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <AlertDescription>
                  <strong>Successfully linked to {success.studentName}!</strong>
                </AlertDescription>
              </Alert>
              <div className="flex gap-2">
                <Button onClick={handleNewLink} variant="outline">
                  Link Another Student
                </Button>
                <Link href="/parent/children">
                  <Button>View All Children</Button>
                </Link>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="linkingCode">Student Linking Code</Label>
                <Input
                  id="linkingCode"
                  type="text"
                  value={linkingCode}
                  onChange={e => setLinkingCode(e.target.value)}
                  placeholder="Enter the UUID linking code from student account"
                  className="font-mono text-sm"
                  required
                  disabled={linking}
                  autoComplete="off"
                />
                <p className="text-sm text-muted-foreground">
                  The student can find this code in their Account Settings page. It looks like:
                  <code className="ml-2 px-1.5 py-0.5 bg-muted rounded text-xs font-mono">
                    123e4567-e89b-12d3-a456-426614174000
                  </code>
                </p>
              </div>

              <Alert className="border-blue-200 bg-blue-50">
                <Info className="h-4 w-4 text-blue-500" />
                <AlertDescription>
                  <strong>FERPA/COPPA Notice:</strong> Linking requires verifiable parental consent for children under 13.
                  After linking, you may need to complete consent forms before viewing full progress data.
                </AlertDescription>
              </Alert>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={linking}>
                {linking ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Linking...
                  </>
                ) : (
                  "Link Student"
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Information card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            How It Works
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">1</span>
            </div>
            <div>
              <p className="font-medium">Student generates code</p>
              <p className="text-muted-foreground">
                The student logs in and goes to Account Settings to generate a unique linking code.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">2</span>
            </div>
            <div>
              <p className="font-medium">You enter the code</p>
              <p className="text-muted-foreground">
                Paste the code above and submit. We will verify the student exists.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">3</span>
            </div>
            <div>
              <p className="font-medium">Complete consent (if needed)</p>
              <p className="text-muted-foreground">
                For students under 13, COPPA requires verifiable parental consent before data is visible.
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
              <span className="text-primary font-bold text-sm">4</span>
            </div>
            <div>
              <p className="font-medium">View progress</p>
              <p className="text-muted-foreground">
                Once linked and consented, you can view session summaries, artifacts, and progress reports.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}