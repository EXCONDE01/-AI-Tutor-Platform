"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getRealtimeClient } from "@/lib/realtime/client";
import type { SealedLiveQuery } from "@neon/realtime/client";

interface LiveSession {
  id: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  classId: string;
  className: string;
  classSubject: string;
  status: string;
  title: string | null;
  messageCount: number;
  startedAt: string;
  lastMessageAt: string | null;
  lastMessageContent: string | null;
  totalDurationSeconds: number;
  updatedAt: string;
}

interface LiveMessage {
  id: string;
  sessionId: string;
  role: "user" | "assistant" | "system" | "tool";
  content: string;
  contentType: string;
  sequence: number;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface LiveIntervention {
  id: string;
  sessionId: string;
  studentId: string;
  classId: string;
  teacherId: string | null;
  type: string;
  severity: string;
  status: string;
  title: string;
  description: string;
  evidence: Record<string, unknown>;
  suggestedActions: string[];
  teacherNotes: string | null;
  resolvedAt: string | null;
  resolvedBy: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface UseLiveSessionsOptions {
  teacherId: string;
  onSessionsChange?: (sessions: LiveSession[]) => void;
  onNewMessage?: (message: LiveMessage) => void;
  onInterventionChange?: (intervention: LiveIntervention) => void;
  enabled?: boolean;
}

interface UseLiveSessionsReturn {
  sessions: LiveSession[];
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

interface UseLiveSessionsPollingReturn {
  sessions: LiveSession[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

interface UseLiveSessionMessagesOptions {
  sessionId: string;
  enabled?: boolean;
}

interface UseLiveSessionMessagesReturn {
  messages: LiveMessage[];
  isConnected: boolean;
  error: Error | null;
  reconnect: () => void;
}

const NO_SESSIONS: readonly LiveSession[] = [];
const NO_MESSAGES: readonly LiveMessage[] = [];

type LiveQueryStatus = "connecting" | "live" | "stale" | "closed" | "error";

/** Raw row shape returned by the `teacher_active_sessions_realtime` shadow table */
type RawSessionRow = {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  class_id: string;
  class_name: string;
  class_subject: string;
  status: string;
  title: string | null;
  message_count: number | null;
  started_at: string | Date | null;
  ended_at: string | Date | null;
  paused_at: string | Date | null;
  total_duration_seconds: number | null;
  updated_at: string | Date | null;
  // Present when the row already comes from the REST API (camelCase)
  studentId?: string;
  studentName?: string;
  studentEmail?: string;
  classId?: string;
  className?: string;
  classSubject?: string;
  messageCount?: number;
  startedAt?: string;
  totalDurationSeconds?: number;
  updatedAt?: string;
  lastMessageAt?: string | null;
  lastMessageContent?: string | null;
};

/** Raw row shape returned by the `session_messages_realtime` shadow table */
type RawMessageRow = {
  id: string;
  session_id: string;
  role: string;
  content: string;
  content_type: string;
  sequence: number;
  metadata: Record<string, unknown> | null;
  created_at: string | Date | null;
  sessionId?: string;
  contentType?: string;
  createdAt?: string;
};

function toIsoString(value: string | Date | null | undefined): string {
  if (!value) return new Date(0).toISOString();
  return value instanceof Date ? value.toISOString() : value;
}

/**
 * Neon Realtime returns raw column names (snake_case), the UI expects camelCase.
 * This normalizes both shapes into a `LiveSession`.
 */
function mapSessionRow(row: RawSessionRow): LiveSession {
  const updatedAt = toIsoString(row.updated_at ?? row.updatedAt);
  return {
    id: row.id,
    studentId: row.student_id ?? row.studentId ?? "",
    studentName: row.student_name ?? row.studentName ?? "",
    studentEmail: row.student_email ?? row.studentEmail ?? "",
    classId: row.class_id ?? row.classId ?? "",
    className: row.class_name ?? row.className ?? "",
    classSubject: row.class_subject ?? row.classSubject ?? "",
    status: row.status,
    title: row.title,
    messageCount: row.message_count ?? row.messageCount ?? 0,
    startedAt: toIsoString(row.started_at ?? row.startedAt),
    lastMessageAt: row.lastMessageAt ?? updatedAt,
    lastMessageContent: row.lastMessageContent ?? null,
    totalDurationSeconds: row.total_duration_seconds ?? row.totalDurationSeconds ?? 0,
    updatedAt,
  };
}

function mapMessageRow(row: RawMessageRow): LiveMessage {
  return {
    id: row.id,
    sessionId: row.session_id ?? row.sessionId ?? "",
    role: row.role as LiveMessage["role"],
    content: row.content,
    contentType: row.content_type ?? row.contentType ?? "text",
    sequence: row.sequence,
    metadata: row.metadata ?? {},
    createdAt: toIsoString(row.created_at ?? row.createdAt),
  };
}


/**
 * Main hook using Neon Realtime live queries
 * Replaces polling with real-time subscriptions via @neon/realtime client
 *
 * Requires a RealtimeProvider ancestor in the component tree.
 */
export function useLiveSessions({
  teacherId,
  onSessionsChange,
  onNewMessage,
  onInterventionChange,
  enabled = true,
}: UseLiveSessionsOptions): UseLiveSessionsReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [status, setStatus] = useState<LiveQueryStatus>("closed");
  const clientRef = useRef<ReturnType<typeof getRealtimeClient> | null>(null);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);
  const sealedQueryRef = useRef<SealedLiveQuery<LiveSession> | null>(null);

  // Initialize realtime client
  useEffect(() => {
    if (typeof window !== "undefined") {
      clientRef.current = getRealtimeClient();
    }
  }, []);

  // Fetch sealed query from our API
  const fetchSealedQuery = useCallback(async (): Promise<SealedLiveQuery<LiveSession> | null> => {
    if (!enabled || !teacherId) return null;

    try {
      const url = `/api/realtime/teacher-sessions?type=sessions&teacherId=${encodeURIComponent(teacherId)}`;
      console.log('[useLiveSessions] Fetching sealed query from:', url);
      
      const res = await fetch(url, { credentials: "include" });

      console.log('[useLiveSessions] Response status:', res.status, res.statusText);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[useLiveSessions] Error response:', errorText);
        throw new Error("Failed to get sealed query: " + errorText);
      }

      const data = await res.json();
      console.log('[useLiveSessions] Full response data:', data);
      console.log('[useLiveSessions] Sealed query received:', !!data.sealedQuery);
      return data.sealedQuery as SealedLiveQuery<LiveSession>;
    } catch (err) {
      console.error('[useLiveSessions] Fetch sealed query error:', err);
      return null;
    }
  }, [enabled, teacherId]);

  // Subscribe to live query when sealed query is available
  useEffect(() => {
    if (!enabled || !teacherId || usingFallback || !clientRef.current) return;

    console.log('[useLiveSessions] Starting subscription, teacherId:', teacherId);

    let cancelled = false;
    let currentSub: { unsubscribe: () => void } | null = null;

    (async () => {
      console.log('[useLiveSessions] Fetching sealed query...');
      const sealed = await fetchSealedQuery();
      if (cancelled) return;

      console.log('[useLiveSessions] Sealed query result:', sealed ? 'success' : 'null/failed');
      
      if (!sealed) {
        setStatus("error");
        setError(new Error("Failed to obtain sealed query"));
        setUsingFallback(true);
        return;
      }

      sealedQueryRef.current = sealed;
      setStatus("connecting");

      try {
        console.log('[useLiveSessions] Subscribing to sealed query...');
        const sub = clientRef.current!.subscribe(sealed, {
          initialData: [],
        });
        currentSub = sub;
        subRef.current = sub;
        console.log('[useLiveSessions] Subscription created');

        const unlisten = sub.onChange((snapshot) => {
          if (cancelled) return;
          setStatus(snapshot.status as LiveQueryStatus);

          if (snapshot.status === "live" || snapshot.status === "stale") {
            setIsConnected(true);
            setError(null);
            if (snapshot.data) {
              const rows = (snapshot.data as unknown as RawSessionRow[]).map(mapSessionRow);
              setSessions(rows);
              if (onSessionsChange) onSessionsChange([...rows]);
            }
          } else if (snapshot.status === "error") {
            setIsConnected(false);
            if (snapshot.error) {
              setError(snapshot.error);
              setUsingFallback(true);
            }
          } else if (snapshot.status === "closed") {
            setIsConnected(false);
          } else if (snapshot.status === "connecting") {
            setIsConnected(false);
          }
        });

        setIsConnected(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("[useLiveSessions] Subscription error:", err);
        setError(err instanceof Error ? err : new Error("Subscription failed"));
        setUsingFallback(true);
      }
    })();

    return () => {
      cancelled = true;
      if (currentSub) {
        currentSub.unsubscribe();
        subRef.current = null;
      }
    };
  }, [enabled, teacherId, fetchSealedQuery, usingFallback, onSessionsChange]);

  const reconnect = useCallback(() => {
    setUsingFallback(false);
    setError(null);

    if (subRef.current) {
      subRef.current.unsubscribe();
      subRef.current = null;
    }

    void fetchSealedQuery().then((sealed) => {
      if (sealed && clientRef.current) {
        sealedQueryRef.current = sealed;
        setStatus("connecting");
        try {
          const sub = clientRef.current.subscribe(sealed, { initialData: [] });
          subRef.current = sub;
          const unlisten = sub.onChange((snapshot) => {
            setStatus(snapshot.status as LiveQueryStatus);
            if (snapshot.status === "live" || snapshot.status === "stale") {
              setIsConnected(true);
              setError(null);
              if (snapshot.data) {
                const rows = (snapshot.data as unknown as RawSessionRow[]).map(mapSessionRow);
                setSessions(rows);
                if (onSessionsChange) onSessionsChange([...rows]);
              }
            } else if (snapshot.status === "error") {
              setIsConnected(false);
              if (snapshot.error) setError(snapshot.error);
              setUsingFallback(true);
            } else if (snapshot.status === "closed") {
              setIsConnected(false);
            }
          });
          setIsConnected(true);
        } catch (err) {
          console.error("[useLiveSessions] Reconnect error:", err);
          setError(err instanceof Error ? err : new Error("Reconnect failed"));
          setUsingFallback(true);
        }
      }
    });
  }, [fetchSealedQuery, onSessionsChange]);

  return {
    sessions: [...sessions],
    isConnected: usingFallback ? false : isConnected,
    error,
    reconnect,
  };
}

/**
 * Hook for live messages in a specific session
 */
export function useLiveSessionMessages({
  sessionId,
  enabled = true,
}: UseLiveSessionMessagesOptions): UseLiveSessionMessagesReturn {
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [messages, setMessages] = useState<LiveMessage[]>([]);
  const [status, setStatus] = useState<LiveQueryStatus>("closed");
  const clientRef = useRef<ReturnType<typeof getRealtimeClient> | null>(null);
  const subRef = useRef<{ unsubscribe: () => void } | null>(null);

  // Initialize realtime client
  useEffect(() => {
    if (typeof window !== "undefined") {
      clientRef.current = getRealtimeClient();
    }
  }, []);

  const fetchSealedQuery = useCallback(async (): Promise<SealedLiveQuery<LiveMessage> | null> => {
    if (!enabled || !sessionId) return null;

    try {
      const res = await fetch(
        `/api/realtime/teacher-sessions?type=messages&sessionId=${encodeURIComponent(sessionId)}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        throw new Error("Failed to get sealed query");
      }

      const data = await res.json();
      return data.sealedQuery as SealedLiveQuery<LiveMessage>;
    } catch (err) {
      console.error("Failed to fetch sealed messages query:", err);
      return null;
    }
  }, [enabled, sessionId]);

  useEffect(() => {
    if (!enabled || !sessionId || usingFallback || !clientRef.current) return;

    let cancelled = false;
    let currentSub: { unsubscribe: () => void } | null = null;

    (async () => {
      const sealed = await fetchSealedQuery();
      if (cancelled) return;

      if (!sealed) {
        setStatus("error");
        setError(new Error("Failed to obtain sealed query"));
        setUsingFallback(true);
        return;
      }

      setStatus("connecting");

      try {
        const sub = clientRef.current!.subscribe(sealed, {
          initialData: [],
        });
        currentSub = sub;
        subRef.current = sub;

        const unlisten = sub.onChange((snapshot) => {
          if (cancelled) return;
          setStatus(snapshot.status as LiveQueryStatus);

          if (snapshot.status === "live" || snapshot.status === "stale") {
            setIsConnected(true);
            setError(null);
            if (snapshot.data) {
              const rows = (snapshot.data as unknown as RawMessageRow[]).map(mapMessageRow);
              setMessages(rows);
            }
          } else if (snapshot.status === "error") {
            setIsConnected(false);
            if (snapshot.error) {
              setError(snapshot.error);
              setUsingFallback(true);
            }
          } else if (snapshot.status === "closed") {
            setIsConnected(false);
          } else if (snapshot.status === "connecting") {
            setIsConnected(false);
          }
        });

        setIsConnected(true);
        setError(null);
      } catch (err) {
        if (cancelled) return;
        console.error("[useLiveSessionMessages] Subscription error:", err);
        setError(err instanceof Error ? err : new Error("Subscription failed"));
        setUsingFallback(true);
      }
    })();

    return () => {
      cancelled = true;
      if (currentSub) {
        currentSub.unsubscribe();
        subRef.current = null;
      }
    };
  }, [enabled, sessionId, fetchSealedQuery, usingFallback]);

  const reconnect = useCallback(() => {
    setUsingFallback(false);
    setError(null);

    if (subRef.current) {
      subRef.current.unsubscribe();
      subRef.current = null;
    }

    void fetchSealedQuery().then((sealed) => {
      if (sealed && clientRef.current) {
        setStatus("connecting");
        try {
          const sub = clientRef.current.subscribe(sealed, { initialData: [] });
          subRef.current = sub;
          const unlisten = sub.onChange((snapshot) => {
            setStatus(snapshot.status as LiveQueryStatus);
            if (snapshot.status === "live" || snapshot.status === "stale") {
              setIsConnected(true);
              setError(null);
              if (snapshot.data) {
                const rows = (snapshot.data as unknown as RawMessageRow[]).map(mapMessageRow);
                setMessages(rows);
              }
            } else if (snapshot.status === "error") {
              setIsConnected(false);
              if (snapshot.error) setError(snapshot.error);
              setUsingFallback(true);
            } else if (snapshot.status === "closed") {
              setIsConnected(false);
            }
          });
          setIsConnected(true);
        } catch (err) {
          console.error("[useLiveSessionMessages] Reconnect error:", err);
          setError(err instanceof Error ? err : new Error("Reconnect failed"));
          setUsingFallback(true);
        }
      }
    });
  }, [fetchSealedQuery]);

  return {
    messages: [...messages],
    isConnected: usingFallback ? false : isConnected,
    error,
    reconnect,
  };
}

/**
 * Simplified hook for just getting live sessions without full realtime setup
 * Uses polling as fallback
 */
export function useLiveSessionsPolling({
  teacherId,
  interval = 10000,
  enabled = true,
}: {
  teacherId: string;
  interval?: number;
  enabled?: boolean;
}): UseLiveSessionsPollingReturn {
  const [sessions, setSessions] = useState<LiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchSessions = useCallback(async () => {
    try {
      console.log('[useLiveSessionsPolling] Fetching sessions for teacherId:', teacherId);
      const res = await fetch(`/api/teacher/live-sessions?teacherId=${teacherId}`, {
        credentials: "include",
      });

      console.log('[useLiveSessionsPolling] Response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('[useLiveSessionsPolling] Data received:', data);
        setSessions(((data.sessions ?? []) as RawSessionRow[]).map(mapSessionRow));
        setError(null);
      } else {
        const errorText = await res.text();
        console.error('[useLiveSessionsPolling] Error response:', errorText);
        throw new Error("Failed to fetch sessions: " + errorText);
      }
    } catch (err) {
      console.error('[useLiveSessionsPolling] Fetch error:', err);
      setError(err instanceof Error ? err : new Error("Failed to fetch"));
    } finally {
      setLoading(false);
    }
  }, [teacherId]);

  useEffect(() => {
    if (!enabled || !teacherId) return;

    let mounted = true;

    const doFetch = async () => {
      if (!mounted) return;
      await fetchSessions();
    };

    doFetch();

    const intervalId = setInterval(doFetch, interval);

    return () => {
      mounted = false;
      clearInterval(intervalId);
    };
  }, [fetchSessions, enabled, teacherId, interval]);

  return { sessions, loading, error, refetch: fetchSessions };
}

export type { LiveSession, LiveMessage, LiveIntervention };
export { mapSessionRow, mapMessageRow };