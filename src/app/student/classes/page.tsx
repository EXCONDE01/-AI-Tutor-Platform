"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trophy } from "lucide-react";
import { StudentClassesSkeleton } from "@/components/ui/page-skeletons";

export default function StudentClassesPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setClasses([
        { id: "1", name: "Algebra I - Period 3", teacher: "Ms. Johnson", progress: 78, subject: "Mathematics" },
        { id: "2", name: "English Literature", teacher: "Mr. Smith", progress: 45, subject: "English" },
        { id: "3", name: "World History", teacher: "Dr. Williams", progress: 62, subject: "History" },
      ]);
      setLoading(false);
    }, 800);
    return () => clearTimeout(timer);
  }, []);

  if (loading) {
    return <StudentClassesSkeleton />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Classes</h1>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {classes.map((cls) => (
            <Card key={cls.id} className="p-6">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div>
                  <h3 className="text-xl font-semibold mb-2">{cls.name}</h3>
                  <p className="text-muted-foreground mb-4">{cls.teacher}</p>
                  <Badge variant="outline" className="text-xs">{cls.subject}</Badge>
                </div>
                <div className="text-right">
                  <div className="text-2xl font-bold text-primary">{cls.progress}%</div>
                  <p className="text-xs text-muted-foreground">Complete</p>
                </div>
              </div>
              <div className="flex-1">
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-primary transition-all duration-500" style={{ width: `${cls.progress}%` }} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}