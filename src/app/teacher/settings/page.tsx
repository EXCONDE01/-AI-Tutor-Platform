"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { 
  CheckCircle, 
  Loader2, 
  Settings, 
  Globe, 
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";
import { TeacherSettingsSkeleton } from "@/components/ui/page-skeletons";

interface GoogleStatus {
  connected: boolean;
}

export default function TeacherSettingsPage() {
  const router = useRouter();
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const checkGoogleStatus = async () => {
    try {
      const res = await fetch("/api/auth/google/status", { credentials: "include" });
      const data: GoogleStatus = await res.json();
      setGoogleConnected(data.connected);
    } catch {
      setGoogleConnected(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    checkGoogleStatus();
    
    // Check for URL params from OAuth callback
    const params = new URLSearchParams(window.location.search);
    if (params.get("google_connected") === "true") {
      setSuccess("Google account connected successfully!");
      setGoogleConnected(true);
      window.history.replaceState({}, "", "/teacher/settings");
    }
    if (params.get("google_error")) {
      setError(`Connection failed: ${params.get("google_error")}`);
      window.history.replaceState({}, "", "/teacher/settings");
    }
  }, []);

  const handleConnectGoogle = () => {
    setConnecting(true);
    router.push("/api/auth/google");
  };

  const handleDisconnectGoogle = async () => {
    setDisconnecting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/google/disconnect", {
        method: "POST",
        credentials: "include",
      });
      if (res.ok) {
        setGoogleConnected(false);
        setSuccess("Google account disconnected");
      } else {
        const err = await res.json();
        setError(err.error || "Failed to disconnect");
      }
    } catch {
      setError("Failed to disconnect");
    } finally {
      setDisconnecting(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    router.push("/sign-in");
  };

  // Show skeleton while checking connection status
  if (googleConnected === null) {
    return <TeacherSettingsSkeleton />;
  }

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="h-8 w-8 text-primary" />
        <h1 className="text-3xl font-bold">Settings</h1>
      </div>

      {/* Messages */}
      {(error || success) && (
        <div className={cn(
          "p-4 rounded-lg text-sm",
          error ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-green-50 text-green-800 border border-green-200"
        )}>
          {error || success}
        </div>
      )}

      {/* Google Workspace Integration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Google Workspace Integration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium">Google Docs, Forms & Slides Export</p>
              <p className="text-sm text-muted-foreground">
                Connect your Google account to export tutor-generated content directly to Google Workspace.
              </p>
            </div>
            {googleConnected ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-5 w-5" />
                  <span className="font-medium">Connected</span>
                </div>
                <Button 
                  variant="outline" 
                  onClick={handleDisconnectGoogle} 
                  disabled={disconnecting}
                  className="text-destructive border-destructive hover:bg-destructive/10"
                >
                  {disconnecting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Disconnect"}
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnectGoogle} disabled={connecting}>
                {connecting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Connect Google"}
              </Button>
            )}
          </div>

          <Separator />

          <div className="text-sm text-muted-foreground space-y-2">
            <p><strong>Scopes requested:</strong></p>
            <ul className="list-disc list-inside space-y-1">
              <li>Google Drive (file access)</li>
              <li>Google Docs (create/edit documents)</li>
              <li>Google Forms (create/edit forms)</li>
              <li>Google Slides (create/edit presentations)</li>
              <li>Google Classroom (coursework - optional)</li>
            </ul>
            <p className="pt-2">
              Tokens are encrypted at rest using AES-256-GCM and automatically refreshed.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Account Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" onClick={handleSignOut} className="w-full justify-start text-destructive border-destructive hover:bg-destructive/10">
            Sign Out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}