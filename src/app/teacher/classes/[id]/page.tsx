"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from "@/components/ui/table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";
import {
  ArrowLeft,
  Copy,
  Check,
  Users,
  UserX,
  AlertTriangle,
} from "lucide-react";
import { formatDate, getInitials } from "@/lib/utils";
import { formatGradeLevel } from "@/lib/classes/format";

interface ClassData {
  class: {
    id: string;
    name: string;
    subject: string;
    gradeLevel: number | null;
    status: "active" | "draft" | "archived";
    joinCode: string | null;
    description: string | null;
    maxStudents: number | null;
    studentCount: number;
    term: string | null;
    year: number | null;
    createdAt: string;
  };
  students: Array<{
    id: string;
    name: string;
    email: string;
    gradeLevel: number | null;
    enrolledAt: string;
    isActive: boolean;
  }>;
}

export default function TeacherClassDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { toast } = useToast();

  const [data, setData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);

  const classId = params?.id;

  const fetchClass = useCallback(async () => {
    if (!classId) return;

    setLoading(true);
    setError(null);
    setNotFound(false);

    try {
      const res = await fetch(`/api/teacher/classes/${classId}`, {
        credentials: "include",
      });

      if (res.status === 404) {
        setNotFound(true);
        return;
      }

      if (res.status === 401 || res.status === 403) {
        setError("You don't have permission to view this class.");
        return;
      }

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Failed to load class" }));
        setError(err.error || "Failed to load class");
        return;
      }

      const json = await res.json();
      setData(json);
    } catch {
      setError("Network error. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [classId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchClass();
  }, [fetchClass]);

  const handleCopy = async () => {
    if (!data?.class.joinCode) return;

    try {
      await navigator.clipboard.writeText(data.class.joinCode);
      setCopied(true);
      toast({
        title: "Copied!",
        description: "Join code copied to clipboard",
        variant: "success",
      });
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback: hidden textarea + execCommand
      try {
        const textarea = document.createElement("textarea");
        textarea.value = data.class.joinCode;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);

        setCopied(true);
        toast({
          title: "Copied!",
          description: "Join code copied to clipboard",
          variant: "success",
        });
        setTimeout(() => setCopied(false), 2000);
      } catch {
        setCopyError(true);
        toast({
          title: "Copy failed",
          description: "Please manually copy the join code",
          variant: "destructive",
        });
        setTimeout(() => setCopyError(false), 2000);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge variant="success">Active</Badge>;
      case "draft":
        return <Badge variant="secondary">Draft</Badge>;
      case "archived":
        return <Badge variant="outline">Archived</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getStudentStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="success">Active</Badge>
    ) : (
      <Badge variant="outline">Inactive</Badge>
    );
  };

  // Render loading skeleton inline while client fetch is in flight
  if (loading && !data && !error && !notFound) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto p-6">
        {/* Breadcrumb/Back skeleton */}
        <div className="h-8 w-24 animate-pulse bg-muted rounded-md" />

        {/* Header Card Skeleton */}
        <Card>
          <CardHeader>
            <div className="h-8 w-3/4 animate-pulse bg-muted rounded" />
            <div className="h-5 w-1/3 mt-2 animate-pulse bg-muted rounded-full" />
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="h-4 w-1/2 animate-pulse bg-muted rounded" />
            <div className="h-4 w-1/3 animate-pulse bg-muted rounded" />
            <div className="h-4 w-1/4 animate-pulse bg-muted rounded" />
            <div className="flex gap-2">
              <div className="h-10 w-32 flex-1 animate-pulse bg-muted rounded-md" />
              <div className="h-10 w-32 flex-1 animate-pulse bg-muted rounded-md" />
            </div>
          </CardContent>
        </Card>

        {/* Join Code Card Skeleton */}
        <Card>
          <CardContent className="space-y-3 p-6">
            <div className="h-3 w-1/4 animate-pulse bg-muted rounded" />
            <div className="h-10 w-1/3 animate-pulse bg-muted rounded-md" />
            <div className="h-3 w-1/2 animate-pulse bg-muted rounded" />
          </CardContent>
        </Card>

        {/* Stat Cards Skeleton */}
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="h-4 w-1/3 animate-pulse bg-muted rounded" />
                <div className="h-4 w-4 animate-pulse bg-muted rounded-full" />
              </div>
              <div className="card-content">
                <div className="h-8 w-1/4 animate-pulse bg-muted rounded" />
                <div className="h-3 w-1/2 mt-2 animate-pulse bg-muted rounded" />
              </div>
            </Card>
          ))}
        </div>

        {/* Roster Table Skeleton */}
        <Card>
          <div className="card-header flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-5 w-1/4 animate-pulse bg-muted rounded" />
            <div className="h-5 w-16 animate-pulse bg-muted rounded-full" />
          </div>
          <CardContent>
            <div className="relative w-full overflow-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b text-left text-sm text-muted-foreground">
                    {[1, 2, 3, 4].map((i) => (
                      <th key={i} className="pb-3 px-4">
                        <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[1, 2, 3, 4, 5].map((i) => (
                    <tr key={i} className="border-t">
                      {[1, 2, 3, 4].map((j) => (
                        <td key={j} className="py-3 px-4">
                          <div className="h-4 w-3/4 animate-pulse bg-muted rounded" />
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // 404 Not Found
  if (notFound) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/teacher/classes")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to classes
          </Button>
        </div>
        <Card className="text-center py-12">
          <CardContent>
            <UserX className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h2 className="text-2xl font-bold mb-2">Class not found</h2>
            <p className="text-muted-foreground mb-6">
              This class may have been deleted, or it belongs to another teacher.
            </p>
            <Button onClick={() => router.push("/teacher/classes")}>Back to classes</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" size="sm" onClick={() => router.push("/teacher/classes")}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to classes
          </Button>
        </div>
        <Card>
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Unable to load class</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
            <Button className="mt-4" onClick={fetchClass}>
              Try again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Success state - render the class detail
  if (!data) return null;

  const { class: classData, students } = data;

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      {/* Breadcrumb / Back affordance */}
      <div className="flex items-center gap-2">
        <Button asChild variant="ghost" size="sm">
          <Link href="/teacher/classes">
            <ArrowLeft className="h-4 w-4 mr-1" aria-hidden="true" />
            Back to classes
          </Link>
        </Button>
      </div>

      {/* Header Card */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl sm:text-3xl font-bold tracking-tight">
                {classData.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-2">
                {getStatusBadge(classData.status)}
                <span className="text-muted-foreground">
                  {classData.subject} · {formatGradeLevel(classData.gradeLevel)}
                </span>
              </div>
            </div>
          </div>
          <div className="text-sm text-muted-foreground mt-4">
            <div className="space-y-1 text-sm text-muted-foreground">
              <p>
                {[classData.term, classData.year].filter(Boolean).join(" ")}
                {classData.term || classData.year ? " · " : ""}
                Created{" "}
                {formatDate(classData.createdAt, { month: "short", day: "numeric", year: "numeric" })}
              </p>
              {classData.description && (
                <p className="text-base text-foreground">{classData.description}</p>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button asChild>
              <Link href="/teacher/sessions/new">Start session</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href="/teacher/sessions">View sessions</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Join Code Panel */}
      {classData.joinCode && (
        <Card className="bg-muted/50 border-muted/50">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Join code</p>
                <code
                  className="font-mono text-2xl sm:text-3xl tracking-[0.2em] bg-background px-4 py-2 rounded-lg border inline-block"
                  aria-live="polite"
                >
                  {classData.joinCode}
                </code>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  disabled={copied || copyError}
                  aria-label={copied ? "Copied" : "Copy join code"}
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-tutor-green" aria-hidden="true" />
                  ) : copyError ? (
                    <AlertTriangle className="h-4 w-4 text-destructive" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span className="ml-1 hidden sm:inline">
                    {copied ? "Copied" : copyError ? "Failed" : "Copy"}
                  </span>
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-3">
              Students use this code to enroll in the class.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stat Row */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Students enrolled</p>
            <p className="text-2xl font-semibold">
              {classData.studentCount} / {classData.maxStudents ?? 30}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Status</p>
            <p className="text-2xl font-semibold capitalize">{classData.status}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-6">
            <p className="text-sm text-muted-foreground">Term</p>
            <p className="text-2xl font-semibold">
              {[classData.term, classData.year].filter(Boolean).join(" ") || "—"}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Roster Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Students</CardTitle>
          <Badge variant="secondary">{students.length}</Badge>
        </CardHeader>
        <CardContent>
          {students.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-10 w-10 mx-auto text-muted-foreground mb-4 opacity-50" />
              <h3 className="text-lg font-medium mb-1">No students yet</h3>
              <p className="text-muted-foreground">
                Share the join code above so students can enroll.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="hidden sm:table-cell">Enrolled</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{getInitials(student.name)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium">{student.name}</p>
                            <p className="text-sm text-muted-foreground">{student.email}</p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{formatGradeLevel(student.gradeLevel)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        {formatDate(student.enrolledAt, {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </TableCell>
                      <TableCell>{getStudentStatusBadge(student.isActive)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}