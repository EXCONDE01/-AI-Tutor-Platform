"use client";

import * as React from "react";
import { useState, useCallback, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, XCircle, AlertCircle, Clock, FileText, UserCheck, Shield, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { ConsentForm } from "@/components/parent/ConsentForm";

interface ConsentRecord {
  id: string;
  studentId: string;
  studentName: string;
  type: string;
  status: "granted" | "denied" | "withdrawn" | "expired" | "pending";
  version: string;
  policyUrl: string | null;
  grantedAt: string | null;
  withdrawnAt: string | null;
  expiresAt: string | null;
}

interface ConsentData {
  consentRecords: ConsentRecord[];
}

const CONSENT_CATEGORIES = [
  { key: "essential", label: "Essential", icon: Shield, description: "Required for service operation" },
  { key: "parental", label: "Parental Consent (COPPA)", icon: UserCheck, description: "Required for children under 13" },
  { key: "optional", label: "Optional", icon: AlertCircle, description: "Enhances experience but not required" },
];

const CATEGORY_MAP: Record<string, string> = {
  terms_of_service: "essential",
  privacy_policy: "essential",
  data_processing: "essential",
  ai_interaction: "essential",
  data_sharing: "optional",
  marketing: "optional",
  analytics: "optional",
  third_party_services: "optional",
  parental_consent: "parental",
  ferpa_consent: "essential",
  coppa_consent: "parental",
  gdpr_consent: "essential",
  state_privacy_law: "essential",
  custom: "optional",
};

function getCategory(type: string) {
  return CATEGORY_MAP[type] || "optional";
}

export default function ParentConsentPage() {
  const [data, setData] = useState<ConsentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("essential");

  const fetchConsent = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/parent/consent", {
        cache: "no-store",
      });
      if (res.ok) {
        const json = await res.json();
        setData(json as ConsentData);
      } else if (res.status === 401) {
        toast.error("Session expired. Please sign in again.");
      } else {
        toast.error("Failed to load consent status");
      }
    } catch (error) {
      toast.error("Failed to load consent status");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConsent();
  }, [fetchConsent]);

  // Group consent records by student
  const recordsByStudent = React.useMemo(() => {
    const map = new Map<string, { studentId: string; studentName: string; consents: ConsentRecord[] }>();
    for (const record of data?.consentRecords ?? []) {
      const existing = map.get(record.studentId);
      if (existing) {
        existing.consents.push(record);
      } else {
        map.set(record.studentId, {
          studentId: record.studentId,
          studentName: record.studentName,
          consents: [record],
        });
      }
    }
    return Array.from(map.values());
  }, [data]);

  // Check for missing required consents
  const missingRequired = React.useMemo(() => {
    const requiredTypes = ['parental_consent', 'coppa_consent', 'ferpa_consent', 'terms_of_service', 'privacy_policy', 'data_processing'];
    const grantedTypes = new Set(data?.consentRecords.filter(r => r.status === 'granted').map(r => r.type));
    return requiredTypes.filter(t => !grantedTypes.has(t));
  }, [data]);

  const needsUpdate = missingRequired.length > 0;

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline" | "success" | "warning" | "info" | "purple"> = {
      granted: "success",
      denied: "destructive",
      withdrawn: "warning",
      expired: "warning",
      pending: "secondary",
    };
    const icons = {
      granted: CheckCircle,
      denied: XCircle,
      withdrawn: AlertCircle,
      expired: Clock,
      pending: Clock,
    };
    const Icon = icons[status as keyof typeof icons] || Clock;
    return (
      <Badge variant={variants[status] || "default"} className="gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold">Consent Management</h1>
            <p className="text-muted-foreground">Review and manage consent for your children</p>
          </div>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Consent Management</h1>
          <p className="text-muted-foreground">Review and manage COPPA/FERPA consent for your children</p>
        </div>
      </div>

      {needsUpdate && (
        <Alert className="border-warning/50 bg-warning/10">
          <AlertCircle className="h-4 w-4 text-warning" />
          <AlertDescription>
            You have {missingRequired.length} required consent(s) pending. Some features may be limited until granted.
          </AlertDescription>
        </Alert>
      )}

      {recordsByStudent.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">
            No linked children found. <a href="/parent/link-student" className="underline font-medium">Link a student</a> to manage consent.
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          {CONSENT_CATEGORIES.map(cat => (
            <TabsTrigger key={cat.key} value={cat.key}>
              <cat.icon className="mr-2 h-4 w-4" />
              {cat.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {CONSENT_CATEGORIES.map(cat => (
          <TabsContent key={cat.key} value={cat.key}>
            <div className="space-y-4 pt-4">
              <p className="text-sm text-muted-foreground">{cat.description}</p>
              <div className="space-y-4">
                {recordsByStudent.map(student => {
                  const filtered = student.consents.filter(c => getCategory(c.type) === activeTab);
                  if (filtered.length === 0) return null;
                  return (
                    <Card key={student.studentId}>
                      <CardHeader>
                        <CardTitle>{student.studentName}</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {filtered.map(consent => (
                          <ConsentForm
                            key={`${consent.id}`}
                            studentId={consent.studentId}
                            studentName={student.studentName}
                            consentType={consent.type}
                            version={consent.version}
                            status={consent.status}
                            onConsentChange={() => fetchConsent()}
                          />
                        ))}
                      </CardContent>
                    </Card>
                  );
                })}
                {recordsByStudent.length === 0 && (
                  <Card>
                    <CardContent className="py-8 text-center text-muted-foreground">
                      No consent records in this category.
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Understanding Consent
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-200">
            <h4 className="font-medium text-blue-900 mb-1">Essential Consents</h4>
            <p className="text-blue-800">Required for the service to function. Without these, your child cannot use the platform.</p>
          </div>
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200">
            <h4 className="font-medium text-amber-900 mb-1">Parental Consent (COPPA)</h4>
            <p className="text-amber-800">Required by law for children under 13. You must provide verifiable parental consent.</p>
          </div>
          <div className="p-3 rounded-lg bg-green-50 border border-green-200">
            <h4 className="font-medium text-green-900 mb-1">Optional Consents</h4>
            <p className="text-green-800">Enhance the experience (analytics, personalization) but not required. You can deny without affecting core functionality.</p>
          </div>
          <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
            <h4 className="font-medium text-gray-900 mb-1">Your Rights</h4>
            <ul className="list-disc list-inside text-gray-700 space-y-1 mt-1">
              <li>You can withdraw consent at any time</li>
              <li>Withdrawal may limit certain features</li>
              <li>Contact support for data deletion requests</li>
              <li>Review our <a href="/policies/privacy" className="underline">Privacy Policy</a> for details</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
