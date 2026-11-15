"use client";

/**
 * Google Classroom Admin Page (M2 Day 1 foundation)
 *
 * Admin UI for connecting Google Classroom via OAuth2 and previewing
 * imported courses / rosters. No real Google credentials are required
 * — the auth route returns 503 when GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET
 * are missing, and the UI surfaces that gracefully.
 */

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { toast } from "sonner";
import {
  Plus,
  RefreshCw,
  Loader2,
  AlertCircle,
  CheckCircle,
  Users,
  X,
} from 'lucide-react';

interface Course {
  id: string;
  name: string;
  courseState: string;
  ownerId?: string;
  alternateLink?: string;
}

interface RosterEntry {
  courseId: string;
  userId: string;
  email: string | null;
  name: string | null;
  role: 'TEACHER' | 'STUDENT';
}

interface Platform {
  id: string;
  name: string;
}

function courseStateBadge(state: string) {
  const variants: Record<string, 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info'> = {
    active: 'success',
    archived: 'secondary',
    provisioned: 'warning',
    declined: 'destructive',
  };
  return (
    <Badge variant={variants[state] || 'default'} className="capitalize text-xs md:text-sm">
      {state.charAt(0).toUpperCase() + state.slice(1)}
    </Badge>
  );
}

export default function GoogleClassroomPage() {
  const [connected, setConnected] = useState(false);
  const [configMissing, setConfigMissing] = useState(false);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [roster, setRoster] = useState<RosterEntry[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(false);
  const [rosterLoading, setRosterLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importPlatformId, setImportPlatformId] = useState<string>('');
  const [importCourseId, setImportCourseId] = useState<string>('');

  const fetchConnectedState = useCallback(async () => {
    const res = await fetch('/api/google-classroom/courses', { cache: 'no-store' });
    if (res.status === 200) {
      const data = await res.json();
      setConnected(true);
      setCourses(Array.isArray(data.data) ? data.data : []);
      setConfigMissing(false);
    } else if (res.status === 503) {
      setConfigMissing(true);
      setConnected(false);
    } else if (res.status === 404) {
      setConnected(false);
      setConfigMissing(false);
    } else {
      setConnected(false);
      setConfigMissing(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchConnectedState();
  }, [fetchConnectedState]);

  const handleConnect = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/google-classroom/auth', { cache: 'no-store' });
      if (res.status === 503) {
        setConfigMissing(true);
        toast.error('Google Classroom OAuth not configured');
        return;
      }
      if (!res.ok) {
        toast.error('Failed to start Google Classroom connection');
        return;
      }
      const { authorizationUrl } = await res.json();
      // Client-side redirect to Google's OAuth page
      window.location.assign(authorizationUrl);
    } catch {
      toast.error('Failed to start Google Classroom connection');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRoster = async (course: Course) => {
    setSelectedCourse(course);
    setRosterLoading(true);
    try {
      const res = await fetch(`/api/google-classroom/rosters?courseId=${encodeURIComponent(course.id)}`, {
        cache: 'no-store',
      });
      if (res.ok) {
        const data = await res.json();
        setRoster(Array.isArray(data.data) ? data.data : []);
      } else {
        toast.error('Failed to load roster');
      }
    } catch {
      toast.error('Failed to load roster');
    } finally {
      setRosterLoading(false);
    }
  };

  const handleRefresh = async () => {
    await fetchConnectedState();
    toast.success('Courses refreshed');
  };

  const handleImport = async () => {
    if (!importCourseId || !importPlatformId) return;
    setImporting(true);
    try {
      // Call LTI deployment creation
      const res = await fetch('/api/admin/lti/deployments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platformId: importPlatformId,
          deploymentId: `gc-${importCourseId}`,
          name: `Google Classroom: ${importCourseId}`,
          targetLinkUri: `${window.location.origin}/api/google-classroom/lti/launch`,
        }),
      });
      if (res.ok) {
        toast.success('Course imported to LTI platform');
        setImportPlatformId('');
        setImportCourseId('');
      } else {
        toast.error('Import failed — LTI platform mapping coming next');
      }
    } catch {
      toast.error('Import failed — LTI platform mapping coming next');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Google Classroom</h1>
          <p className="text-muted-foreground">
            Import Google Classroom courses and rosters into your LTI platform.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Configuration missing notice */}
      {configMissing && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Google Classroom OAuth is not configured. Set
            <code className="font-mono text-xs">GOOGLE_CLIENT_ID</code> and{' '}
            <code className="font-mono text-xs">GOOGLE_CLIENT_SECRET</code> environment
            variables to enable connection.
          </AlertDescription>
        </Alert>
      )}

      {/* Connect section */}
      <Card>
        <CardHeader>
          <CardTitle>Connect Google Account</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          {!connected && (
            <Button
              onClick={handleConnect}
              disabled={loading || configMissing}
              className="w-full flex items-center justify-center gap-2"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {loading ? 'Connecting…' : 'Connect Google Classroom'}
            </Button>
          )}
          {connected && (
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <span className="font-medium">Google Classroom connected</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Courses table */}
      {connected && (
        <Card>
          <CardHeader className="flex items-center justify-between">
            <CardTitle>Imported Courses</CardTitle>
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : courses.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No courses found. Connect your Google Classroom account to import courses.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>State</TableHead>
                      <TableHead>Owner ID</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {courses.map(course => (
                      <TableRow key={course.id} className="cursor-pointer hover:bg-accent">
                        <TableCell className="font-medium">{course.name}</TableCell>
                        <TableCell>{courseStateBadge(course.courseState)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground truncate max-w-[200px]">
                          {course.ownerId ?? '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleLoadRoster(course)}
                            disabled={rosterLoading}
                          >
                            <Users className="mr-2 h-3 w-3" /> View Roster
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Roster preview */}
      {selectedCourse && roster.length > 0 && (
        <Card>
          <CardHeader className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <CardTitle>Roster: {selectedCourse.name}</CardTitle>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSelectedCourse(null)}
            >
              <X className="h-3 w-3" /> Close
            </Button>
          </CardHeader>
          <CardContent>
            {rosterLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead className="text-right">Import</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roster.map(entry => (
                      <TableRow key={entry.userId}>
                        <TableCell className="font-medium">{entry.name ?? 'Unknown'}</TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {entry.email ?? '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={entry.role === 'TEACHER' ? 'secondary' : 'default'}
                            className="text-xs capitalize"
                          >
                            {entry.role}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={importing || !platforms.length}
                            onClick={() => {
                              setImportCourseId(selectedCourse?.id ?? '');
                              // select first platform as default if none chosen
                              if (!importPlatformId && platforms[0]) setImportPlatformId(platforms[0].id);
                            }}
                          >
                            Import
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Import to LTI platform */}
      {connected && platforms.length > 0 && selectedCourse && (
        <Card>
          <CardHeader>
            <CardTitle>Import Course to LTI Platform</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div className="relative">
              <Label>Platform</Label>
              <Select
                value={importPlatformId}
                onValueChange={setImportPlatformId}
                disabled={importing}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {platforms.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleImport}
              disabled={importing || !importPlatformId}
            >
              {importing ? 'Importing…' : 'Import Course'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
