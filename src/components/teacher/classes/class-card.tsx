"use client";

import * as React from "react";
import Link from "next/link";
import { MoreHorizontal, Play, Copy, Check, Trash2, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";
import {
  formatGradeLevel,
  formatClassMeta,
  classStatusVariant,
  type ClassData,
} from "@/lib/classes/format";

interface ClassCardProps {
  class: ClassData;
  onDeleted?: (id: string) => void;
}

export function ClassCard({ class: cls, onDeleted }: ClassCardProps) {
  const [copiedCode, setCopiedCode] = React.useState<string | null>(null);
  const [deleting, setDeleting] = React.useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = React.useState(false);

  const maxStudents = cls.maxStudents ?? 30;
  const studentCount = cls.studentCount ?? 0;

  const handleCopyCode = async (code: string) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(code);
      } else {
        // Fallback for non-secure contexts
        const textarea = document.createElement("textarea");
        textarea.value = code;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        document.body.removeChild(textarea);
      }
      setCopiedCode(code);
      toast({
        title: "Join code copied",
        description: "The join code has been copied to your clipboard.",
      });
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (error) {
      console.error("Failed to copy join code:", error);
      toast({
        variant: "destructive",
        title: "Failed to copy",
        description: "Could not copy the join code. Please try manually.",
      });
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await fetch(`/api/teacher/classes?id=${cls.id}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (res.ok) {
        toast({
          title: "Class deleted",
          description: `${cls.name} has been deleted.`,
        });
        setDeleteDialogOpen(false);
        onDeleted?.(cls.id);
      } else {
        const err = await res.json();
        toast({
          variant: "destructive",
          title: "Failed to delete class",
          description: err.error || "An error occurred while deleting the class.",
        });
      }
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Failed to delete class",
        description: "An unexpected error occurred.",
      });
    } finally {
      setDeleting(false);
    }
  };

  const statusVariant = classStatusVariant(cls.status);

  return (
    <Card className={cn("h-full transition-shadow hover:shadow-elevation-2", "card-hover")}>
      <CardContent className="p-5">
        {/* Header: Name + Status Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-lg truncate">{cls.name}</h3>
            <p className="text-sm text-muted-foreground mt-1">
              {formatClassMeta(cls.subject, cls.gradeLevel)}
            </p>
          </div>
          <Badge variant={statusVariant} className="shrink-0">
            {cls.status.charAt(0).toUpperCase() + cls.status.slice(1)}
          </Badge>
        </div>

        {/* Student Count */}
        <div className="mb-3">
          <Badge variant="outline" className="text-xs h-5 px-2">
            {studentCount} / {maxStudents} students
          </Badge>
        </div>

        {/* Join Code Block */}
        {cls.joinCode && (
          <div className="mb-4 p-3 rounded-lg bg-muted/50 border">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Join code</span>
              <div className="flex items-center gap-2">
                <code
                  className="font-mono text-base bg-background px-2 py-1 rounded border tracking-wider"
                  aria-label={`Join code ${cls.joinCode}`}
                >
                  {cls.joinCode}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleCopyCode(cls.joinCode)}
                  className="h-8 w-8"
                  aria-label={copiedCode === cls.joinCode ? "Copied" : "Copy join code"}
                  disabled={copiedCode === cls.joinCode}
                >
                  {copiedCode === cls.joinCode ? (
                    <Check className="h-4 w-4 text-tutor-green" aria-hidden="true" />
                  ) : (
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  )}
                  <span aria-live="polite" className="sr-only">
                    {copiedCode === cls.joinCode ? "Copied" : "Copy join code"}
                  </span>
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Share this code so students can enroll
            </p>
          </div>
        )}

        {/* Actions Row */}
        <div className="flex items-center gap-2 pt-2 border-t">
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href="/teacher/sessions/new">
              <Play className="h-4 w-4 mr-2" aria-hidden="true" />
              Start session
            </Link>
          </Button>
          <Button asChild variant="outline" size="sm" className="flex-1">
            <Link href={`/teacher/classes/${cls.id}`}>View details</Link>
          </Button>

          {/* Dropdown Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More options">
                <MoreHorizontal className="h-4 w-4" aria-hidden="true" />
                <span className="sr-only">More options</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => handleCopyCode(cls.joinCode)}
                disabled={!cls.joinCode}
                className="flex items-center gap-2"
              >
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy join code
              </DropdownMenuItem>
              <DropdownMenuItem asChild className="flex items-center gap-2">
                <Link href={`/teacher/classes/${cls.id}`} onClick={() => {}}>
                  View details
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => setDeleteDialogOpen(true)}
                className="text-destructive focus:text-destructive flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
                Delete class
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Delete Confirmation Dialog */}
          <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Delete class</DialogTitle>
                <DialogDescription>
                  Are you sure you want to delete <strong>{cls.name}</strong>? Students will be
                  removed from this class. This cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                      Deleting...
                    </>
                  ) : (
                    "Delete class"
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </CardContent>
    </Card>
  );
}