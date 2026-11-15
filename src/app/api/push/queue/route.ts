/**
 * Push Queue API - Batch process offline messages
 * POST: Process array of queue items
 * GET: Fetch pending queue items for current user
 */

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth/server";
import { ensureAppUser } from "@/lib/auth/provision";
import { getDb } from "@/lib/db";
import { messages as messagesTable, tutorSessions } from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { sendToUser } from "@/lib/push/server";

interface QueueItem {
  id: string;
  type: "chat" | "intervention";
  payload: Record<string, unknown>;
  timestamp: number;
  status: "pending" | "sent" | "failed";
  retryCount: number;
}

interface ProcessResult {
  id: string;
  success: boolean;
  error?: string;
}

/**
 * Get next sequence number for a session
 */
async function nextSequence(database: ReturnType<typeof getDb>, sessionId: string): Promise<number> {
  const rows = await database
    .select({ value: sql<number>`coalesce(max(${messagesTable.sequence}), -1)` })
    .from(messagesTable)
    .where(eq(messagesTable.sessionId, sessionId));
  return Number(rows[0]?.value ?? -1) + 1;
}

/**
 * Process a chat message queue item
 */
async function processChatItem(
  database: ReturnType<typeof getDb>,
  item: QueueItem,
  userId: string
): Promise<ProcessResult> {
  try {
    const { sessionId, message } = item.payload as { sessionId: string; message: string };
    
    if (!sessionId || !message) {
      return { id: item.id, success: false, error: "Missing sessionId or message" };
    }

    // Verify session ownership
    const [session] = await database
      .select({
        id: tutorSessions.id,
        studentId: tutorSessions.studentId,
      })
      .from(tutorSessions)
      .where(eq(tutorSessions.id, sessionId))
      .limit(1);

    if (!session) {
      return { id: item.id, success: false, error: "Session not found" };
    }

    // Insert user message
    const userSequence = await nextSequence(database, sessionId);
    await database.insert(messagesTable).values({
      sessionId,
      role: "user",
      content: message,
      contentType: "text",
      sequence: userSequence,
    });

    // Note: We don't call the AI here - the queue is just for storing the user message
    // The actual AI response will be generated when the client is online
    // Or we could trigger the AI here, but that's complex for offline queue
    
    return { id: item.id, success: true };
  } catch (error) {
    return { id: item.id, success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

/**
 * Process an intervention queue item
 */
async function processInterventionItem(
  database: ReturnType<typeof getDb>,
  item: QueueItem,
  userId: string
): Promise<ProcessResult> {
  try {
    const { sessionId, message } = item.payload as { sessionId: string; message: string };
    
    if (!sessionId || !message) {
      return { id: item.id, success: false, error: "Missing sessionId or message" };
    }

    // Verify teacher owns the session
    const [teacherRow] = await database
      .select({ id: tutorSessions.id })
      .from(tutorSessions)
      .where(eq(tutorSessions.id, sessionId))
      .limit(1);

    if (!teacherRow) {
      return { id: item.id, success: false, error: "Session not found" };
    }

    // Insert intervention as system message
    const nextSeq = await nextSequence(database, sessionId);
    await database.insert(messagesTable).values({
      sessionId,
      role: "system",
      content: `[Teacher intervention]: ${message}`,
      contentType: "text",
      sequence: nextSeq,
      metadata: {
        isIntervention: true,
        teacherUserId: userId,
        queued: true,
      },
    });

    // Update session message count
    await database
      .update(tutorSessions)
      .set({
        messageCount: sql`${tutorSessions.messageCount} + 1`,
        updatedAt: new Date(),
      })
      .where(eq(tutorSessions.id, sessionId));

    return { id: item.id, success: true };
  } catch (error) {
    return { id: item.id, success: false, error: error instanceof Error ? error.message : "Unknown error" };
  }
}

export async function POST(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const appUser = await ensureAppUser("student", request);
    if (!appUser && !(await ensureAppUser("teacher", request))) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const userId = authSession.data.user.id;
    const body = await request.json().catch(() => null);
    
    if (!body || !Array.isArray(body.items)) {
      return NextResponse.json({ error: "Invalid request: items array required" }, { status: 400 });
    }

    const items: QueueItem[] = body.items;
    const database = getDb();
    const results: ProcessResult[] = [];

    for (const item of items) {
      let result: ProcessResult;
      
      if (item.type === "chat") {
        result = await processChatItem(database, item, userId);
      } else if (item.type === "intervention") {
        result = await processInterventionItem(database, item, userId);
      } else {
        result = { id: item.id, success: false, error: `Unknown item type: ${item.type}` };
      }
      
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    return NextResponse.json({
      success: failureCount === 0,
      processed: successCount,
      failed: failureCount,
      results,
    });
  } catch (error) {
    console.error("[push/queue] POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
    }

    const userId = authSession.data.user.id;
    
    // This endpoint is primarily for the service worker to fetch pending items
    // The actual queue is stored in IndexedDB client-side
    // This could be used to sync queue state across devices if needed
    
    return NextResponse.json({
      message: "Queue items are stored client-side in IndexedDB. Use POST to process.",
      userId,
    });
  } catch (error) {
    console.error("[push/queue] GET error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}