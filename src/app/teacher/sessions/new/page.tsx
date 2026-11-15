"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, MessageSquare, Users, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { TutorChat } from "@/components/student/TutorChat";

const mockStudents = [
  { id: "1", name: "Sarah Johnson", class: "Algebra I - Period 3" },
  { id: "2", name: "Marcus Chen", class: "Algebra I - Period 3" },
  { id: "3", name: "Emily Rodriguez", class: "English Literature" },
  { id: "4", name: "James Wilson", class: "World History" },
];

const mockClasses = [
  { id: "1", name: "Algebra I - Period 3" },
  { id: "2", name: "English Literature" },
  { id: "3", name: "World History" },
];

export default function NewSessionPage() {
  const router = useRouter();
  const [step, setStep] = useState<"select" | "chat">("select");
  const [selectedStudent, setSelectedStudent] = useState<string>("");
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudent || !selectedClass) return;

    setIsCreating(true);
    try {
      // In a real app, this would create a session via API
      // For now, we'll simulate and go to chat step
      await new Promise((resolve) => setTimeout(resolve, 1000));
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);
      setStep("chat");
    } catch (error) {
      console.error("Failed to create session:", error);
    } finally {
      setIsCreating(false);
    }
  };

  if (step === "chat") {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/teacher/sessions">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">AI Tutoring Session</h1>
            <p className="text-muted-foreground">
              {selectedStudent} • {selectedClass}
            </p>
          </div>
        </div>
        <TutorChat classId={selectedClass} initialSessionId={sessionId ?? undefined} />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center gap-4">
        <Link href="/teacher/sessions">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Start New Tutoring Session</h1>
          <p className="text-muted-foreground">Select a student and class to begin AI tutoring</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Select Student
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              {mockStudents.map((student) => (
                <label
                  key={student.id}
                  className="flex items-center gap-3 p-3 rounded-lg border hover:bg-accent cursor-pointer transition-colors"
                >
                  <Input
                    type="radio"
                    name="student"
                    value={student.id}
                    checked={selectedStudent === student.id}
                    onChange={() => setSelectedStudent(student.id)}
                    className="h-4 w-4"
                  />
                  <div>
                    <p className="font-medium">{student.name}</p>
                    <p className="text-sm text-muted-foreground">{student.class}</p>
                  </div>
                </label>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Select Class
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a class..." />
              </SelectTrigger>
              <SelectContent>
                {mockClasses.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <div className="flex gap-4 pt-4">
          <Link href="/teacher/sessions">
            <Button type="button" variant="outline" className="flex-1">
              Cancel
            </Button>
          </Link>
          <Button type="submit" disabled={!selectedStudent || !selectedClass || isCreating} className="flex-1">
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating Session...
              </>
            ) : (
              <>
                <MessageSquare className="mr-2 h-4 w-4" />
                Start Tutoring
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}