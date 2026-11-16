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
  XCircle, 
  Loader2, 
  Settings, 
  Globe, 
  AlertCircle,
  Save,
  Link,
  Unlink,
  Mail,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut, linkOAuthAccount } from "@/lib/auth/client";
import { TeacherSettingsSkeleton } from "@/components/ui/page-skeletons";

interface GoogleStatus {
  connected: boolean;
}

export default function TeacherSettingsPage() {
  const router = useRouter();
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [linkingGoogle, setLinkingGoogle] = useState(false);
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
    if (params.get("link_error")) {
      setError(params.get("link_error") || "Failed to link Google account");
      window.history.replaceState({}, "", "/teacher/settings");
    }
    if (params.get("linked") === "google") {
      setSuccess("Google account linked successfully! You can now sign in with Google.");
      setGoogleConnected(true);
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

  const handleLinkGoogle = async () => {
    setLinkingGoogle(true);
    setError(null);
    setSuccess(null);
    try {
      console.log('[LinkGoogle] Calling linkOAuthAccount...');
      const result = await linkOAuthAccount('google');
      console.log('[LinkGoogle] Result:', result);
      if (result.error) {
        // If linking fails due to account already linked, that's actually success
        if (result.error.message?.includes('already linked') || result.error.message?.includes('ALREADY_LINKED')) {
          setSuccess("Google account already linked!");
          setGoogleConnected(true);
        } else {
          setError(result.error.message || "Failed to link Google account");
        }
      } else if (result.data?.url) {
        // Redirect user to Google OAuth for linking
        console.log('[LinkGoogle] Redirecting to:', result.data.url);
        window.location.href = result.data.url;
      } else {
        console.log('[LinkGoogle] No URL in result, data:', result.data);
        setSuccess("Google account linked successfully! You can now sign in with Google.");
        setGoogleConnected(true);
      }
    } catch (err) {
      console.error('[LinkGoogle] Error:', err);
      const message = err instanceof Error ? err.message : String(err);
      if (message.includes('already linked') || message.includes('ALREADY_LINKED')) {
        setSuccess("Google account already linked!");
        setGoogleConnected(true);
      } else {
        setError(message || "Failed to link Google account");
      }
    } finally {
      setLinkingGoogle(false);
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

      {/* Linked Accounts for Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Linked Accounts (Sign-in)
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Connect OAuth providers to sign in without a password. Your email/password will still work.
          </p>
          <div className="flex items-center justify-between p-3 border rounded-lg">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <svg className="h-5 w-5 text-primary" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                </svg>
              </div>
              <div>
                <p className="font-medium">Google</p>
                <p className="text-sm text-muted-foreground">Sign in with Google</p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleLinkGoogle}
              disabled={linkingGoogle}
            >
              {linkingGoogle ? <Loader2 className="h-4 w-4 animate-spin" /> : "Link"}
            </Button>
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