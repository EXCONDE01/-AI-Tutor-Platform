"use client";

import { useCallback, useEffect, useState } from "react";
import { openDB, DBSchema, IDBPDatabase } from "idb";

interface QueueItem {
  id: string;
  type: "chat" | "intervention";
  payload: Record<string, unknown>;
  timestamp: number;
  status: "pending" | "sent" | "failed";
  retryCount: number;
}

interface PushQueueDB extends DBSchema {
  queue: {
    key: string;
    value: QueueItem;
    indexes: { "by-status": "status"; "by-timestamp": "timestamp" };
  };
}

const DB_NAME = "ai-tutor-push-queue";
const DB_VERSION = 1;
const STORE_NAME = "queue";

let dbPromise: Promise<IDBPDatabase<PushQueueDB>> | null = null;

function getDB(): Promise<IDBPDatabase<PushQueueDB>> {
  if (!dbPromise) {
    dbPromise = openDB<PushQueueDB>(DB_NAME, DB_VERSION, {
      upgrade(db) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "id" });
        store.createIndex("by-status", "status");
        store.createIndex("by-timestamp", "timestamp");
      },
    });
  }
  return dbPromise;
}

export function usePushQueue() {
  const [isReady, setIsReady] = useState(false);
  const [queueLength, setQueueLength] = useState(0);

  const refreshQueueLength = useCallback(async () => {
    const db = await getDB();
    const count = await db.count(STORE_NAME);
    setQueueLength(count);
  }, []);

  useEffect(() => {
    getDB().then(() => {
      setIsReady(true);
      refreshQueueLength();
    });
  }, [refreshQueueLength]);

  const enqueue = useCallback(
    async (item: Omit<QueueItem, "id" | "timestamp" | "status" | "retryCount">) => {
      const db = await getDB();
      const newItem: QueueItem = {
        ...item,
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        status: "pending",
        retryCount: 0,
      };
      await db.add(STORE_NAME, newItem);
      await refreshQueueLength();
      return newItem;
    },
    [refreshQueueLength]
  );

  const getAll = useCallback(async (): Promise<QueueItem[]> => {
    const db = await getDB();
    return db.getAllFromIndex(STORE_NAME, "by-timestamp");
  }, []);

  const getPending = useCallback(async (): Promise<QueueItem[]> => {
    const db = await getDB();
    // Use getAll with a query on the index
    const tx = db.transaction(STORE_NAME, 'readonly');
    const index = tx.store.index('by-status');
    // @ts-expect-error - idb types issue with string index key
    return index.getAll('pending');
  }, []);

  const markSent = useCallback(
    async (id: string) => {
      const db = await getDB();
      const item = await db.get(STORE_NAME, id);
      if (item) {
        item.status = "sent";
        await db.put(STORE_NAME, item);
        await refreshQueueLength();
      }
    },
    [refreshQueueLength]
  );

  const markFailed = useCallback(
    async (id: string) => {
      const db = await getDB();
      const item = await db.get(STORE_NAME, id);
      if (item) {
        item.status = "failed";
        item.retryCount += 1;
        await db.put(STORE_NAME, item);
        await refreshQueueLength();
      }
    },
    [refreshQueueLength]
  );

  const incrementRetry = useCallback(
    async (id: string) => {
      const db = await getDB();
      const item = await db.get(STORE_NAME, id);
      if (item && item.status === "pending") {
        item.retryCount += 1;
        await db.put(STORE_NAME, item);
      }
    },
    []
  );

  const clear = useCallback(async () => {
    const db = await getDB();
    await db.clear(STORE_NAME);
    await refreshQueueLength();
  }, [refreshQueueLength]);

  const deleteItem = useCallback(
    async (id: string) => {
      const db = await getDB();
      await db.delete(STORE_NAME, id);
      await refreshQueueLength();
    },
    [refreshQueueLength]
  );

  // Register background sync when queue has pending items
  const registerBackgroundSync = useCallback(async () => {
    if (!("serviceWorker" in navigator)) return;
    
    const registration = await navigator.serviceWorker.ready;
    // Type assertion for Background Sync API
    const syncManager = (registration as unknown as { sync: { register: (tag: string) => Promise<void> } }).sync;
    if (syncManager) {
      try {
        await syncManager.register("sync-messages");
      } catch (error) {
        console.warn("Background sync registration failed:", error);
      }
    }
  }, []);

  // Auto-register sync when queue changes
  useEffect(() => {
    if (isReady && queueLength > 0) {
      registerBackgroundSync();
    }
  }, [isReady, queueLength, registerBackgroundSync]);

  return {
    isReady,
    queueLength,
    enqueue,
    getAll,
    getPending,
    markSent,
    markFailed,
    incrementRetry,
    clear,
    deleteItem,
    registerBackgroundSync,
  };
}

// Helper functions for use outside React components
export async function enqueueMessage(type: "chat" | "intervention", payload: Record<string, unknown>) {
  const db = await getDB();
  const item: QueueItem = {
    id: crypto.randomUUID(),
    type,
    payload,
    timestamp: Date.now(),
    status: "pending",
    retryCount: 0,
  };
  await db.add(STORE_NAME, item);
  return item;
}

export async function getPendingMessages(): Promise<QueueItem[]> {
  const db = await getDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const index = tx.store.index('by-status');
  // @ts-expect-error - idb types issue with string index key
  return index.getAll('pending');
}

export async function markMessageSent(id: string) {
  const db = await getDB();
  const item = await db.get(STORE_NAME, id);
  if (item) {
    item.status = "sent";
    await db.put(STORE_NAME, item);
  }
}

export async function markMessageFailed(id: string) {
  const db = await getDB();
  const item = await db.get(STORE_NAME, id);
  if (item) {
    item.status = "failed";
    item.retryCount += 1;
    await db.put(STORE_NAME, item);
  }
}

export async function incrementMessageRetry(id: string) {
  const db = await getDB();
  const item = await db.get(STORE_NAME, id);
  if (item && item.status === "pending") {
    item.retryCount += 1;
    await db.put(STORE_NAME, item);
  }
}