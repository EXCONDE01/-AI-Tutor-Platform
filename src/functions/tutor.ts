/**
 * Tutor Agent Function - Neon Serverless Function
 * 
 * This function runs on Neon compute and handles AI tutor operations.
 * It has direct access to the database via DATABASE_URL.
 * 
 * Deployed via: neonctl functions deploy tutor --source src/functions/tutor.ts
 * 
 * @see https://neon.tech/docs/guides/neon-functions
 */

import { neon } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-http';
import { eq, and, desc, sql } from 'drizzle-orm';
import * as schema from '../../db/schema';

// Types
interface TutorRequest {
  action:
    | 'chat'
    | 'intervene'
    | 'summarize'
    | 'generate_artifact'
    | 'export';
  sessionId: string;
  teacherId?: string;
  studentId?: string;
  message?: string;
  context?: Record<string, unknown>;
  stream?: boolean;
}

interface TutorResponse {
  success: boolean;
  data?: unknown;
  error?: string;
  streaming?: boolean;
}

// OpenRouter client for LLM calls
class OpenRouterClient {
  private apiKey: string;
  private baseUrl = 'https://openrouter.ai/api/v1';
  private defaultModel: string;

  constructor(apiKey: string, defaultModel = 'anthropic/claude-3.5-sonnet') {
    this.apiKey = apiKey;
    this.defaultModel = defaultModel;
  }

  async chatCompletion(messages: Array<{ role: string; content: string }>, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    stream?: boolean;
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
        max_tokens: options?.maxTokens ?? 2000,
        stream: options?.stream ?? false,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${error}`);
    }

    return response.json();
  }

  async *streamChatCompletion(messages: Array<{ role: string; content: string }>, options?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
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
        max_tokens: options?.maxTokens ?? 2000,
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
            yield JSON.parse(data);
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

// Import export tools
import { exportTools, type ExportToolNames } from './tools/export-tools';

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

// Main tutor handler
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
    const body: TutorRequest = await request.json();
    const db = getDb();
    const openrouter = new OpenRouterClient(
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

    // Check if streaming is requested for chat action
    const wantsStream = body.action === 'chat' && body.stream === true;
    const acceptHeader = request.headers.get('accept') || '';
    const prefersSSE = wantsStream || acceptHeader.includes('text/event-stream');

    if (prefersSSE && body.action === 'chat') {
      return handleChatStreaming(db, openrouter, session, body, corsHeaders);
    }

    // Non-streaming responses
    let result: TutorResponse;

    switch (body.action) {
      case 'chat':
        result = await handleChat(db, openrouter, session, body);
        break;
      case 'intervene':
        result = await handleIntervene(db, openrouter, session, body);
        break;
      case 'summarize':
        result = await handleSummarize(db, openrouter, session, body);
        break;
      case 'generate_artifact':
        result = await handleGenerateArtifact(db, openrouter, session, body);
        break;
      case 'export':
        result = await handleExport(db, body);
        break;
      default:
        result = { success: false, error: `Unknown action: ${body.action}` };
    }

    return new Response(JSON.stringify(result), {
      status: result.success ? 200 : 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Tutor function error:', error);
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
async function handleChatStreaming(
  db: ReturnType<typeof getDb>,
  openrouter: OpenRouterClient,
  session: typeof schema.tutorSessions.$inferSelect & { 
    student: typeof schema.students.$inferSelect & { user: typeof schema.users.$inferSelect };
    class: typeof schema.classes.$inferSelect;
    tutorConfig: typeof schema.tutorConfigs.$inferSelect | null;
  },
  body: TutorRequest,
  corsHeaders: Record<string, string>
): Promise<Response> {
  if (!body.message) {
    return new Response(
      'data: {"error": "Message required for chat"}\n\n',
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } }
    );
  }

  // Get recent messages for context
  const recentMessages = await db.query.messages.findMany({
    where: eq(schema.messages.sessionId, session.id),
    orderBy: [desc(schema.messages.createdAt)],
    limit: 10,
  });

  // Build system prompt based on tutor config
  const systemPrompt = buildSystemPrompt(session);

  // Prepare messages for LLM
  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.reverse().map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: body.message },
  ];

  // Persist user message first
  await db.insert(schema.messages).values({
    sessionId: session.id,
    role: 'user',
    content: body.message,
    contentType: 'text',
    sequence: recentMessages.length,
    metadata: {},
  });

  const encoder = new TextEncoder();
  let fullResponse = '';
  let needsIntervention = false;

  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        // Send initial event with session info
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start', sessionId: session.id })}\n\n`));

        for await (const chunk of openrouter.streamChatCompletion(messages, {
          temperature: 0.7,
          maxTokens: 1500,
        })) {
          const delta = chunk.choices?.[0]?.delta?.content;
          if (delta) {
            fullResponse += delta;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'delta', content: delta })}\n\n`));
          }
        }

        // Check for intervention after full response
        needsIntervention = checkForIntervention(fullResponse, body.message!);
        
        if (needsIntervention) {
          await createIntervention(db, session, body.message!, fullResponse);
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
            tokens: 0, // Would need to track from streaming
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

// Handle chat messages from students (non-streaming)
async function handleChat(
  db: ReturnType<typeof getDb>,
  openrouter: OpenRouterClient,
  session: typeof schema.tutorSessions.$inferSelect & { 
    student: typeof schema.students.$inferSelect & { user: typeof schema.users.$inferSelect };
    class: typeof schema.classes.$inferSelect;
    tutorConfig: typeof schema.tutorConfigs.$inferSelect | null;
  },
  body: TutorRequest
): Promise<TutorResponse> {
  if (!body.message) {
    return { success: false, error: 'Message required for chat' };
  }

  // Get recent messages for context
  const recentMessages = await db.query.messages.findMany({
    where: eq(schema.messages.sessionId, session.id),
    orderBy: [desc(schema.messages.createdAt)],
    limit: 10,
  });

  // Build system prompt based on tutor config
  const systemPrompt = buildSystemPrompt(session);

  // Prepare messages for LLM
  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.reverse().map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: body.message },
  ];

  // Call LLM
  const completion = await openrouter.chatCompletion(messages, {
    temperature: 0.7,
    maxTokens: 1500,
  });

  const assistantMessage = completion.choices[0]?.message?.content || '';

  // Save message to database
  await db.insert(schema.messages).values({
    sessionId: session.id,
    role: 'assistant',
    content: assistantMessage,
    contentType: 'text',
    sequence: recentMessages.length,
    metadata: {
      model: completion.model,
      tokens: completion.usage?.total_tokens,
    },
  });

  // Check if intervention needed (simple heuristic)
  const needsIntervention = checkForIntervention(assistantMessage, body.message);
  
  if (needsIntervention) {
    await createIntervention(db, session, body.message, assistantMessage);
  }

  return {
    success: true,
    data: {
      message: assistantMessage,
      needsIntervention,
      sessionState: needsIntervention ? 'intervention_needed' : 'active',
    },
  };
}

// Handle teacher intervention requests
async function handleIntervene(
  db: ReturnType<typeof getDb>,
  openrouter: OpenRouterClient,
  session: typeof schema.tutorSessions.$inferSelect & { 
    student: typeof schema.students.$inferSelect & { user: typeof schema.users.$inferSelect };
    class: typeof schema.classes.$inferSelect;
    tutorConfig: typeof schema.tutorConfigs.$inferSelect | null;
  },
  body: TutorRequest
): Promise<TutorResponse> {
  if (!body.message || !body.teacherId) {
    return { success: false, error: 'Teacher message and ID required for intervention' };
  }

  // Create intervention record - use 'pending' status as per schema
  const [intervention] = await db.insert(schema.interventions).values({
    sessionId: session.id,
    studentId: session.studentId,
    classId: session.classId,
    teacherId: body.teacherId,
    type: 'custom',
    severity: 'high',
    status: 'pending',
    title: 'Teacher Intervention',
    description: body.message,
    evidence: { teacherMessage: body.message },
    suggestedActions: ['notify_teacher'],
  }).returning();

  // Get context for teacher's response
  const recentMessages = await db.query.messages.findMany({
    where: eq(schema.messages.sessionId, session.id),
    orderBy: [desc(schema.messages.createdAt)],
    limit: 5,
  });

  const systemPrompt = `You are an AI tutor assisting a teacher who is intervening in a student session.
The teacher has sent: "${body.message}"

Provide a helpful response that the teacher can use to guide the student.
Be concise and actionable.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    ...recentMessages.reverse().map(m => ({
      role: m.role === 'user' ? 'user' : 'assistant',
      content: m.content,
    })),
    { role: 'user', content: `Teacher intervention: ${body.message}` },
  ];

  const completion = await openrouter.chatCompletion(messages, {
    temperature: 0.5,
    maxTokens: 1000,
  });

  const response = completion.choices[0]?.message?.content || '';

  // Save intervention action
  await db.insert(schema.interventionActions).values({
    interventionId: intervention.id,
    action: 'notify_teacher',
    description: `Teacher intervention: ${body.message}`,
    performedBy: body.teacherId,
    result: response,
  });

  return {
    success: true,
    data: {
      interventionId: intervention.id,
      guidance: response,
    },
  };
}

// Handle session summarization
async function handleSummarize(
  db: ReturnType<typeof getDb>,
  openrouter: OpenRouterClient,
  session: typeof schema.tutorSessions.$inferSelect & { 
    student: typeof schema.students.$inferSelect & { user: typeof schema.users.$inferSelect };
    class: typeof schema.classes.$inferSelect;
    tutorConfig: typeof schema.tutorConfigs.$inferSelect | null;
  },
  body: TutorRequest
): Promise<TutorResponse> {
  // Get all messages for the session
  const allMessages = await db.query.messages.findMany({
    where: eq(schema.messages.sessionId, session.id),
    orderBy: [schema.messages.createdAt],
  });

  if (allMessages.length === 0) {
    return { success: false, error: 'No messages to summarize' };
  }

  const conversation = allMessages.map(m => `${m.role}: ${m.content}`).join('\n\n');

  const systemPrompt = `Summarize this tutoring session for the teacher.
Include: key concepts covered, student progress, struggles identified, and recommendations.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: conversation },
  ];

  const completion = await openrouter.chatCompletion(messages, {
    temperature: 0.3,
    maxTokens: 1500,
  });

  const summary = completion.choices[0]?.message?.content || '';

  // Save summary - align with actual schema
  await db.insert(schema.sessionSummaries).values({
    sessionId: session.id,
    studentId: session.studentId,
    classId: session.classId,
    summary,
    keyTopics: extractKeyConcepts(summary),
    learningProgress: {},
    misconceptions: extractStruggles(summary),
    strengths: [],
    areasForImprovement: extractRecommendations(summary),
    engagementScore: 50,
    messageCount: allMessages.length,
    durationSeconds: Math.round((Date.now() - new Date(session.createdAt).getTime()) / 1000),
    tokenUsage: { total: completion.usage?.total_tokens || 0 },
  });

  return {
    success: true,
    data: { summary },
  };
}

// Handle artifact generation (lesson plans, quizzes, etc.)
async function handleGenerateArtifact(
  db: ReturnType<typeof getDb>,
  openrouter: OpenRouterClient,
  session: typeof schema.tutorSessions.$inferSelect & { 
    student: typeof schema.students.$inferSelect & { user: typeof schema.users.$inferSelect };
    class: typeof schema.classes.$inferSelect;
    tutorConfig: typeof schema.tutorConfigs.$inferSelect | null;
  },
  body: TutorRequest
): Promise<TutorResponse> {
  const artifactType = body.context?.artifactType as string || 'lesson_plan';
  const topic = body.context?.topic as string || 'session topic';

  const systemPrompt = `Generate a ${artifactType} for the topic: "${topic}".
Based on the student's grade level and learning style.
Format as structured JSON.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Create a ${artifactType} for: ${topic}` },
  ];

  const completion = await openrouter.chatCompletion(messages, {
    temperature: 0.6,
    maxTokens: 2000,
  });

  const content = completion.choices[0]?.message?.content || '';

  // Save artifact - use valid artifact type from schema
  const validArtifactType = ['lesson_plan', 'worksheet', 'quiz', 'assessment', 'rubric', 'study_guide', 'flashcards', 'summary', 'report', 'presentation', 'code', 'diagram', 'custom'].includes(artifactType) 
    ? artifactType 
    : 'custom';
  
  const [artifact] = await db.insert(schema.generatedArtifacts).values({
    studentId: session.studentId,
    classId: session.classId,
    teacherId: body.teacherId || session.class.teacherId,
    type: validArtifactType as any,
    title: `${validArtifactType}: ${topic}`,
    content: { raw: content },
    generatedBy: 'ai',
    status: 'draft',
    version: 1,
  }).returning();

  return {
    success: true,
    data: {
      artifactId: artifact.id,
      type: validArtifactType,
      title: artifact.title,
      content,
    },
  };
}

// Handle export tools (Google Workspace)
async function handleExport(
  db: ReturnType<typeof getDb>,
  body: TutorRequest
): Promise<TutorResponse> {
  if (!body.teacherId) {
    return { success: false, error: 'Teacher ID required for export' };
  }

  const toolName = body.context?.tool as string;
  const toolArgs = body.context?.args as Record<string, unknown> || {};

  if (!toolName || !exportTools[toolName as ExportToolNames]) {
    return { success: false, error: `Unknown export tool: ${toolName}` };
  }

  try {
    const tool = exportTools[toolName as ExportToolNames];
    const context = { userId: body.teacherId, db: db as any };
    // Cast to any to handle different tool argument types
    const result = await tool.execute(toolArgs as any, context);

    return { success: true, data: result };
  } catch (error) {
    console.error(`[Tutor] Export tool ${toolName} failed:`, error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Export failed',
    };
  }
}

// Helper functions

function checkForIntervention(assistantMessage: string, userMessage: string): boolean {
  // Simple heuristic - in production, use a more sophisticated approach
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

function extractKeyConcepts(summary: string): string[] {
  const concepts: string[] = [];
  const lines = summary.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('concept') || line.toLowerCase().includes('topic')) {
      concepts.push(line.replace(/^[-*]\s*/, '').trim());
    }
  }
  return concepts.slice(0, 10);
}

function extractStruggles(summary: string): string[] {
  const struggles: string[] = [];
  const lines = summary.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('struggle') || line.toLowerCase().includes('difficult') || line.toLowerCase().includes('challenge')) {
      struggles.push(line.replace(/^[-*]\s*/, '').trim());
    }
  }
  return struggles.slice(0, 10);
}

function extractRecommendations(summary: string): string[] {
  const recommendations: string[] = [];
  const lines = summary.split('\n');
  for (const line of lines) {
    if (line.toLowerCase().includes('recommend') || line.toLowerCase().includes('suggest') || line.toLowerCase().includes('next step')) {
      recommendations.push(line.replace(/^[-*]\s*/, '').trim());
    }
  }
  return recommendations.slice(0, 10);
}