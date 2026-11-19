"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MessageSquare, Bot, Info, Terminal, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatRelativeTime, formatDateTime } from "@/lib/sessions/format";

interface TranscriptMessage {
  id: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  contentType: string;
  sequence: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface SessionTranscriptProps {
  session: {
    status: string;
    messageCount: number;
  };
  messages: TranscriptMessage[];
}

/**
 * Long tool/system payloads are collapsed behind a "Show more" toggle.
 * Hooks live in this component so the parent render stays hook-safe.
 */
function ExpandableContent({
  content,
  maxLength = 400,
}: {
  content: string;
  maxLength?: number;
}) {
  const [expanded, setExpanded] = React.useState(false);
  const isLong = content.length > maxLength;
  const displayContent =
    isLong && !expanded ? `${content.slice(0, maxLength)}…` : content;

  return (
    <div className="min-w-0">
      <div className="whitespace-pre-wrap break-words">{displayContent}</div>
      {isLong && (
        <button
          type="button"
          onClick={() => setExpanded((value) => !value)}
          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
          aria-expanded={expanded}
        >
          {expanded ? (
            <>
              <ChevronUp className="h-3 w-3" aria-hidden="true" />
              Show less
            </>
          ) : (
            <>
              <ChevronDown className="h-3 w-3" aria-hidden="true" />
              Show more
            </>
          )}
        </button>
      )}
    </div>
  );
}

function MessageContent({ content }: { content: string }) {
  return <div className="whitespace-pre-wrap break-words text-sm">{content}</div>;
}

export function SessionTranscript({ session, messages }: SessionTranscriptProps) {
  const isActive = session.status === "active";

  const sortedMessages = React.useMemo(
    () => [...messages].sort((a, b) => a.sequence - b.sequence),
    [messages]
  );

  if (sortedMessages.length === 0) {
    return (
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-lg">Transcript</CardTitle>
          <Badge variant="secondary">{session.messageCount}</Badge>
        </CardHeader>
        <CardContent className="py-12 text-center">
          <MessageSquare
            className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4"
            aria-hidden="true"
          />
          <p className="text-muted-foreground">
            {isActive
              ? "The student hasn't sent a message yet. This view refreshes automatically."
              : "This session has no recorded messages."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg">Transcript</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">{session.messageCount}</Badge>
          {isActive && (
            <span className="text-xs text-muted-foreground">Auto-updating</span>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="max-h-[60vh]">
          <div className="space-y-4 p-4">
            {sortedMessages.map((message) => {
              const isStudent = message.role === "user";
              const isSystem = message.role === "system";
              const isTool = message.role === "tool";

              if (isSystem || isTool) {
                return (
                  <div key={message.id} className="flex justify-center">
                    <div className="text-center max-w-[85%]">
                      <p className="text-xs text-muted-foreground font-medium mb-1">
                        {isSystem ? "System" : "Tool"}
                      </p>
                      <div className="inline-flex max-w-full items-start gap-1.5 rounded-lg bg-muted px-3 py-1.5 text-sm text-muted-foreground text-left">
                        {isSystem ? (
                          <Info className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        ) : (
                          <Terminal className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
                        )}
                        <ExpandableContent content={message.content} />
                      </div>
                      <p className="text-xs text-muted-foreground/70 mt-1">
                        {formatRelativeTime(message.createdAt)}
                      </p>
                    </div>
                  </div>
                );
              }

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex gap-3",
                    isStudent ? "flex-row" : "flex-row-reverse"
                  )}
                >
                  {isStudent ? (
                    <>
                      <Avatar className="h-8 w-8 shrink-0">
                        <AvatarFallback className="text-xs">S</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 max-w-[75%] min-w-0">
                        <p className="text-xs text-muted-foreground font-medium mb-1">
                          Student
                        </p>
                        <div className="rounded-2xl bg-muted px-4 py-2">
                          <MessageContent content={message.content} />
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1">
                          <time
                            dateTime={message.createdAt}
                            title={formatDateTime(message.createdAt)}
                          >
                            {formatRelativeTime(message.createdAt)}
                          </time>
                        </p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex-1 max-w-[75%] min-w-0">
                        <p className="text-xs text-muted-foreground font-medium mb-1 text-right">
                          Tutor
                        </p>
                        <div className="rounded-2xl bg-primary/10 border border-primary/20 px-4 py-2">
                          <MessageContent content={message.content} />
                        </div>
                        <p className="text-xs text-muted-foreground/70 mt-1 text-right">
                          <time
                            dateTime={message.createdAt}
                            title={formatDateTime(message.createdAt)}
                          >
                            {formatRelativeTime(message.createdAt)}
                          </time>
                        </p>
                      </div>
                      <Avatar className="h-8 w-8 shrink-0 bg-primary/10">
                        <AvatarFallback className="text-xs text-primary">
                          <Bot className="h-4 w-4" aria-hidden="true" />
                        </AvatarFallback>
                      </Avatar>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
