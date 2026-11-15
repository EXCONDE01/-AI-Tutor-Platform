/**
 * AI Session Summarization + Misconception Detection Service
 * 
 * Uses OpenRouter free models for summarization and Neon AI Gateway for embeddings.
 * Detects misconceptions by analyzing student messages and storing embeddings
 * for similarity search against known misconception patterns.
 */

import { streamTutorText, resolveModelChain } from './openrouter';
import { generateEmbedding, getDefaultModel } from './embeddings';
import { getDb } from '@/lib/db';
import { studentLearningEmbeddings, type NewStudentLearningEmbedding } from '@/db/schema';
import type { ModelMessage } from 'ai';
import type { TutorConfig } from '@/db/schema';

export interface SessionSummaryData {
  summary: string;
  keyTopics: string[];
  learningProgress: Record<string, number>; // { objectiveId: progress 0-100 }
  misconceptions: Misconception[];
  strengths: Strength[];
  areasForImprovement: string[];
  engagementScore: number; // 1-100
  messageCount: number;
  durationSeconds: number;
  tokenUsage: { prompt: number; completion: number; total: number; cost: number };
}

export interface Misconception {
  text: string;
  topic: string;
  confidence: number; // 0-100
  relatedMessageIds: string[];
  evidence: string; // Excerpt from conversation showing the misconception
}

export interface Strength {
  text: string;
  topic: string;
  confidence: number;
  relatedMessageIds: string[];
  evidence: string;
}

/**
 * Generates a comprehensive session summary with misconception detection
 * using a single LLM call with a structured prompt.
 */
export async function generateSessionSummary(
  messages: ModelMessage[],
  config: TutorConfig | null
): Promise<SessionSummaryData> {
  const studentMessages = messages.filter(m => m.role === 'user');
  const assistantMessages = messages.filter(m => m.role === 'assistant');
  
  const conversationText = messages
    .map(m => `${m.role}: ${m.content}`)
    .join('\n\n');

  // Build system prompt for structured summarization
  const systemPrompt = buildSummarizationPrompt(config);

  // Use a free model for summarization
  const chain = resolveModelChain(null, false);
  const modelId = chain[0] ?? 'openrouter/free';

  // Create the summarization request
  const summarizationMessages: ModelMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Analyze this tutoring session and produce a structured summary:\n\n${conversationText}` }
  ];

  let fullResponse = '';
  try {
    for await (const delta of streamTutorText({
      messages: summarizationMessages,
      model: modelId,
      temperature: 0.2, // Low temperature for consistent structured output
      maxTokens: 2000,
    })) {
      fullResponse += delta;
    }
  } catch (error) {
    console.error('[summarize] LLM summarization failed:', error);
    throw new Error('Failed to generate session summary');
  }

  // Parse the structured response
  const parsed = parseSummaryResponse(fullResponse);
  
  // Calculate engagement score based on message patterns
  const engagementScore = calculateEngagementScore(studentMessages, assistantMessages);

  return {
    summary: parsed.summary,
    keyTopics: parsed.keyTopics,
    learningProgress: parsed.learningProgress,
    misconceptions: parsed.misconceptions,
    strengths: parsed.strengths,
    areasForImprovement: parsed.areasForImprovement,
    engagementScore,
    messageCount: messages.length,
    durationSeconds: 0, // Will be calculated by caller
    tokenUsage: { prompt: 0, completion: 0, total: 0, cost: 0 }, // Approximate
  };
}

/**
 * Builds the system prompt for session summarization with structured output requirements.
 */
function buildSummarizationPrompt(config: TutorConfig | null): string {
  const subject = config?.content?.curriculumAlignment?.[0] || 'general';
  const gradeLevel = config?.content?.difficultyRange?.max || 'appropriate';

  return `You are an expert educational analyst summarizing a tutoring session for a teacher.
Subject: ${subject}
Grade level: ${gradeLevel}

Produce a JSON object with EXACTLY these fields (no extra commentary, no markdown):

{
  "summary": "2-3 paragraph narrative summary of the session covering what was discussed, student's engagement, and overall progress",
  "keyTopics": ["topic1", "topic2", "topic3"], // 3-7 specific topics/concepts covered
  "learningProgress": { "objective1": 75, "objective2": 40 }, // Progress 0-100 per learning objective discussed
  "misconceptions": [
    {
      "text": "Brief description of the misconception",
      "topic": "Related topic/concept",
      "confidence": 85, // 0-100 confidence this is a genuine misconception
      "evidence": "Direct quote or paraphrase from student showing the misconception"
    }
  ],
  "strengths": [
    {
      "text": "Description of student strength",
      "topic": "Related topic/concept",
      "confidence": 90,
      "evidence": "Direct quote or paraphrase from student demonstrating strength"
    }
  ],
  "areasForImprovement": [
    "Specific actionable area 1",
    "Specific actionable area 2"
  ]
}

Guidelines:
- ONLY include misconceptions with confidence >= 70
- ONLY include strengths with confidence >= 70
- learningProgress keys should be specific learning objectives from the conversation
- Be specific and evidence-based; quote the student's own words
- If no clear misconceptions/strengths, return empty arrays
- Keep summary concise but informative for a teacher review`;
}

/**
 * Parses the LLM response into structured summary data.
 */
function parseSummaryResponse(response: string): Omit<SessionSummaryData, 'engagementScore' | 'messageCount' | 'durationSeconds' | 'tokenUsage'> {
  try {
    // Try to extract JSON from the response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON object found in response');
    }
    
    const parsed = JSON.parse(jsonMatch[0]);
    
    // Validate and sanitize
    return {
      summary: typeof parsed.summary === 'string' ? parsed.summary : 'Session completed.',
      keyTopics: Array.isArray(parsed.keyTopics) ? parsed.keyTopics.filter((t: unknown) => typeof t === 'string').slice(0, 10) : [],
      learningProgress: typeof parsed.learningProgress === 'object' && parsed.learningProgress !== null 
        ? Object.fromEntries(
            Object.entries(parsed.learningProgress)
              .filter(([, v]) => typeof v === 'number' && v >= 0 && v <= 100)
              .slice(0, 10)
          ) as Record<string, number>
        : {},
      misconceptions: Array.isArray(parsed.misconceptions) 
        ? parsed.misconceptions
            .filter((m: unknown) => 
              m && typeof m === 'object' && 
              typeof (m as any).text === 'string' &&
              typeof (m as any).topic === 'string' &&
              typeof (m as any).confidence === 'number' &&
              (m as any).confidence >= 70
            )
            .map((m: any) => ({
              text: m.text,
              topic: m.topic,
              confidence: Math.min(100, Math.max(0, m.confidence)),
              relatedMessageIds: [],
              evidence: m.evidence || ''
            }))
            .slice(0, 10)
        : [],
      strengths: Array.isArray(parsed.strengths)
        ? parsed.strengths
            .filter((s: unknown) =>
              s && typeof s === 'object' &&
              typeof (s as any).text === 'string' &&
              typeof (s as any).topic === 'string' &&
              typeof (s as any).confidence === 'number' &&
              (s as any).confidence >= 70
            )
            .map((s: any) => ({
              text: s.text,
              topic: s.topic,
              confidence: Math.min(100, Math.max(0, s.confidence)),
              relatedMessageIds: [],
              evidence: s.evidence || ''
            }))
            .slice(0, 10)
        : [],
      areasForImprovement: Array.isArray(parsed.areasForImprovement)
        ? parsed.areasForImprovement.filter((a: unknown) => typeof a === 'string').slice(0, 10)
        : [],
    };
  } catch (error) {
    console.error('[summarize] Failed to parse summary response:', error);
    // Return minimal fallback
    return {
      summary: 'Session completed. Summary generation encountered an error.',
      keyTopics: [],
      learningProgress: {},
      misconceptions: [],
      strengths: [],
      areasForImprovement: [],
    };
  }
}

/**
 * Calculates engagement score (1-100) based on message patterns.
 */
function calculateEngagementScore(
  studentMessages: ModelMessage[],
  assistantMessages: ModelMessage[]
): number {
  if (studentMessages.length === 0) return 0;
  
  let score = 50; // Base score
  
  // Factor 1: Message length (longer = more engagement)
  const avgStudentLength = studentMessages.reduce((sum, m) => {
    const content = typeof m.content === 'string' ? m.content : '';
    return sum + content.length;
  }, 0) / studentMessages.length;
  if (avgStudentLength > 100) score += 15;
  else if (avgStudentLength > 50) score += 10;
  else if (avgStudentLength > 20) score += 5;
  else score -= 10;
  
  // Factor 2: Question asking (questions = engagement)
  const questionCount = studentMessages.filter(m => {
    const content = typeof m.content === 'string' ? m.content : '';
    return content.includes('?');
  }).length;
  const questionRatio = questionCount / studentMessages.length;
  if (questionRatio > 0.3) score += 15;
  else if (questionRatio > 0.15) score += 10;
  else if (questionRatio > 0.05) score += 5;
  
  // Factor 3: Response consistency (no long gaps - simplified here)
  if (studentMessages.length > 5) score += 10;
  else if (studentMessages.length > 2) score += 5;
  
  // Factor 4: Positive indicators
  const positiveIndicators = ['understand', 'got it', 'makes sense', 'thanks', 'thank you', 'interesting', 'cool'];
  const positiveCount = studentMessages.filter(m => {
    const content = typeof m.content === 'string' ? m.content.toLowerCase() : '';
    return positiveIndicators.some(p => content.includes(p));
  }).length;
  if (positiveCount > 2) score += 10;
  else if (positiveCount > 0) score += 5;
  
  // Factor 5: Frustration indicators (negative)
  const frustrationIndicators = ["don't understand", 'confused', 'too hard', "give up", "stuck", "help", "lost", "frustrat"];
  const frustrationCount = studentMessages.filter(m => {
    const content = typeof m.content === 'string' ? m.content.toLowerCase() : '';
    return frustrationIndicators.some(f => content.includes(f));
  }).length;
  if (frustrationCount > 2) score -= 15;
  else if (frustrationCount > 0) score -= 5;
  
  return Math.max(1, Math.min(100, score));
}

/**
 * Detects misconceptions in student messages using LLM + embedding similarity.
 * Returns misconceptions found with confidence scores.
 */
export async function detectMisconceptions(
  messages: ModelMessage[],
  studentId: string,
  classId: string,
  sessionId: string
): Promise<Misconception[]> {
  const studentMessages = messages.filter(m => m.role === 'user');
  
  if (studentMessages.length === 0) return [];
  
  // Combine student messages for analysis
  const studentText = studentMessages
    .map(m => m.content)
    .join('\n\n');
  
  // First, use LLM to identify potential misconceptions
  const systemPrompt = `You are an expert at identifying student misconceptions in tutoring conversations.
Analyze the student's messages and identify specific misconceptions (incorrect understandings, false beliefs, conceptual errors).
Return ONLY a JSON array of misconceptions, each with:
- "text": brief description of the misconception
- "topic": the subject topic it relates to
- "confidence": 0-100 confidence this is a genuine misconception
- "evidence": direct quote from student showing the misconception

Only include misconceptions with confidence >= 70. Max 10 items.`;

  const chain = resolveModelChain(null, false);
  const modelId = chain[0] ?? 'openrouter/free';

  const analysisMessages: ModelMessage[] = [
    { role: 'system', content: systemPrompt },
    { role: 'user', content: `Student messages:\n\n${studentText}` }
  ];

  let fullResponse = '';
  try {
    for await (const delta of streamTutorText({
      messages: analysisMessages,
      model: modelId,
      temperature: 0.2,
      maxTokens: 1500,
    })) {
      fullResponse += delta;
    }
  } catch (error) {
    console.error('[summarize] Misconception detection failed:', error);
    return [];
  }

  // Parse misconceptions
  let misconceptions: Misconception[] = [];
  try {
    const jsonMatch = fullResponse.match(/\[[\s\S]*\]/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      misconceptions = parsed
        .filter((m: any) => 
          m && typeof m.text === 'string' &&
          typeof m.topic === 'string' &&
          typeof m.confidence === 'number' &&
          m.confidence >= 70 &&
          typeof m.evidence === 'string'
        )
        .map((m: any, idx: number) => ({
          text: m.text,
          topic: m.topic,
          confidence: Math.min(100, Math.max(0, m.confidence)),
          relatedMessageIds: [], // Could be enhanced to link to specific messages
          evidence: m.evidence,
        }))
        .slice(0, 10);
    }
  } catch (error) {
    console.error('[summarize] Failed to parse misconceptions:', error);
  }

  // Enhance with embedding similarity against known misconception patterns
  // This would query studentLearningEmbeddings for similar 'misconception' embeddings
  // For now, we'll store the new misconceptions as embeddings for future similarity matching

  return misconceptions;
}

/**
 * Stores a misconception embedding for future similarity detection.
 */
export async function storeMisconceptionEmbedding(
  studentId: string,
  classId: string,
  sessionId: string,
  misconceptionText: string,
  topic: string,
  confidence: number,
  relatedMessageIds: string[] = []
): Promise<void> {
  const database = getDb();
  
  try {
    // Generate embedding for the misconception text
    const embedding = await generateEmbedding(misconceptionText, getDefaultModel());
    
    const record: NewStudentLearningEmbedding = {
      studentId,
      classId,
      sessionId,
      embedding,
      modelProvider: 'neon',
      modelName: getDefaultModel().split(':')[1] || 'bge-base',
      dimensions: embedding.length,
      embeddingType: 'misconception',
      sourceText: misconceptionText,
      relatedMessageIds,
      relatedInterventionIds: [],
      topic,
      difficultyLevel: null,
      confidenceScore: confidence,
      metadata: { detectedAt: new Date().toISOString() },
    };
    
    await database.insert(studentLearningEmbeddings).values(record);
  } catch (error) {
    console.error('[summarize] Failed to store misconception embedding:', error);
    // Don't throw - this is supplemental
  }
}

/**
 * Stores a strength embedding for future reference.
 */
export async function storeStrengthEmbedding(
  studentId: string,
  classId: string,
  sessionId: string,
  strengthText: string,
  topic: string,
  confidence: number,
  relatedMessageIds: string[] = []
): Promise<void> {
  const database = getDb();
  
  try {
    const embedding = await generateEmbedding(strengthText, getDefaultModel());
    
    const record: NewStudentLearningEmbedding = {
      studentId,
      classId,
      sessionId,
      embedding,
      modelProvider: 'neon',
      modelName: getDefaultModel().split(':')[1] || 'bge-base',
      dimensions: embedding.length,
      embeddingType: 'strength',
      sourceText: strengthText,
      relatedMessageIds,
      relatedInterventionIds: [],
      topic,
      difficultyLevel: null,
      confidenceScore: confidence,
      metadata: { detectedAt: new Date().toISOString() },
    };
    
    await database.insert(studentLearningEmbeddings).values(record);
  } catch (error) {
    console.error('[summarize] Failed to store strength embedding:', error);
  }
}

/**
 * Stores multiple misconception and strength embeddings from a session summary.
 */
export async function storeSessionLearningEmbeddings(
  studentId: string,
  classId: string,
  sessionId: string,
  summaryData: SessionSummaryData
): Promise<void> {
  // Store misconception embeddings
  for (const misconception of summaryData.misconceptions) {
    await storeMisconceptionEmbedding(
      studentId,
      classId,
      sessionId,
      misconception.text,
      misconception.topic,
      misconception.confidence,
      misconception.relatedMessageIds
    );
  }
  
  // Store strength embeddings
  for (const strength of summaryData.strengths) {
    await storeStrengthEmbedding(
      studentId,
      classId,
      sessionId,
      strength.text,
      strength.topic,
      strength.confidence,
      strength.relatedMessageIds
    );
  }
}