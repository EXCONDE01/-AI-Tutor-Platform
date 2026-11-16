"use client";

import * as React from "react";
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Clock, Trophy, Plus, LogOut, Loader2, CheckCircle, FileText, Search, Upload, Globe } from "lucide-react";
import { StudentClassesSkeleton } from "@/components/ui/page-skeletons";

export default function StudentClassesPage() {
  const [loading, setLoading] = useState(true);
  const [classes, setClasses] = useState<any[]>([]);
  const [showJoinForm, setShowJoinForm] = useState(false);
  const [joinCode, setJoinCode] = useState("");
  const [joining, setJoining] = useState(false);
  const [leavingId, setLeavingId] = useState<string | null>(null);
  const [joinSuccess, setJoinSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("classes");

  // Import state
  const [importLoading, setImportLoading] = useState(false);
  const [driveFiles, setDriveFiles] = useState<any[]>([]);
  const [onedriveFiles, setOnedriveFiles] = useState<any[]>([]);
  const [driveSearch, setDriveSearch] = useState("");
  const [onedriveSearch, setOnedriveSearch] = useState("");
  const [importedContent, setImportedContent] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

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

  const loadDriveFiles = async (searchQuery?: string) => {
    try {
      const url = searchQuery 
        ? `/api/student/import-drive?action=search&q=${encodeURIComponent(searchQuery)}`
        : `/api/student/import-drive?action=list`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setDriveFiles(data.files || []);
      } else {
        setImportError("Failed to load Google Drive files");
      }
    } catch {
      setImportError("Failed to load Google Drive files");
    }
  };

  const loadOnedriveFiles = async (searchQuery?: string) => {
    try {
      const url = searchQuery
        ? `/api/student/import-onedrive?action=search&q=${encodeURIComponent(searchQuery)}`
        : `/api/student/import-onedrive?action=list`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        setOnedriveFiles(data.files || []);
      } else {
        setImportError("Failed to load OneDrive files");
      }
    } catch {
      setImportError("Failed to load OneDrive files");
    }
  };

  const handleImportFile = async (fileId: string, source: 'drive' | 'onedrive') => {
    setImportLoading(true);
    setImportError(null);
    try {
      const url = source === 'drive'
        ? `/api/student/import-drive?action=download&fileId=${fileId}`
        : `/api/student/import-onedrive?action=download&fileId=${fileId}`;
      const res = await fetch(url, { credentials: "include" });
      if (res.ok) {
        const data = await res.json();
        if (data.content) {
          setImportedContent(data.content);
          setImportError(null);
        } else if (data.downloadUrl) {
          // For PDFs and other binary files, open in new tab
          window.open(data.downloadUrl, "_blank");
          setImportError("File opened in new tab. Please copy content manually.");
        }
      } else {
        const err = await res.json();
        setImportError(err.error || "Failed to import file");
      }
    } catch {
      setImportError("Failed to import file");
    } finally {
      setImportLoading(false);
    }
  };

  const handleDriveSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadDriveFiles(driveSearch);
  };

  const handleOnedriveSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadOnedriveFiles(onedriveSearch);
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

      {/* Tabs for Classes and Import */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="classes">My Classes</TabsTrigger>
          <TabsTrigger value="import">Import from Drive</TabsTrigger>
        </TabsList>

        <TabsContent value="classes">
          {classes.length === 0 && !showJoinForm && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-8 w-8 mx-auto mb-4 opacity-50" />
                <p>No classes yet.</p>
                <p className="text-sm mt-2">Click &#34;Join Class&#34; and enter a code from your teacher to get started.</p>
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
        </TabsContent>

        <TabsContent value="import">
          <div className="space-y-6">
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center gap-3">
                <Upload className="h-6 w-6 text-blue-600" />
                <div>
                  <p className="font-medium text-blue-900">Import Reading Passages</p>
                  <p className="text-sm text-blue-700">
                    Connect your cloud storage in Settings, then import documents from Google Drive or OneDrive
                    to use as reading material for tutoring sessions.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              {/* Google Drive Tab */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-green-500" />
                    Google Drive
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleDriveSearch} className="flex gap-2">
                    <Input
                      placeholder="Search files..."
                      value={driveSearch}
                      onChange={(e) => setDriveSearch(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={importLoading}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </form>

                  <Button 
                    variant="outline" 
                    onClick={() => loadDriveFiles()}
                    disabled={importLoading}
                    className="w-full gap-2"
                  >
                    <Loader2 className="h-4 w-4" />
                    Load All Documents
                  </Button>

                  {importLoading && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}

                  {driveFiles.length > 0 && (
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {driveFiles.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-green-500" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {file.mimeType === 'application/vnd.google-apps.document' ? 'Google Doc' : 
                                 file.mimeType === 'text/plain' ? 'Text File' : 'PDF'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleImportFile(file.id, 'drive')}
                            disabled={importLoading}
                          >
                            Import
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {driveFiles.length === 0 && !importLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No documents found</p>
                      <p className="text-sm">Search or click &#34;Load All Documents&#34;</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* OneDrive Tab */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-blue-500" />
                    OneDrive
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleOnedriveSearch} className="flex gap-2">
                    <Input
                      placeholder="Search files..."
                      value={onedriveSearch}
                      onChange={(e) => setOnedriveSearch(e.target.value)}
                      className="flex-1"
                    />
                    <Button type="submit" disabled={importLoading}>
                      <Search className="h-4 w-4" />
                    </Button>
                  </form>

                  <Button 
                    variant="outline" 
                    onClick={() => loadOnedriveFiles()}
                    disabled={importLoading}
                    className="w-full gap-2"
                  >
                    <Loader2 className="h-4 w-4" />
                    Load All Documents
                  </Button>

                  {importLoading && <div className="text-center py-4"><Loader2 className="h-6 w-6 animate-spin mx-auto" /></div>}

                  {onedriveFiles.length > 0 && (
                    <div className="max-h-96 overflow-y-auto space-y-2">
                      {onedriveFiles.map((file: any) => (
                        <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-blue-500" />
                            <div className="min-w-0">
                              <p className="font-medium truncate">{file.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {file.file?.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ? 'Word Document' : 
                                 file.file?.mimeType === 'text/plain' ? 'Text File' : 'PDF'}
                              </p>
                            </div>
                          </div>
                          <Button 
                            size="sm" 
                            onClick={() => handleImportFile(file.id, 'onedrive')}
                            disabled={importLoading}
                          >
                            Import
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {onedriveFiles.length === 0 && !importLoading && (
                    <div className="text-center py-8 text-muted-foreground">
                      <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No documents found</p>
                      <p className="text-sm">Search or click &#34;Load All Documents&#34;</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Imported Content Preview */}
            {importedContent && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Imported Content</CardTitle>
                    <Button variant="ghost" size="sm" onClick={() => setImportedContent(null)}>
                      Clear
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="max-h-96 overflow-y-auto p-4 border rounded-lg bg-muted/30">
                    <pre className="whitespace-pre-wrap text-sm">{importedContent}</pre>
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">
                    Copy this content to use in a tutoring session or save as an artifact.
                  </p>
                </CardContent>
              </Card>
            )}

            {importError && (
              <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-lg text-destructive">
                {importError}
              </div>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}