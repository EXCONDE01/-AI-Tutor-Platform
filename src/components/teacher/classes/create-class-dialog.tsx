"use client";

import * as React from "react";
import { Loader2, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";

interface CreateClassDialogProps {
  onSuccess?: () => void;
  /** Controlled open state. Omit to let the dialog manage itself. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** Hide the built-in trigger (useful when another button opens the dialog). */
  hideTrigger?: boolean;
}

export function CreateClassDialog({
  onSuccess,
  open: controlledOpen,
  onOpenChange,
  hideTrigger = false,
}: CreateClassDialogProps) {
  const [uncontrolledOpen, setUncontrolledOpen] = React.useState(false);
  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : uncontrolledOpen;

  const setOpen = React.useCallback(
    (next: boolean) => {
      if (!isControlled) setUncontrolledOpen(next);
      onOpenChange?.(next);
    },
    [isControlled, onOpenChange]
  );

  const [creating, setCreating] = React.useState(false);
  const [name, setName] = React.useState("");
  const [subject, setSubject] = React.useState("");
  const [gradeLevel, setGradeLevel] = React.useState("");
  const [errors, setErrors] = React.useState<{
    name?: string;
    subject?: string;
    gradeLevel?: string;
  }>({});

  const resetForm = React.useCallback(() => {
    setName("");
    setSubject("");
    setGradeLevel("");
    setErrors({});
  }, []);

  const validate = () => {
    const newErrors: typeof errors = {};
    if (!name.trim()) {
      newErrors.name = "Class name is required";
    } else if (name.length > 120) {
      newErrors.name = "Class name must be 120 characters or fewer";
    }
    if (!subject.trim()) {
      newErrors.subject = "Subject is required";
    }
    if (!gradeLevel) {
      newErrors.gradeLevel = "Grade level is required";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creating) return;
    if (!validate()) return;

    setCreating(true);
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          name: name.trim(),
          subject: subject.trim(),
          gradeLevel: parseInt(gradeLevel, 10),
        }),
      });

      if (res.ok) {
        const { class: newClass } = await res.json();
        toast({
          title: "Class created",
          description: newClass?.joinCode
            ? `Join code: ${newClass.joinCode}. Share it with students to enroll.`
            : "Share the join code with students to enroll.",
        });
        resetForm();
        setOpen(false);
        onSuccess?.();
      } else {
        const err = await res.json().catch(() => ({}));
        toast({
          variant: "destructive",
          title: "Failed to create class",
          description: err.error || "An error occurred while creating the class.",
        });
      }
    } catch {
      toast({
        variant: "destructive",
        title: "Failed to create class",
        description: "An unexpected error occurred. Please try again.",
      });
    } finally {
      setCreating(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (!newOpen) resetForm();
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!hideTrigger && (
        <DialogTrigger asChild>
          <Button className="w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" aria-hidden="true" />
            Create class
          </Button>
        </DialogTrigger>
      )}

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Create new class</DialogTitle>
          <DialogDescription>
            Enter the details for your new class. Students will use the join code to enroll.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="class-name">Class name</Label>
            <Input
              id="class-name"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
              }}
              placeholder="e.g. Algebra I — Period 3"
              maxLength={120}
              aria-invalid={!!errors.name}
              aria-describedby={errors.name ? "name-error" : undefined}
              disabled={creating}
            />
            {errors.name && (
              <p id="name-error" className="text-sm text-destructive" role="alert">
                {errors.name}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-subject">Subject</Label>
            <Input
              id="class-subject"
              value={subject}
              onChange={(e) => {
                setSubject(e.target.value);
                if (errors.subject) setErrors((prev) => ({ ...prev, subject: undefined }));
              }}
              placeholder="e.g. Mathematics"
              aria-invalid={!!errors.subject}
              aria-describedby={errors.subject ? "subject-error" : undefined}
              disabled={creating}
            />
            {errors.subject && (
              <p id="subject-error" className="text-sm text-destructive" role="alert">
                {errors.subject}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="class-grade-level">Grade level</Label>
            <Select
              value={gradeLevel}
              onValueChange={(value) => {
                setGradeLevel(value);
                if (errors.gradeLevel)
                  setErrors((prev) => ({ ...prev, gradeLevel: undefined }));
              }}
              disabled={creating}
            >
              <SelectTrigger
                id="class-grade-level"
                aria-invalid={!!errors.gradeLevel}
                aria-describedby={errors.gradeLevel ? "grade-error" : undefined}
              >
                <SelectValue placeholder="Select grade level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="9">9th Grade</SelectItem>
                <SelectItem value="10">10th Grade</SelectItem>
                <SelectItem value="11">11th Grade</SelectItem>
                <SelectItem value="12">12th Grade</SelectItem>
              </SelectContent>
            </Select>
            {errors.gradeLevel && (
              <p id="grade-error" className="text-sm text-destructive" role="alert">
                {errors.gradeLevel}
              </p>
            )}
          </div>

          <DialogFooter className="gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={creating}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={creating}>
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" aria-hidden="true" />
                  Creating...
                </>
              ) : (
                "Create class"
              )}
            </Button>
          </DialogFooter>
        </form>

        <DialogClose asChild>
          <Button
            variant="ghost"
            size="icon"
            className="absolute right-4 top-4 h-8 w-8"
            aria-label="Close dialog"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </Button>
        </DialogClose>
      </DialogContent>
    </Dialog>
  );
}
