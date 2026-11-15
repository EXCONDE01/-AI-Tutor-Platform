"use client";

import { useCallback, useEffect, useState } from "react";
import { enqueueMessage, getPendingMessages, markMessageSent, markMessageFailed } from "./use-push-queue";
import { toast } from "./use-toast";

export type MessageStatus = "sending" | "sent" | "failed";

export interface OptimisticMessage<T = unknown> {
  id: string;
  content: string;
  role: "user" | "assistant" | "system";
  status: MessageStatus;
  createdAt: string;
  timestamp: number;
  metadata?: T;
  queueId?: string; // Link to IndexedDB queue item
}

interface UseOptimisticMessagesOptions<T = unknown> {
  onSend: (message: OptimisticMessage<T>) => Promise<{ success: boolean; error?: string; serverId?: string }>;
  onRetry?: (message: OptimisticMessage<T>) => Promise<{ success: boolean; error?: string; serverId?: string }>;
  maxRetries?: number;
}

export function useOptimisticMessages<T = unknown>(options: UseOptimisticMessagesOptions<T>) {
  const { onSend, onRetry, maxRetries = 3 } = options;
  const [messages, setMessages] = useState<OptimisticMessage<T>[]>([]);
  const [isOnline, setIsOnline] = useState(typeof navigator !== "undefined" ? navigator.onLine : true);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const addMessage = useCallback(
    (message: Omit<OptimisticMessage<T>, "id" | "status" | "timestamp" | "createdAt">) => {
      const now = new Date();
      const newMessage: OptimisticMessage<T> = {
        ...message,
        id: `local-${crypto.randomUUID()}`,
        status: "sending",
        timestamp: now.getTime(),
        createdAt: now.toISOString(),
      };
      setMessages((prev) => [...prev, newMessage]);
      return newMessage;
    },
    []
  );

  const updateMessageStatus = useCallback(
    (id: string, status: MessageStatus) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, status } : msg))
      );
    },
    []
  );

  const updateMessageContent = useCallback(
    (id: string, content: string) => {
      setMessages((prev) =>
        prev.map((msg) => (msg.id === id ? { ...msg, content } : msg))
      );
    },
    []
  );

  const removeMessage = useCallback((id: string) => {
    setMessages((prev) => prev.filter((msg) => msg.id !== id));
  }, []);

  const sendMessage = useCallback(
    async (message: OptimisticMessage<T>) => {
      try {
        const result = await onSend(message);
        
        if (result.success) {
          updateMessageStatus(message.id, "sent");
          
          // If we had a queue ID, mark it as sent in IndexedDB
          if (message.queueId) {
            await markMessageSent(message.queueId);
          }
          
          // Optionally replace local ID with server ID
          if (result.serverId) {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === message.id ? { ...msg, id: result.serverId!, status: "sent" as const } : msg
              )
            );
          }
        } else {
          updateMessageStatus(message.id, "failed");
          
          // If we had a queue ID, mark it as failed in IndexedDB
          if (message.queueId) {
            await markMessageFailed(message.queueId);
          }
          
          // Queue for retry if offline
          if (!isOnline) {
            const queueId = await enqueueMessage(
              message.role === "system" ? "intervention" : "chat",
              { ...message.metadata, content: message.content } as Record<string, unknown>
            );
            
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === message.id ? { ...msg, queueId: queueId.id, status: "failed" as const } : msg
              )
            );
            
            toast({
              title: "Message queued",
              description: "Your message will be sent when you're back online",
              variant: "default",
            });
          }
        }
        
        return result;
      } catch (error) {
        updateMessageStatus(message.id, "failed");
        
        if (message.queueId) {
          await markMessageFailed(message.queueId);
        }
        
        throw error;
      }
    },
    [onSend, isOnline, updateMessageStatus]
  );

  const retryMessage = useCallback(
    async (message: OptimisticMessage<T>) => {
      if (message.status !== "failed") return;
      
      updateMessageStatus(message.id, "sending");
      
      try {
        if (onRetry) {
          await onRetry(message);
        } else {
          await sendMessage(message);
        }
      } catch (error) {
        updateMessageStatus(message.id, "failed");
        toast({
          title: "Retry failed",
          description: error instanceof Error ? error.message : "Could not send message",
          variant: "destructive",
        });
      }
    },
    [onRetry, sendMessage, updateMessageStatus]
  );

  // Send a new message with optimistic UI
  const send = useCallback(
    async (content: string, role: "user" | "system" = "user", metadata?: T) => {
      const message = addMessage({ content, role, metadata });
      
      try {
        await sendMessage(message);
      } catch (error) {
        // Error already handled in sendMessage
        console.error("Send failed:", error);
      }
      
      return message;
    },
    [addMessage, sendMessage]
  );

  // Retry all failed messages
  const retryAllFailed = useCallback(async () => {
    const failedMessages = messages.filter((m) => m.status === "failed");
    
    for (const message of failedMessages) {
      await retryMessage(message);
    }
  }, [messages, retryMessage]);

  // Clear sent messages (optional cleanup)
  const clearSent = useCallback(() => {
    setMessages((prev) => prev.filter((msg) => msg.status !== "sent"));
  }, []);

  // Clear all messages
  const clearAll = useCallback(() => {
    setMessages([]);
  }, []);

  return {
    messages,
    isOnline,
    send,
    retryMessage,
    retryAllFailed,
    updateMessageStatus,
    updateMessageContent,
    removeMessage,
    clearSent,
    clearAll,
    // Computed values
    pendingCount: messages.filter((m) => m.status === "sending").length,
    failedCount: messages.filter((m) => m.status === "failed").length,
    sentCount: messages.filter((m) => m.status === "sent").length,
  };
}

/**
 * Hook specifically for chat messages
 */
export function useOptimisticChat(options: {
  sessionId: string;
  onSendMessage: (sessionId: string, message: string) => Promise<{ success: boolean; error?: string; serverId?: string }>;
}) {
  const { sessionId, onSendMessage } = options;
  
  return useOptimisticMessages({
    onSend: async (message) => {
      return onSendMessage(sessionId, message.content);
    },
    onRetry: async (message) => {
      return onSendMessage(sessionId, message.content);
    },
  });
}

/**
 * Hook specifically for teacher interventions
 */
export function useOptimisticIntervention(options: {
  sessionId: string;
  onSendIntervention: (sessionId: string, message: string) => Promise<{ success: boolean; error?: string; serverId?: string }>;
}) {
  const { sessionId, onSendIntervention } = options;
  
  return useOptimisticMessages({
    onSend: async (message) => {
      return onSendIntervention(sessionId, message.content);
    },
    onRetry: async (message) => {
      return onSendIntervention(sessionId, message.content);
    },
  });
}