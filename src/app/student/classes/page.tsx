"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trophy, Plus, LogOut, Loader2, CheckCircle } from "lucide-react";
import { StudentClassesSkeleton } from "@/components/ui/page-skeletons";

export default function StudentClassesPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const res = await fetch("/api/student/classes", { credentials: "include" });
        if (res.ok) {
          const data = await res.json();
          setClasses(data.classes || []);
        }
      } catch (error) {
        console.error("Failed to load classes:", error);
      } finally {
        setLoading(false);
      }
    };
    loadClasses();
  }, []);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    setJoining(true);
    try {
      const res = await fetch("/api/student/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ joinCode: joinCode.trim().toUpperCase() }),
      });
      if (res.ok) {
        const data = await res.json();
        setJoinSuccess(data.message || "Joined class successfully");
        setJoinCode("");
        setShowJoinForm(false);
        // Reload classes
        const res2 = await fetch("/api/student/classes", { credentials: "include" });
        if (res2.ok) {
          const data2 = await res2.json();
          setClasses(data2.classes || []);
        }
      } else {
        const err = await res.json();
        alert(err.error || "Failed to join class");
      }
    } catch {
      alert("Failed to join class");
    } finally {
      setJoining(false);
    }
  };

  const handleLeave = async (classId: string) => {
    if (!confirm("Are you sure you want to leave this class?")) {
      return;
    }
    setLeavingId(classId);
    try {
      const res = await fetch(`/api/student/classes?id=${classId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setClasses(classes.filter((c) => c.id !== classId));
      } else {
        const err = await res.json();
        alert(err.error || "Failed to leave class");
      }
    } catch {
      alert("Failed to leave class");
    } finally {
      setLeavingId(null);
    }
  };

  if (loading) {
    return <StudentClassesSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">My Classes</h1>
          <p className="text-muted-foreground">View and manage your enrolled classes</p>
        </div>
        <Button onClick={() => setShowJoinForm(true)} className="flex-1 lg:flex-none">
          <Plus className="mr-2 h-5 w-5" />
          Join Class
        </Button>
      </div>

      {showJoinForm && (
        <Card>
          <CardHeader>
            <CardTitle>Join a Class</CardTitle>
            <p className="text-sm text-muted-foreground">Enter the join code provided by your teacher</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleJoin} className="space-y-4">
              <div className="space-y-2">
                <Label>Join Code</Label>
                <Input
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123XY"
                  maxLength={8}
                  required
                  disabled={joining}
                />
              </div>
              <div className="flex gap-3 pt-4">
                <Button type="button" variant="outline" onClick={() => setShowJoinForm(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={joining || !joinCode.trim()}>
                  {joining ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : "Join Class"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {joinSuccess && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-800">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <span>{joinSuccess}</span>
          <Button variant="ghost" size="icon" onClick={() => setJoinSuccess(null)} className="ml-auto">
            <span className="sr-only">Dismiss</span>
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </Button>
        </div>
      )}

      {classes.length === 0 && !showJoinForm && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <BookOpen className="h-8 w-8 mx-auto mb-4 opacity-50" />
            <p>No classes yet.</p>
            <p className="text-sm mt-2">Click &quot;Join Class&quot; and enter a code from your teacher to get started.</p>
          </CardContent>
        </Card>
      )}

      {classes.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id} className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{cls.name}</h3>
                  <p className="text-muted-foreground mb-4">{cls.teacherName || cls.teacher}</p>
                  <Badge variant="outline" className="text-xs">{cls.subject}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{cls.progress || 0}%</div>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${cls.progress || 0}%` }} />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <Button variant="outline" size="sm" className="flex-1">
                  View Sessions
                </Button>
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => handleLeave(cls.id)}
                  disabled={leavingId === cls.id}
                  className="flex-1"
                >
                  {leavingId === cls.id ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <LogOut className="mr-2 h-4 w-4" />
                      Leave
                    </>
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}