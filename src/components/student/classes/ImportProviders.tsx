"use client";

import * as React from "react";
import { Loader2, Search, FileText, Copy, Check, ExternalLink, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import Link from "next/link";

type Provider = "drive" | "onedrive";

interface FileItem {
  id: string;
  name: string;
  mimeType?: string;
  file?: { mimeType?: string };
}

interface ProviderPanelProps {
  provider: Provider;
  title: string;
  iconColor: "text-green-500" | "text-blue-500";
  icon: React.ReactNode;
  onLoadFiles: (searchQuery?: string) => Promise<void>;
  onSearch: (e: React.FormEvent) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  files: FileItem[];
  loading: boolean;
  error: string | null;
  notConnected: boolean;
  onImportFile: (fileId: string) => Promise<void>;
  importingFileId: string | null;
}

function getFileTypeLabel(mimeType?: string): string {
  if (!mimeType) return "File";
  if (mimeType.includes("google-apps.document")) return "Google Doc";
  if (mimeType.includes("wordprocessingml")) return "Word Document";
  if (mimeType.includes("text/plain")) return "Text File";
  if (mimeType.includes("pdf")) return "PDF";
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return "Spreadsheet";
  if (mimeType.includes("presentation") || mimeType.includes("powerpoint")) return "Presentation";
  return "File";
}

export function ProviderPanel({
  provider,
  title,
  iconColor,
  icon,
  onLoadFiles,
  onSearch,
  searchQuery,
  setSearchQuery,
  files,
  loading,
  error,
  notConnected,
  onImportFile,
  importingFileId,
}: ProviderPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span className={iconColor}>{icon}</span>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Not connected state */}
        {notConnected && (
          <div className="text-center py-8 space-y-3">
            <Globe className="h-10 w-10 mx-auto opacity-50" />
            <p className="font-medium">{title} not connected</p>
            <p className="text-sm text-muted-foreground">
              Connect your {title} account in Settings to import documents.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/student/settings">
                <ExternalLink className="mr-2 h-4 w-4" />
                Manage connections
              </Link>
            </Button>
          </div>
        )}

        {/* Connected state */}
        {!notConnected && (
          <>
            {/* Search form */}
            <form onSubmit={onSearch} className="flex gap-2">
              <Input
                placeholder="Search files..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
                disabled={loading}
              />
              <Button type="submit" disabled={loading || !searchQuery.trim()}>
                <Search className="h-4 w-4" />
                <span className="sr-only">Search</span>
              </Button>
            </form>

            {/* Load all button */}
            <Button
              variant="outline"
              onClick={() => onLoadFiles()}
              disabled={loading}
              className="w-full gap-2 justify-center"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <>
                  <FileText className="h-4 w-4" />
                  Load All Documents
                </>
              )}
            </Button>

            {loading && !files.length && (
              <div className="text-center py-4">
                <Loader2 className="h-6 w-6 animate-spin mx-auto" />
                <p className="text-sm text-muted-foreground mt-2">Loading...</p>
              </div>
            )}

            {files.length > 0 && (
              <div className="max-h-96 overflow-y-auto space-y-2">
                {files.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className={iconColor.replace("text-", "") + " h-5 w-5"} />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{file.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {getFileTypeLabel(file.mimeType || file.file?.mimeType)}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => onImportFile(file.id)}
                      disabled={importingFileId === file.id || loading}
                      className="whitespace-nowrap"
                    >
                      {importingFileId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Import"
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}

            {!loading && files.length === 0 && !notConnected && (
              <div className="text-center py-8 text-muted-foreground">
                <FileText className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>No documents found</p>
                <p className="text-sm">Search or click &quot;Load All Documents&quot;</p>
              </div>
            )}

            {error && !notConnected && (
              <div className="p-3 text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg">
                {error}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

interface ImportPreviewProps {
  content: string;
  onClear: () => void;
  onCopy: () => void;
  copying: boolean;
}

export function ImportPreview({ content, onClear, onCopy, copying }: ImportPreviewProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Imported Content</CardTitle>
          <Button variant="ghost" size="sm" onClick={onClear} disabled={copying}>
            Clear
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="h-96">
          <div className="p-4 border rounded-lg bg-muted/30">
            <pre className="whitespace-pre-wrap text-sm font-mono">{content}</pre>
          </div>
        </ScrollArea>
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Copy this content to use in a tutoring session or save as an artifact.
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={onCopy}
            disabled={copying}
            className="gap-2"
          >
            {copying ? (
              <>
                <Check className="h-4 w-4 text-green-500" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}