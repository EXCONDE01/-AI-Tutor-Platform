"use client";

import * as React from "react";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Plus, BookOpen, AlertCircle, Search, Settings, Globe, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "@/hooks/use-toast";
import { StudentClassesSkeleton } from "@/components/ui/page-skeletons";
import { ClassCard } from "@/components/student/classes/ClassCard";
import { JoinClassDialog } from "@/components/student/classes/JoinClassDialog";
import { ProviderPanel, ImportPreview } from "@/components/student/classes/ImportProviders";
import { matchesStudentClassQuery, type StudentEnrolledClass } from "@/lib/classes/format";

interface FileItem {
  id: string;
  name: string;
  mimeType?: string;
  file?: { mimeType?: string };
}

export default function StudentClassesPage() {
  // Classes state
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<StudentEnrolledClass[]>([]);
  const [classesError, setClassesError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  // Join class dialog
  const [joinDialogOpen, setJoinDialogOpen] = useState(false);

  // Import state - per provider
  const [driveLoading, setDriveLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<FileItem[]>([]);
  const [driveSearch, setDriveSearch] = useState("");
  const [driveError, setDriveError] = useState<string | null>(null);
  const [driveNotConnected, setDriveNotConnected] = useState(false);

  const [onedriveLoading, setOnedriveLoading] = useState(false);
  const [onedriveFiles, setOnedriveFiles] = useState<FileItem[]>([]);
  const [onedriveSearch, setOnedriveSearch] = useState("");
  const [onedriveError, setOnedriveError] = useState<string | null>(null);
  const [onedriveNotConnected, setOnedriveNotConnected] = useState(false);

  // Import preview
  const [importedContent, setImportedContent] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);

  // Importing file tracking (per provider)
  const [importingDriveFileId, setImportingDriveFileId] = useState<string | null>(null);
  const [importingOnedriveFileId, setImportingOnedriveFileId] = useState<string | null>(null);

  // Active tab
  const [activeTab, setActiveTab] = useState<"classes" | "import">("classes");

  const handleTabChange = (value: "classes" | "import") => {
    setActiveTab(value);
  };

  // Load classes
  const loadClasses = useCallback(async () => {
    try {
      const res = await fetch("/api/student/classes", { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setClasses(data.classes || []);
        setClassesError(null);
      } else {
        const err = await res.json().catch(() => ({ error: "Failed to load classes" }));
        setClassesError(err.error || "Couldn't load your classes");
        setClasses([]);
      }
    } catch (error) {
      console.error("Failed to load classes:", error);
      setClassesError("Couldn't load your classes");
      setClasses([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial async fetch; state updates occur after await
    void loadClasses();
  }, [loadClasses]);

  // Handle join class
  const handleJoinClass = async (joinCode: string) => {
    try {
      const res = await fetch("/api/student/classes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ joinCode }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        await loadClasses();
        toast({
          title: "Joined class",
          description: data.className
            ? `You're now enrolled in ${data.className}.`
            : data.message || "Class joined successfully.",
          variant: "success",
        });
        return { success: true, className: data.className as string | undefined };
      }

      return { success: false, error: data.error || "Failed to join class" };
    } catch {
      return { success: false, error: "Failed to join class" };
    }
  };

  // Handle leave class
  const handleLeaveClass = async (classId: string) => {
    try {
      const res = await fetch(`/api/student/classes?id=${classId}`, {
        method: "DELETE",
        credentials: "include",
      });
      if (res.ok) {
        setClasses((prev) => prev.filter((c) => c.id !== classId));
        toast({ title: "Left class", description: "You have left the class. You can rejoin with the join code.", variant: "success" });
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to leave class");
      }
    } catch (error) {
      toast({ title: "Failed to leave class", description: error instanceof Error ? error.message : "Please try again", variant: "destructive" });
      throw error;
    }
  };

  // Load Drive files
  const loadDriveFiles = async (searchQuery?: string) => {
    setDriveLoading(true);
    setDriveError(null);
    setDriveNotConnected(false);
    try {
      const url = searchQuery
        ? `/api/student/import-drive?action=search&q=${encodeURIComponent(searchQuery)}`
        : `/api/student/import-drive?action=list`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
        setDriveNotConnected(false);
      } else if (res.status === 400) {
        const err = await res.json().catch(() => ({}));
        if (err.error?.includes("not connected") || err.error?.includes("Google account")) {
          setDriveNotConnected(true);
          setDriveFiles([]);
        } else {
          setDriveError(err.error || "Failed to load Google Drive files");
        }
      } else {
        setDriveError("Failed to load Google Drive files");
      }
    } catch {
      setDriveError("Failed to load Google Drive files");
    } finally {
      setDriveLoading(false);
    }
  };

  // Load OneDrive files
  const loadOnedriveFiles = async (searchQuery?: string) => {
    setOnedriveLoading(true);
    setOnedriveError(null);
    setOnedriveNotConnected(false);
    try {
      const url = searchQuery
        ? `/api/student/import-onedrive?action=search&q=${encodeURIComponent(searchQuery)}`
        : `/api/student/import-onedrive?action=list`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOnedriveFiles(data.files || []);
        setOnedriveNotConnected(false);
      } else if (res.status === 400) {
        const err = await res.json().catch(() => ({}));
        if (err.error?.includes("not connected") || err.error?.includes("Microsoft account")) {
          setOnedriveNotConnected(true);
          setOnedriveFiles([]);
        } else {
          setOnedriveError(err.error || "Failed to load OneDrive files");
        }
      } else {
        setOnedriveError("Failed to load OneDrive files");
      }
    } catch {
      setOnedriveError("Failed to load OneDrive files");
    } finally {
      setOnedriveLoading(false);
    }
  };

  // Handle file import
  const handleImportFile = async (fileId: string, source: "drive" | "onedrive") => {
    if (source === "drive") {
      setImportingDriveFileId(fileId);
    } else {
      setImportingOnedriveFileId(fileId);
    }

    try {
      const url = source === "drive"
        ? `/api/student/import-drive?action=download&fileId=${fileId}`
        : `/api/student/import-onedrive?action=download&fileId=${fileId}`;

      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          setImportedContent(data.content);
          toast({ title: "Imported", description: "Content ready to copy.", variant: "success" });
        } else if (data.downloadUrl) {
          // PDF or binary - open in new tab
          window.open(data.downloadUrl, "_blank", "noopener,noreferrer");
          toast({
            title: "Opened in new tab",
            description: "PDF files open in a new tab. Download it from there to use the content.",
            variant: "default"
          });
        }
      } else {
        const err = await res.json();
        throw new Error(err.error || "Failed to import file");
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: error instanceof Error ? error.message : "Please try again",
        variant: "destructive"
      });
    } finally {
      if (source === "drive") {
        setImportingDriveFileId(null);
      } else {
        setImportingOnedriveFileId(null);
      }
    }
  };

  // Handle copy to clipboard
  const handleCopy = async () => {
    if (!importedContent) return;
    setCopying(true);
    try {
      await navigator.clipboard.writeText(importedContent);
      toast({ title: "Copied", description: "Content copied to clipboard.", variant: "success" });
    } catch {
      toast({ title: "Copy failed", description: "Could not copy to clipboard.", variant: "destructive" });
    } finally {
      setCopying(false);
    }
  };

  // Filter classes client-side
  const filteredClasses = classes.filter((cls) => matchesStudentClassQuery(cls, searchQuery));

  // Loading state
  if (loading) {
    return <StudentClassesSkeleton />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">My Classes</h1>
          <p className="text-muted-foreground">Classes you&apos;re enrolled in and materials for tutoring</p>
        </div>
        <Button onClick={() => setJoinDialogOpen(true)}>
          <Plus className="mr-2 h-5 w-5" />
          Join class
        </Button>
      </div>

      {/* Classes error state */}
      {classesError && activeTab === "classes" && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="flex items-center gap-3 p-4">
            <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Couldn&apos;t load your classes</p>
              <p className="text-sm text-muted-foreground">{classesError}</p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setClassesError(null);
                setLoading(true);
                void loadClasses();
              }}
              className="ml-auto"
            >
              Try again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2 sm:w-auto sm:inline-grid">
          <TabsTrigger value="classes">My Classes</TabsTrigger>
          <TabsTrigger value="import">Import materials</TabsTrigger>
        </TabsList>

        {/* My Classes Tab */}
        <TabsContent value="classes">
          {/* Search */}
          {filteredClasses.length > 0 && (
            <div className="mb-4">
              <Input
                placeholder="Search classes by name, subject, or teacher..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="max-w-md"
              />
            </div>
          )}

          {/* Empty state */}
          {filteredClasses.length === 0 && !classesError && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-4 opacity-50" />
                <p className="font-medium">You&apos;re not in any classes yet</p>
                <p className="text-sm mt-1">
                  {searchQuery ? "No classes match your search." : "Join a class to start learning with AI tutoring."}
                </p>
                <Button className="mt-4" onClick={() => setJoinDialogOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Join a class
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Classes grid */}
          {filteredClasses.length > 0 && (
            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {filteredClasses.map((cls) => (
                <ClassCard key={cls.id} class={cls} onLeave={handleLeaveClass} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Import Materials Tab */}
        <TabsContent value="import">
          <div className="space-y-6">
            {/* Intro card */}
            <Card className="border-blue-200 bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <Upload className="h-6 w-6 text-blue-600 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-blue-900">Import Reading Passages</p>
                    <p className="text-sm text-blue-700">
                      Connect your cloud storage in Settings, then import documents from Google Drive or OneDrive
                      to use as reading material for tutoring sessions.
                    </p>
                  </div>
                  <Link href="/student/settings" className="ml-auto text-sm font-medium text-blue-700 hover:underline flex items-center gap-1">
                    <Settings className="h-4 w-4" />
                    Manage connections
                  </Link>
                </div>
              </CardContent>
            </Card>

            {/* Provider panels */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Google Drive */}
              <ProviderPanel
                provider="drive"
                title="Google Drive"
                iconColor="text-green-500"
                icon={<Globe className="h-5 w-5" />}
                onLoadFiles={loadDriveFiles}
                onSearch={(e) => { e.preventDefault(); loadDriveFiles(driveSearch); }}
                searchQuery={driveSearch}
                setSearchQuery={setDriveSearch}
                files={driveFiles}
                loading={driveLoading}
                error={driveError}
                notConnected={driveNotConnected}
                onImportFile={(id) => handleImportFile(id, "drive")}
                importingFileId={importingDriveFileId}
              />

              {/* OneDrive */}
              <ProviderPanel
                provider="onedrive"
                title="OneDrive"
                iconColor="text-blue-500"
                icon={<Globe className="h-5 w-5" />}
                onLoadFiles={loadOnedriveFiles}
                onSearch={(e) => { e.preventDefault(); loadOnedriveFiles(onedriveSearch); }}
                searchQuery={onedriveSearch}
                setSearchQuery={setOnedriveSearch}
                files={onedriveFiles}
                loading={onedriveLoading}
                error={onedriveError}
                notConnected={onedriveNotConnected}
                onImportFile={(id) => handleImportFile(id, "onedrive")}
                importingFileId={importingOnedriveFileId}
              />
            </div>

            {/* Imported content preview */}
            {importedContent && (
              <ImportPreview
                content={importedContent}
                onClear={() => setImportedContent(null)}
                onCopy={handleCopy}
                copying={copying}
              />
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Join Class Dialog */}
      <JoinClassDialog
        open={joinDialogOpen}
        onOpenChange={setJoinDialogOpen}
        onJoin={handleJoinClass}
      />
    </div>
  );
}