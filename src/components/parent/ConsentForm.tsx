"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CheckCircle2, Shield, AlertCircle, Clock, UserCheck, Loader2, FileText } from "lucide-react";
import { toast } from "sonner";

interface ConsentFormProps {
  studentId: string;
  studentName: string;
  consentType: string;
  version: string;
  status: "granted" | "denied" | "withdrawn" | "expired" | "pending";
  onConsentChange?: () => void;
}

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

function getCategoryIcon(category: string) {
  switch (category) {
    case "parental": return UserCheck;
    case "essential": return Shield;
    default: return AlertCircle;
  }
}

function getCategoryColor(category: string) {
  switch (category) {
    case "parental": return "bg-amber-50 border-amber-200 text-amber-900";
    case "essential": return "bg-blue-50 border-blue-200 text-blue-900";
    default: return "bg-gray-50 border-gray-200 text-gray-900";
  }
}

const ICON_BY_CATEGORY: Record<string, React.ElementType> = {
  parental: UserCheck,
  essential: Shield,
  optional: AlertCircle,
};

const COLOR_BY_CATEGORY: Record<string, string> = {
  parental: "bg-amber-50 border-amber-200 text-amber-900",
  essential: "bg-blue-50 border-blue-200 text-blue-900",
  optional: "bg-gray-50 border-gray-200 text-gray-900",
};

export function ConsentForm({
  studentId,
  studentName,
  consentType,
  version,
  status,
  onConsentChange,
}: ConsentFormProps) {
  const [isGranting, setIsGranting] = React.useState(false);
  const [isWithdrawing, setIsWithdrawing] = React.useState(false);
  const [isDialogOpen, setIsDialogOpen] = React.useState(false);

  const category = getCategory(consentType);
  const CategoryIcon = ICON_BY_CATEGORY[category] ?? AlertCircle;
  const categoryColor = COLOR_BY_CATEGORY[category] ?? COLOR_BY_CATEGORY.optional;

  const handleGrant = async () => {
    setIsDialogOpen(true);
  };

  const handleConfirmGrant = async () => {
    setIsGranting(true);
    try {
      const res = await fetch("/api/parent/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: studentId,
          consentType,
          granted: true,
        }),
      });
      if (res.ok) {
        toast.success(`Consent granted for ${studentName}`);
        setIsDialogOpen(false);
        onConsentChange?.();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to grant consent");
      }
    } catch {
      toast.error("Failed to grant consent");
    } finally {
      setIsGranting(false);
    }
  };

  const handleWithdraw = async () => {
    setIsWithdrawing(true);
    try {
      const res = await fetch("/api/parent/consent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          childId: studentId,
          consentType,
          granted: false,
        }),
      });
      if (res.ok) {
        toast.success(`Consent withdrawn for ${studentName}`);
        onConsentChange?.();
      } else {
        const error = await res.json();
        toast.error(error.error || "Failed to withdraw consent");
      }
    } catch {
      toast.error("Failed to withdraw consent");
    } finally {
      setIsWithdrawing(false);
    }
  };

  const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

  const grantDisabled = status === "granted";

  return (
    <div className="flex flex-col gap-3">
      {/* Row header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${categoryColor}`}
          >
            <CategoryIcon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start gap-1">
              <h3 className="font-semibold leading-tight truncate">
                {consentType.replace(/_/g, " ").replace(/\b\w/g, l => l.toUpperCase())}
              </h3>
              <span className="text-xs font-medium tracking-wider text-muted-foreground">
                v{version}
              </span>
            </div>
            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">
              {category === "parental"
                ? "Required by COPPA for children under 13. You control whether your child can use AI features."
                : category === "essential"
                ? "Required for the service to function."
                : "Optional consent to enhance your child's experience."}
            </p>
          </div>
        </div>

        <Badge variant={status === "granted" ? "success" : status === "pending" ? "secondary" : status === "denied" ? "destructive" : status === "withdrawn" ? "warning" : "outline"}>
          {statusLabel}
        </Badge>
      </div>

      {/* Action area */}
      <div className="flex items-end justify-between gap-3 pt-1">
        {status === "pending" && (
          <Button
            className="w-full sm:w-auto"
            onClick={handleGrant}
            disabled={grantDisabled || isGranting}
          >
            {isGranting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Grant Consent
          </Button>
        )}
        {status === "granted" && (
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={handleWithdraw}
            disabled={isWithdrawing}
          >
            {isWithdrawing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : null}
            Withdraw
          </Button>
        )}
        {status === "denied" && (
          <Button variant="outline" className="w-full sm:w-auto" disabled>
            Denied
          </Button>
        )}
        {status === "withdrawn" && (
          <Button variant="outline" className="w-full sm:w-auto" disabled>
            Withdrawn
          </Button>
        )}
        {status === "expired" && (
          <Button variant="outline" className="w-full sm:w-auto" disabled>
            Expired
          </Button>
        )}
      </div>

      {/* Grant confirmation dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grant Parental Consent</DialogTitle>
            <DialogDescription>
              You are granting consent for <strong>{studentName}</strong> to use{" "}
              {consentType.replace(/_/g, " ")} (v{version}).
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 p-3 rounded-lg bg-muted/50 text-sm">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                This consent is required under COPPA for children under 13.
              </span>
            </div>
            <div className="flex items-start gap-2">
              <FileText className="h-4 w-4 mt-0.5 shrink-0" />
              <span className="text-muted-foreground">
                Policy version: {version}
              </span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleConfirmGrant} disabled={isGranting}>
              {isGranting ? "Granting..." : "I Grant Consent"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
