"use client";

import * as React from "react";
import { BookOpen, Clock, Users, BrainCircuit, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import Link from "next/link";
import { formatGradeLevel, formatTermYear, formatSessionCount, type StudentEnrolledClass } from "@/lib/classes/format";
import { formatRelativeTime } from "@/lib/sessions/format";

interface ClassCardProps {
  class: StudentEnrolledClass;
  onLeave: (classId: string) => Promise<void>;
}

export function ClassCard({ class: cls, onLeave }: ClassCardProps) {
  const [leaveDialogOpen, setLeaveDialogOpen] = React.useState(false);
  const [leaving, setLeaving] = React.useState(false);

  const handleLeave = async () => {
    setLeaving(true);
    try {
      await onLeave(cls.id);
      setLeaveDialogOpen(false);
    } finally {
      setLeaving(false);
    }
  };

  const termYear = formatTermYear(cls.term, cls.year);
  const sessionCountText = formatSessionCount(cls.sessionCount);
  const lastActive = cls.lastSessionAt ? formatRelativeTime(cls.lastSessionAt) : null;
  const gradeText = cls.gradeLevel ? formatGradeLevel(cls.gradeLevel) : null;

  return (
    <Card className="flex flex-col h-full">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <h3 className="text-xl font-semibold truncate">{cls.name}</h3>
            <div className="flex flex-wrap items-center gap-2 mt-2 text-sm text-muted-foreground">
              <Badge variant="outline" className="text-xs">{cls.subject}</Badge>
              {gradeText && <span>{gradeText}</span>}
              {termYear && <span>{termYear}</span>}
              {cls.room && <span className="flex items-center gap-1"><BookOpen className="h-3 w-3" />{cls.room}</span>}
            </div>
          </div>
          <Badge variant={cls.hasTutorConfig ? "success" : "outline"} className="text-xs whitespace-nowrap shrink-0">
            {cls.hasTutorConfig ? (
              <>
                <BrainCircuit className="mr-1 h-3 w-3" />
                AI tutor ready
              </>
            ) : (
              <>
                <BrainCircuit className="mr-1 h-3 w-3" />
                Tutor not configured
              </>
            )}
          </Badge>
        </div>

        <p className="text-sm text-muted-foreground mt-3 line-clamp-2">{cls.description || "No description provided."}</p>

        <div className="flex items-center gap-3 mt-3 text-sm text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {cls.teacherName}
          </span>
          {cls.teacherEmail && <span className="flex items-center gap-1 truncate max-w-[200px]">{cls.teacherEmail}</span>}
        </div>
      </CardHeader>

      <CardContent className="flex flex-col flex-1 pt-0">
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4 pt-4 border-t">
          <span className="flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" />
            {sessionCountText}
          </span>
          {lastActive && (
            <span className="flex items-center gap-1">
              Last active: {lastActive}
            </span>
          )}
        </div>

        <div className="flex gap-2 mt-auto">
          <Button
            asChild
            variant="outline"
            size="sm"
            className="flex-1"
          >
            <Link href={`/student/sessions?classId=${cls.id}`}>
              <Clock className="mr-2 h-4 w-4" />
              Sessions
            </Link>
          </Button>
          <Button
            asChild
            size="sm"
            className="flex-1"
          >
            <Link href={`/student/sessions?classId=${cls.id}`}>
              <BrainCircuit className="mr-2 h-4 w-4" />
              Open tutor
            </Link>
          </Button>
        </div>

        {/* Leave Dialog */}
        <Dialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave class</DialogTitle>
              <DialogDescription>
                Are you sure you want to leave <strong>{cls.name}</strong>? You can rejoin later using the class join code.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setLeaveDialogOpen(false)} disabled={leaving}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleLeave} disabled={leaving}>
                {leaving ? "Leaving..." : "Leave class"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Button
          variant="outline"
          size="sm"
          className="w-full mt-2 text-destructive hover:text-destructive hover:bg-destructive/10"
          onClick={() => setLeaveDialogOpen(true)}
          disabled={leaving}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Leave class
        </Button>
      </CardContent>
    </Card>
  );
}