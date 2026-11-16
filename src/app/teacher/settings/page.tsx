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
  Download,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/auth/client";
import { TeacherSettingsSkeleton } from "@/components/ui/page-skeletons";

interface GoogleStatus {
  connected: boolean;
}

const GITHUB_REPO = "EXCONDE01/-AI-Tutor-Platform";
const APK_RELEASE_URL = `https://github.com/${GITHUB_REPO}/releases/tag/apk-latest`;
const APK_DIRECT_URL = `https://github.com/${GITHUB_REPO}/releases/download/apk-latest/app-debug.apk`;

export default function TeacherSettingsPage() {
  const router = useRouter();
  const [googleConnected, setGoogleConnected] = useState<boolean | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState<string | null>(null);
  const [downloadSuccess, setDownloadSuccess] = useState<string | null>(null);

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

  const handleDownloadAPK = async () => {
    setDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(null);
    
    try {
      window.open(APK_RELEASE_URL, "_blank");
      setDownloadSuccess("Opening download page... Check your browser downloads.");
    } catch {
      setDownloadError("Failed to open download page. Try manually: github.com/" + GITHUB_REPO + "/releases/tag/apk-latest");
    } finally {
      setDownloading(false);
    }
  };

  const handleDirectDownload = async () => {
    setDownloading(true);
    setDownloadError(null);
    setDownloadSuccess(null);
    
    try {
      window.open(APK_DIRECT_URL, "_blank");
      setDownloadSuccess("Starting download... Check your browser downloads.");
    } catch {
      setDownloadError("Direct download failed. Try the GitHub releases page instead.");
    } finally {
      setDownloading(false);
    }
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
      {(error || success || downloadError || downloadSuccess) && (
        <div className={cn(
          "p-4 rounded-lg text-sm",
          (error || downloadError) ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-green-50 text-green-800 border border-green-200"
        )}>
          {error || success || downloadError || downloadSuccess}
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

      {/* Mobile App Download */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Mobile App
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="font-medium text-blue-900">AI Tutor Platform Android App</p>
              <p className="text-sm text-blue-700 mt-1">
                Install the native Android app for better performance, offline support, and push notifications.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <Button 
                onClick={handleDirectDownload} 
                disabled={downloading}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Download APK Directly"}
              </Button>
              <Button 
                variant="outline" 
                onClick={handleDownloadAPK} 
                disabled={downloading}
                className="flex-1 gap-2"
              >
                <Download className="h-4 w-4" />
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Open GitHub Releases"}
              </Button>
            </div>

            <Separator />

            <div className="text-sm text-muted-foreground space-y-2">
              <p><strong>Installation Instructions:</strong></p>
              <ol className="list-decimal list-inside space-y-1">
                <li>Tap "Download APK Directly" above</li>
                <li>When prompted, allow downloads from your browser</li>
                <li>Open the downloaded <code>app-debug.apk</code> file</li>
                <li>If blocked, enable <strong>Settings → Security → Install unknown apps</strong> for your browser</li>
                <li>Follow the install prompts</li>
              </ol>
              <p className="pt-2">
                <strong>Note:</strong> This is a debug build for testing. The app loads content from the live server (requires internet).
                For production release, a signed AAB will be published to the Play Store.
              </p>
            </div>
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