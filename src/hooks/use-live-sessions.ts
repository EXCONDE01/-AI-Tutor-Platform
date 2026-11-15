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
      const res = await fetch(
        `/api/realtime/teacher-sessions?type=sessions&teacherId=${encodeURIComponent(teacherId)}`,
        { credentials: "include" }
      );

      if (!res.ok) {
        throw new Error("Failed to get sealed query");
      }

      const data = await res.json();
      return data.sealedQuery as SealedLiveQuery<LiveSession>;
    } catch (err) {
      console.error("Failed to fetch sealed query:", err);
      return null;
    }
  }, [enabled, teacherId]);

  // Subscribe to live query when sealed query is available
  useEffect(() => {
    if (!enabled || !teacherId || usingFallback || !clientRef.current) return;

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

      sealedQueryRef.current = sealed;
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
              const rows = snapshot.data as unknown as LiveSession[];
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
                const rows = snapshot.data as unknown as LiveSession[];
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
              const rows = snapshot.data as unknown as LiveMessage[];
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
                const rows = snapshot.data as unknown as LiveMessage[];
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
      const res = await fetch(`/api/teacher/live-sessions?teacherId=${teacherId}`, {
        credentials: "include",
      });

      if (res.ok) {
        const data = await res.json();
        setSessions(data.sessions || []);
        setError(null);
      } else {
        throw new Error("Failed to fetch sessions");
      }
    } catch (err) {
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