/**
 * Streaming Chat Function - Neon Serverless Function
 * 
 * Dedicated function for streaming chat responses via SSE.
 * Separated from tutor.ts for better separation of concerns and scalability.
 * 
 * Deployed via: neonctl functions deploy chat --source src/functions/chat.ts
 * 
 * @see https://neon.tech/docs/guides/neon-functions
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, desc, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';

// Types
interface ChatRequest {
  action: 'chat';
  sessionId: string;
  studentId?: string;
  message: string;
  images?: string[];
  stream?: boolean;
}

interface ChatResponse {
  success: boolean;
  data?: unknown;
  error?: string;
}

// OpenRouter client using AI SDK approach (matching src/lib/ai/openrouter.ts)
class StreamingOpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = 'nvidia/nemotron-3-ultra-550b-a55b:free') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async *streamChatCompletion(messages: Array<{ role: string; content: string | Array<{ type: string; text?: string; image?: string }> }>, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    hasImages?: boolean;
  }) {
    const response = await fetch(`${this.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://ai-tutor.com',
        'X-Title': 'AI Tutor Platform',
      },
      body: JSON.stringify({
        model: options?.model || this.defaultModel,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 1500,
        stream: true,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error('No response body');
    }

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') return;
          try {
            const parsed = JSON.parse(data);
            const delta = parsed.choices?.[0]?.delta?.content;
            if (delta) {
              yield delta;
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  }
}

// Database helper
function getDb() {
  const sql = neon(process.env.DATABASE_URL!);
  return drizzle(sql, { schema });
}

// Build system prompt helper
function buildSystemPrompt(session: typeof schema.tutorSessions.$inferSelect & { 
  student: typeof schema.students.$inferSelect & { user: typeof schema.users.$inferSelect };
  class: typeof schema.classes.$inferSelect;
  tutorConfig: typeof schema.tutorConfigs.$inferSelect | null;
}): string {
  const config = session.tutorConfig;
  const student = session.student;
  const classInfo = session.class;
  const tutorConfig = config?.config as any;

  return `You are an AI tutor for ${student.user.firstName} ${student.user.lastName} in ${classInfo.name}.
Grade level: ${student.gradeLevel || classInfo.gradeLevel || 'unknown'}
Subject: ${classInfo.subject || 'general'}
Learning style: ${tutorConfig?.pedagogy?.questionStyle || 'adaptive'}
Difficulty: ${tutorConfig?.content?.difficultyRange?.max || 'medium'}

${tutorConfig?.systemPrompt?.base || ''}

Guidelines:
- Be encouraging and supportive
- Adapt to the student's level
- Ask guiding questions rather than giving answers
- Identify misconceptions gently
- Keep responses concise (2-3 paragraphs max)
- Use examples relevant to the student's interests
`;
}

function checkForIntervention(userMessage: string): boolean {
  const interventionTriggers = [
    'i don\'t understand',
    'this is too hard',
    'i give up',
    'i\'m confused',
    'i don\'t know',
    'help me',
    'i\'m stuck',
  ];

  const lowerUser = userMessage.toLowerCase();
  return interventionTriggers.some(trigger => lowerUser.includes(trigger));
}

async function createIntervention(
  db: ReturnType<typeof getDb>,
  session: typeof schema.tutorSessions.$inferSelect & { 
    student: typeof schema.students.$inferSelect & { user: typeof schema.users.$inferSelect };
    class: typeof schema.classes.$inferSelect;
    tutorConfig: typeof schema.tutorConfigs.$inferSelect | null;
  },
  userMessage: string,
  assistantMessage: string
) {
  await db.insert(schema.interventions).values({
    sessionId: session.id,
    studentId: session.studentId,
    classId: session.classId,
    teacherId: session.class.teacherId,
    type: 'frustration',
    severity: 'medium',
    status: 'pending',
    title: 'Student Struggle Detected',
    description: 'Student expressed difficulty or frustration',
    evidence: { userMessage, assistantMessage },
    suggestedActions: ['provide_hint', 'review_prerequisites'],
  });
}

// Main handler - exports for Neon Functions
export const handler = async (request: Request): Promise<Response> => {
  // CORS headers
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization, Accept',
  };

  // Handle preflight
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body: ChatRequest = await request.json();
    const db = getDb();
    const openrouter = new StreamingOpenRouterClient(
      process.env.OPENROUTER_API_KEY!,
      process.env.OPENROUTER_DEFAULT_MODEL
    );

    // Verify session exists and get context
    const session = await db.query.tutorSessions.findFirst({
      where: eq(schema.tutorSessions.id, body.sessionId),
      with: {
        student: {
          with: {
            user: true,
          },
        },
        class: true,
        tutorConfig: true,
      },
    });

    if (!session) {
      return new Response(JSON.stringify({ error: 'Session not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!body.message) {
      return new Response(JSON.stringify({ error: 'Message required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if streaming is requested
    const wantsStream = body.stream === true;
    const acceptHeader = request.headers.get('accept') || '';
    const prefersSSE = wantsStream || acceptHeader.includes('text/event-stream');

    if (prefersSSE) {
      return handleStreamingChat(db, openrouter, session, body, corsHeaders);
    }

    // Non-streaming fallback
    return handleNonStreamingChat(db, openrouter, session, body, corsHeaders);
  } catch (error) {
    console.error('Chat function error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Internal server error',
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

// Streaming chat handler using SSE
async function handleStreamingChat(
  db: ReturnType<typeof getDb>,
  openrouter: StreamingOpenRouterClient,
  session: typeof schema.tutorSessions.$inferSelect & { 
    student: typeof schema.students.$inferSelect & { user: typeof schema.users.$inferSelect };
    class: typeof schema.classes.$inferSelect;
    tutorConfig: typeof schema.tutorConfigs.$inferSelect | null;
  },
  body: ChatRequest,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Get recent messages for context
  const recentMessages = await db.query.messages.findMany({
    where: eq(schema.messages.sessionId, session.id),
    orderBy: [desc(schema.messages.createdAt)],
    limit: 10,
  });

  // Build system prompt
  const systemPrompt = buildSystemPrompt(session);

  // Prepare messages for LLM - handle images if provided
  const historyMessages = recentMessages.reverse().map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  // Build user message with images if present
  let userMessage: string | Array<{ type: string; text?: string; image?: string }> = body.message;
  if (body.images && body.images.length > 0) {
    userMessage = [
      { type: 'text', text: body.message },
      ...body.images.map(url => ({ type: 'image', image: url })),
    ];
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: userMessage },
  ];

  // Persist user message first
  await db.insert(schema.messages).values({
    sessionId: session.id,
    role: 'user',
    content: body.message,
    contentType: body.images && body.images.length > 0 ? 'multimodal' : 'text',
    sequence: recentMessages.length,
    metadata: body.images?.length ? { images: body.images } : {},
  });

  const encoder = new TextEncoder();
  let fullResponse = '';

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Send initial event with session info
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', sessionId: session.id })}\n\n`));

        for await (const delta of openrouter.streamChatCompletion(messages, {
          temperature: 0.7,
          maxTokens: 1500,
          hasImages: !!(body.images && body.images.length > 0),
        })) {
          fullResponse += delta;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`));
        }

        // Check for intervention after full response
        const needsIntervention = checkForIntervention(body.message);
        
        if (needsIntervention) {
          await createIntervention(db, session, body.message, fullResponse);
        }

        // Save assistant message to database
        await db.insert(schema.messages).values({
          sessionId: session.id,
          role: 'assistant',
          content: fullResponse,
          contentType: 'text',
          sequence: recentMessages.length + 1,
          metadata: {
            model: 'streaming',
            tokens: 0,
          },
        });

        // Send completion event
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'complete', 
          needsIntervention,
          sessionState: needsIntervention ? 'intervention_needed' : 'active',
          message: fullResponse,
        })}\n\n`));
        
        controller.close();
      } catch (error) {
        console.error('Streaming error:', error);
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
          type: 'error', 
          error: error instanceof Error ? error.message : 'Streaming failed',
        })}\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// Non-streaming fallback
async function handleNonStreamingChat(
  db: ReturnType<typeof getDb>,
  openrouter: StreamingOpenRouterClient,
  session: typeof schema.tutorSessions.$inferSelect & { 
    student: typeof schema.students.$inferSelect & { user: typeof schema.users.$inferSelect };
    class: typeof schema.classes.$inferSelect;
    tutorConfig: typeof schema.tutorConfigs.$inferSelect | null;
  },
  body: ChatRequest,
  corsHeaders: Record<string, string>
): Promise<Response> {
  // Get recent messages for context
  const recentMessages = await db.query.messages.findMany({
    where: eq(schema.messages.sessionId, session.id),
    orderBy: [desc(schema.messages.createdAt)],
    limit: 10,
  });

  // Build system prompt
  const systemPrompt = buildSystemPrompt(session);

  // Prepare messages
  const historyMessages = recentMessages.reverse().map(m => ({
    role: m.role === 'user' ? 'user' : 'assistant',
    content: m.content,
  }));

  let userMessage: string | Array<{ type: string; text?: string; image?: string }> = body.message;
  if (body.images && body.images.length > 0) {
    userMessage = [
      { type: 'text', text: body.message },
      ...body.images.map(url => ({ type: 'image', image: url })),
    ];
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    ...historyMessages,
    { role: 'user', content: userMessage },
  ];

  // Collect full response from stream
  let fullResponse = '';
  for await (const delta of openrouter.streamChatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 1500,
    hasImages: !!(body.images && body.images.length > 0),
  })) {
    fullResponse += delta;
  }

  // Check for intervention
  const needsIntervention = checkForIntervention(body.message);
  
  if (needsIntervention) {
    await createIntervention(db, session, body.message, fullResponse);
  }

  // Save messages
  await db.insert(schema.messages).values([
    {
      sessionId: session.id,
      role: 'user',
      content: body.message,
      contentType: body.images && body.images.length > 0 ? 'multimodal' : 'text',
      sequence: recentMessages.length,
      metadata: body.images?.length ? { images: body.images } : {},
    },
    {
      sessionId: session.id,
      role: 'assistant',
      content: fullResponse,
      contentType: 'text',
      sequence: recentMessages.length + 1,
      metadata: { model: 'streaming', tokens: 0 },
    },
  ]);

  return new Response(JSON.stringify({
    success: true,
    data: {
      message: fullResponse,
      needsIntervention,
      sessionState: needsIntervention ? 'intervention_needed' : 'active',
    },
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}