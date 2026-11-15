"use client";

import * as React from "react";
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export default function TeacherClassesPage() {
  const router = useRouter();
  const [classes, setClasses] = useState<Array<{ id: string; name: string; subject: string; studentCount: number }>>([]);
  const [creating, setCreating] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [gradeLevel, setGradeLevel] = useState("");

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !subject || !gradeLevel) return;
    setCreating(true);
    try {
      const res = await fetch("/api/teacher/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json", credentials: "include" },
        body: JSON.stringify({ name, subject, gradeLevel: parseInt(gradeLevel) }),
      });
      if (res.ok) {
        const newClass = await res.json();
        setClasses([...classes, newClass]);
        setName("");
        setSubject("");
        setGradeLevel("");
        setShowCreateForm(false);
      } else {
        const err = await res.json();
        alert(err.error || "Failed to create class");
      }
    } catch {
      alert("Failed to create class");
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Classes</h1>
          <p className="text-muted-foreground">Manage your classes and students</p>
        </div>
        <Button onClick={() => setShowCreateForm(true)} className="flex-1 lg:flex-none">
          <Plus className="mr-2 h-5 w-5" />
          Create Class
        </Button>
      </div>

      {showCreateForm && (
        <Card>
          <CardHeader>
            <CardTitle>Create New Class</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-3">
                <div className="space-y-2">
                  <Label>Class Name</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Algebra I - Period 3"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Subject</Label>
                  <Input
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    placeholder="e.g. Mathematics"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label>Grade Level</Label>
                  <Select value={gradeLevel} onValueChange={setGradeLevel} required>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select grade" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9">9th Grade</SelectItem>
                      <SelectItem value="10">10th Grade</SelectItem>
                      <SelectItem value="11">11th Grade</SelectItem>
                      <SelectItem value="12">12th Grade</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={creating}>
                  {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Create Class"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {classes.length === 0 && !showCreateForm && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Plus className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p>No classes yet. Create your first class to get started.</p>
            <p className="text-sm mt-2">Once created, students can enroll and tutoring sessions can begin.</p>
          </CardContent>
        </Card>
      )}

      {classes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id}>
              <CardContent className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold">{cls.name}</h3>
                  <span className="text-xs font-medium bg-primary/10 text-primary rounded-full px-2 py-1">
                    {cls.studentCount} students
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">{cls.subject}</p>
                <div className="mt-4 flex gap-2">
                  <Link href={`/teacher/sessions/new`}>
                    <Button variant="outline" size="sm" className="flex-1">
                      Start Session
                    </Button>
                  </Link>
                  <Link href={`/teacher/classes/${cls.id}`}>
                    <Button variant="outline" size="sm" className="flex-1">
                      View Details
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}