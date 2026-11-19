"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  MessageSquare,
  Loader2,
  AlertCircle,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertTitle, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { TutorChat } from "@/components/student/TutorChat";
import { ClassSelector } from "@/components/teacher/sessions/new/ClassSelector";
import { StudentSelector, type ClassStudentOption } from "@/components/teacher/sessions/new/StudentSelector";
import { TeacherNewSessionSkeleton } from "@/components/ui/page-skeletons";
import { formatClassMeta, formatTermYear, classStatusVariant, type ClassData } from "@/lib/classes/format";

type Step = "select" | "chat";

function BackToSessionsButton({ label = "Back to sessions" }: { label?: string }) {
  return (
    <Button variant="ghost" size="sm" asChild className="-ml-2 w-fit">
      <Link href="/teacher/sessions" aria-label="Back to sessions">
        <ArrowLeft className="mr-2 h-4 w-4" aria-hidden="true" />
        {label}
      </Link>
    </Button>
  );
}

export default function NewSessionPage() {
  const router = useRouter();

  const [classes, setClasses] = React.useState<ClassData[]>([]);
  const [isLoadingClasses, setIsLoadingClasses] = React.useState(true);
  const [classesError, setClassesError] = React.useState<string | null>(null);

  const [selectedClassId, setSelectedClassId] = React.useState<string | null>(null);
  const [students, setStudents] = React.useState<ClassStudentOption[]>([]);
  const [isLoadingStudents, setIsLoadingStudents] = React.useState(false);
  const [studentsError, setStudentsError] = React.useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = React.useState<string | null>(null);

  const [isCreating, setIsCreating] = React.useState(false);
  const [createError, setCreateError] = React.useState<string | null>(null);

  const [step, setStep] = React.useState<Step>("select");
  const [sessionId, setSessionId] = React.useState<string | null>(null);

  React.useEffect(() => {
    const controller = new AbortController();

    const loadClasses = async () => {
      try {
        const res = await fetch("/api/teacher/classes", {
          credentials: "include",
          signal: controller.signal,
        });

        if (res.status === 401 || res.status === 403) {
          router.push("/sign-in");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load classes");
        }

        const data = await res.json();
        if (!controller.signal.aborted) {
          setClasses(Array.isArray(data.classes) ? data.classes : []);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setClassesError(error instanceof Error ? error.message : "Failed to load classes");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingClasses(false);
        }
      }
    };

    void loadClasses();
    return () => controller.abort();
  }, [router]);

  React.useEffect(() => {
    if (!selectedClassId) return;

    const controller = new AbortController();
    const classId = selectedClassId;

    const loadStudents = async () => {
      try {
        const res = await fetch(`/api/teacher/classes/${classId}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (res.status === 401 || res.status === 403) {
          router.push("/sign-in");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load students");
        }

        const data = await res.json();
        if (!controller.signal.aborted) {
          setStudents(Array.isArray(data.students) ? data.students : []);
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        if (!controller.signal.aborted) {
          setStudents([]);
          setStudentsError(error instanceof Error ? error.message : "Failed to load students");
        }
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingStudents(false);
        }
      }
    };

    void loadStudents();
    return () => controller.abort();
  }, [router, selectedClassId]);

  const selectedClass = React.useMemo(
    () => classes.find((cls) => cls.id === selectedClassId) ?? null,
    [classes, selectedClassId]
  );

  const selectedStudent = React.useMemo(
    () => students.find((student) => student.id === selectedStudentId) ?? null,
    [students, selectedStudentId]
  );

  const handleSelectClass = (classId: string) => {
    if (classId === selectedClassId) return;
    setSelectedClassId(classId);
    setSelectedStudentId(null);
    setStudents([]);
    setStudentsError(null);
    setIsLoadingStudents(true);
    setCreateError(null);
  };

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudentId(studentId);
    setCreateError(null);
  };

  const handleRetryClasses = () => {
    setIsLoadingClasses(true);
    setClassesError(null);

    const controller = new AbortController();
    const loadClasses = async () => {
      try {
        const res = await fetch("/api/teacher/classes", {
          credentials: "include",
          signal: controller.signal,
        });

        if (res.status === 401 || res.status === 403) {
          router.push("/sign-in");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load classes");
        }

        const data = await res.json();
        setClasses(Array.isArray(data.classes) ? data.classes : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setClassesError(error instanceof Error ? error.message : "Failed to load classes");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingClasses(false);
        }
      }
    };

    void loadClasses();
  };

  const handleRetryStudents = () => {
    if (!selectedClassId) return;

    setIsLoadingStudents(true);
    setStudentsError(null);

    const controller = new AbortController();
    const classId = selectedClassId;
    const loadStudents = async () => {
      try {
        const res = await fetch(`/api/teacher/classes/${classId}`, {
          credentials: "include",
          signal: controller.signal,
        });

        if (res.status === 401 || res.status === 403) {
          router.push("/sign-in");
          return;
        }
        if (!res.ok) {
          const body = await res.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load students");
        }

        const data = await res.json();
        setStudents(Array.isArray(data.students) ? data.students : []);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStudents([]);
        setStudentsError(error instanceof Error ? error.message : "Failed to load students");
      } finally {
        if (!controller.signal.aborted) {
          setIsLoadingStudents(false);
        }
      }
    };

    void loadStudents();
  };

  const handleStartSession = async () => {
    if (!selectedClassId || !selectedStudentId || isCreating) return;

    setIsCreating(true);
    setCreateError(null);

    try {
      const res = await fetch("/api/teacher/sessions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          classId: selectedClassId,
          studentId: selectedStudentId,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.status === 401 || res.status === 403) {
        router.push("/sign-in");
        return;
      }

      if (!res.ok) {
        const message = typeof data.error === "string" ? data.error : "Failed to create session";
        if (res.status === 400 && message.toLowerCase().includes("tutor configuration")) {
          setCreateError(
            "This class needs a tutor configuration before a session can start. Please try again in a moment, or ask an administrator if the issue persists."
          );
        } else if (res.status === 400 && message.toLowerCase().includes("not enrolled")) {
          setCreateError("This student is no longer actively enrolled in the selected class.");
        } else {
          setCreateError(message);
        }
        return;
      }

      const createdId = data?.session?.id;
      if (!createdId || typeof createdId !== "string") {
        setCreateError("Session was created but its ID could not be read. Check the sessions list.");
        return;
      }

      setSessionId(createdId);
      setStep("chat");
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : "Failed to create session");
    } finally {
      setIsCreating(false);
    }
  };

  if (isLoadingClasses) {
    return <TeacherNewSessionSkeleton />;
  }

  if (step === "chat" && sessionId && selectedClass && selectedStudent) {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <BackToSessionsButton />
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">Tutoring session</h1>
            <p className="text-sm text-muted-foreground">
              {selectedStudent.name} · {selectedClass.name}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="success" className="gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
              Active
            </Badge>
            <Button asChild variant="outline" size="sm">
              <Link href={`/teacher/sessions/${sessionId}`}>
                <ExternalLink className="mr-2 h-4 w-4" aria-hidden="true" />
                Session details
              </Link>
            </Button>
          </div>
        </div>

        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <p className="font-medium truncate">{selectedStudent.name}</p>
              <p className="text-sm text-muted-foreground truncate">
                {selectedClass.name}
                {selectedClass.subject ? ` · ${selectedClass.subject}` : ""}
              </p>
            </div>
            <p className="text-xs text-muted-foreground">
              Session ID: <span className="font-mono">{sessionId.slice(0, 8)}…</span>
            </p>
          </CardContent>
        </Card>

        <TutorChat initialSessionId={sessionId} />

        <p className="text-xs text-muted-foreground">
          Messages you send here are part of this student&apos;s tutoring session transcript.
        </p>
      </div>
    );
  }

  const activeStudents = students.filter((student) => student.isActive);
  const canStart = Boolean(
    selectedClassId &&
      selectedStudentId &&
      selectedClass?.status === "active" &&
      activeStudents.some((student) => student.id === selectedStudentId) &&
      !isCreating
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="space-y-2">
        <BackToSessionsButton />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Start a tutoring session</h1>
          <p className="mt-1 text-muted-foreground">
            Choose a class and an enrolled student to begin a new AI tutoring session.
          </p>
        </div>
      </div>

      {classesError && classes.length === 0 && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" aria-hidden="true" />
          <AlertTitle>Couldn&apos;t load classes</AlertTitle>
          <AlertDescription className="space-y-3">
            <p>{classesError}</p>
            <Button variant="outline" size="sm" onClick={handleRetryClasses}>
              Try again
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {!classesError && classes.length === 0 && (
        <Card>
          <CardContent className="space-y-4 py-12 text-center">
            <MessageSquare
              className="mx-auto h-12 w-12 text-muted-foreground/50"
              aria-hidden="true"
            />
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">No classes yet</h2>
              <p className="text-sm text-muted-foreground">
                Create a class and enroll students before starting a tutoring session.
              </p>
            </div>
            <Button asChild>
              <Link href="/teacher/classes">
                <Sparkles className="mr-2 h-4 w-4" aria-hidden="true" />
                Go to classes
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}

      {classes.length > 0 && (
        <>
          <ClassSelector
            classes={classes}
            selectedClassId={selectedClassId}
            onSelectClass={handleSelectClass}
            error={classesError}
            onRetry={handleRetryClasses}
          />

          {selectedClass && (
            <div className="space-y-4">
              <Card className="border-primary/20 bg-primary/5">
                <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{selectedClass.name}</p>
                    <p className="text-sm text-muted-foreground truncate">
                      {formatClassMeta(selectedClass.subject, selectedClass.gradeLevel)}
                      {selectedClass.term || selectedClass.year
                        ? ` · ${formatTermYear(selectedClass.term, selectedClass.year)}`
                        : ""}
                    </p>
                  </div>
                  <Badge variant={classStatusVariant(selectedClass.status)}>
                    {selectedClass.status}
                  </Badge>
                </CardContent>
              </Card>

              <StudentSelector
                students={students}
                selectedStudentId={selectedStudentId}
                onSelectStudent={handleSelectStudent}
                isLoading={isLoadingStudents}
                error={studentsError}
                classId={selectedClass.id}
                onRetry={handleRetryStudents}
              />
            </div>
          )}

          {createError && (
            <Alert variant="destructive" role="alert">
              <AlertCircle className="h-4 w-4" aria-hidden="true" />
              <AlertTitle>Unable to start session</AlertTitle>
              <AlertDescription className="space-y-2">
                <p>{createError}</p>
                {selectedClass && createError.toLowerCase().includes("tutor configuration") && (
                  <p className="text-sm">
                    If this keeps happening,{" "}
                    <Link
                      href={`/teacher/classes/${selectedClass.id}`}
                      className="font-medium underline underline-offset-4"
                    >
                      view class details
                    </Link>{" "}
                    or try starting the session again.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
            <Button variant="outline" asChild disabled={isCreating}>
              <Link href="/teacher/sessions">Cancel</Link>
            </Button>
            <Button
              type="button"
              onClick={handleStartSession}
              disabled={!canStart}
              className="sm:min-w-[180px]"
            >
              {isCreating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  Starting…
                </>
              ) : (
                <>
                  <MessageSquare className="mr-2 h-4 w-4" aria-hidden="true" />
                  Start session
                </>
              )}
            </Button>
          </div>

          {!selectedClassId && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Select a class to continue.
            </p>
          )}
          {selectedClassId && !selectedStudentId && !isLoadingStudents && !studentsError && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              Select an active student to start a session.
            </p>
          )}
        </>
      )}
    </div>
  );
}
