"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trophy } from "lucide-react";
import { ParentChildrenSkeleton } from "@/components/ui/page-skeletons";

export default function ParentChildrenPage() {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setChildren([
        { id: "1", name: "Emily Rodriguez", grade: "10th Grade", subjects: [{ name: "Algebra I", progress: 78 }, { name: "English", progress: 45 }, { name: "History", progress: 62 }] },
        { id: "2", name: "Marcus Chen", grade: "11th Grade", subjects: [{ name: "World History", progress: 62 }, { name: "Chemistry", progress: 35 }] },
        { id: "3", name: "Sarah Johnson", grade: "9th Grade", subjects: [{ name: "Algebra I", progress: 78 }, { name: "Biology", progress: 55 }] },
      ]);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <ParentChildrenSkeleton />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Children</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.id} className="p-6 h-full">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-2xl font-bold text-primary">{child.name.charAt(0)}</span>
                </div>
                <div>
                  <h3 className="text-xl font-semibold">{child.name}</h3>
                  <p className="text-muted-foreground">{child.grade}</p>
                </div>
              </div>
              <div className="space-y-2">
                {child.subjects.map((subject: any) => (
                  <p key={subject.name} className="text-sm"><strong>{subject.name}:</strong> {subject.progress}% complete</p>
                ))}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}