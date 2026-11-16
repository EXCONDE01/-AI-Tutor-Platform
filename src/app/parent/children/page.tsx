"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Clock, Trophy, AlertCircle, CheckCircle } from "lucide-react";
import { ParentChildrenSkeleton } from "@/components/ui/page-skeletons";
import { toast } from "sonner";

interface Child {
  id: string;
  studentId: string;
  name: string;
  email: string;
  gradeLevel: number | null;
  studentNumber: string | null;
  dateOfBirth: string | null;
  avatarUrl: string | null;
  lastActivity: string | null;
  progressSummary: {
    summary: string;
    engagementScore: number | null;
    keyTopics: string[];
    lastSessionDate: string | null;
  } | null;
  consentStatus: {
    parentalConsent: boolean;
    coppaConsent: boolean;
    ferpaConsent: boolean;
  };
  activeClasses: number;
}

export default function ParentChildrenPage() {
  const [loading, setLoading] = useState(true);
  const [children, setChildren] = useState<Child[]>([]);

  useEffect(() => {
    const fetchChildren = async () => {
      try {
        const res = await fetch("/api/parent/children");
        if (res.ok) {
          const data = await res.json();
          setChildren(data.children || []);
        } else {
          toast.error("Failed to load children");
        }
      } catch (error) {
        console.error("Failed to fetch children:", error);
        toast.error("Failed to load children");
      } finally {
        setLoading(false);
      }
    };

    fetchChildren();
  }, []);

  const getGradeLabel = (gradeLevel: number | null): string => {
    if (gradeLevel === null) return "Unknown Grade";
    if (gradeLevel === 0) return "Kindergarten";
    if (gradeLevel <= 5) return `${gradeLevel}${gradeLevel === 1 ? "st" : gradeLevel === 2 ? "nd" : gradeLevel === 3 ? "rd" : "th"} Grade`;
    if (gradeLevel <= 8) return `${gradeLevel}${gradeLevel === 1 ? "st" : gradeLevel === 2 ? "nd" : gradeLevel === 3 ? "rd" : "th"} Grade`;
    if (gradeLevel === 9) return "9th Grade (Freshman)";
    if (gradeLevel === 10) return "10th Grade (Sophomore)";
    if (gradeLevel === 11) return "11th Grade (Junior)";
    if (gradeLevel === 12) return "12th Grade (Senior)";
    return `Grade ${gradeLevel}`;
  };

  if (loading) {
    return <ParentChildrenSkeleton />;
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-6">My Children</h1>
        {children.length === 0 && (
          <div className="text-center py-12">
            <div className="h-16 w-16 rounded-full bg-muted/50 flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-2">No children linked yet</h3>
            <p className="text-muted-foreground">
              Ask your child&apos;s teacher to send a parent invitation link, or contact your school administrator.
            </p>
          </div>
        )}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {children.map((child) => (
            <Card key={child.id} className="p-6 h-full transition-shadow hover:shadow-lg">
              <div className="flex items-center gap-4 mb-4">
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  {child.avatarUrl ? (
                    <img 
                      src={child.avatarUrl} 
                      alt={child.name} 
                      className="h-16 w-16 rounded-full object-cover" 
                    />
                  ) : (
                    <span className="text-2xl font-bold text-primary">{child.name.charAt(0)}</span>
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-xl font-semibold truncate">{child.name}</h3>
                  <p className="text-muted-foreground text-sm">{getGradeLabel(child.gradeLevel)}</p>
                  {child.studentNumber && (
                    <p className="text-xs text-muted-foreground">ID: {child.studentNumber}</p>
                  )}
                </div>
              </div>

              {/* Consent status indicators */}
              <div className="flex items-center gap-2 mb-4 flex-wrap">
                <Badge 
                  variant={child.consentStatus.parentalConsent ? "success" : "destructive"} 
                  className="text-xs gap-1"
                >
                  {child.consentStatus.parentalConsent ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      COPPA Consent
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      COPPA Required
                    </>
                  )}
                </Badge>
                <Badge 
                  variant={child.consentStatus.ferpaConsent ? "success" : "warning"} 
                  className="text-xs gap-1"
                >
                  {child.consentStatus.ferpaConsent ? (
                    <>
                      <CheckCircle className="h-3 w-3" />
                      FERPA
                    </>
                  ) : (
                    <>
                      <AlertCircle className="h-3 w-3" />
                      FERPA Pending
                    </>
                  )}
                </Badge>
              </div>

              {/* Activity summary */}
              <div className="space-y-2 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <BookOpen className="h-4 w-4 shrink-0" />
                  <span>{child.activeClasses} active class{child.activeClasses !== 1 ? "es" : ""}</span>
                </div>
                
                {child.lastActivity && (
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-4 w-4 shrink-0" />
                    <span>Last activity: {new Date(child.lastActivity).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}</span>
                  </div>
                )}

                {child.progressSummary?.engagementScore !== null && child.progressSummary?.engagementScore !== undefined && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-amber-500 shrink-0" />
                    <span className="font-medium">Avg. Engagement: {child.progressSummary.engagementScore}%</span>
                  </div>
                )}

                {child.progressSummary?.keyTopics && child.progressSummary.keyTopics.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {child.progressSummary.keyTopics.slice(0, 4).map((topic, i) => (
                      <Badge key={i} variant="outline" className="text-xs h-5">
                        {topic}
                      </Badge>
                    ))}
                    {child.progressSummary.keyTopics.length > 4 && (
                      <Badge variant="secondary" className="text-xs h-5">
                        +{child.progressSummary.keyTopics.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}