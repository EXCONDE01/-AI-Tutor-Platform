/**
 * Content Filter for Tutor Chat
 * Pre-message filter using gpt-4o-mini via OpenRouter free tier
 * Checks for: PII, inappropriate content, cheating, FERPA/COPPA violations
 */

import { streamText, type ModelMessage } from 'ai';
import { createOpenRouterProvider, isFreeModel } from '@/lib/ai/openrouter';

export interface ContentFilterResult {
  allowed: boolean;
  reason?: string;
  filteredMessage?: string;
  categories?: string[];
}

interface FilterCategory {
  name: string;
  description: string;
  severity: 'block' | 'warn' | 'log';
}

const FILTER_CATEGORIES: FilterCategory[] = [
  {
    name: 'pii',
    description: 'Personally Identifiable Information (SSN, phone, address, email, student ID, DOB)',
    severity: 'block',
  },
  {
    name: 'inappropriate',
    description: 'Profanity, sexual content, violence, hate speech, harassment, bullying',
    severity: 'block',
  },
  {
    name: 'cheating',
    description: 'Requests for direct answers, essay writing, homework completion, test answers',
    severity: 'block',
  },
  {
    name: 'ferpa_violation',
    description: 'Requests for other students\' grades, records, directory info without consent',
    severity: 'block',
  },
  {
    name: 'coppa_violation',
    description: 'Requests that would collect data from children under 13 without parental consent',
    severity: 'block',
  },
  {
    name: 'self_harm',
    description: 'Expressions of self-harm, suicide ideation, eating disorders',
    severity: 'block',
  },
  {
    name: 'violence_threat',
    description: 'Threats of violence, weapons, harm to others',
    severity: 'block',
  },
  {
    name: 'illegal_activity',
    description: 'Drugs, alcohol, illegal acts, criminal planning',
    severity: 'block',
  },
];

const SYSTEM_PROMPT = `You are a content safety filter for an educational AI tutor platform (K-12).
Analyze the student's message and determine if it violates any safety policies.

CHECK FOR THESE CATEGORIES:
${FILTER_CATEGORIES.map(c => `- ${c.name}: ${c.description} (${c.severity})`).join('\n')}

RESPOND WITH VALID JSON ONLY:
{
  "allowed": boolean,
  "reason": "string explaining the violation (empty if allowed)",
  "filteredMessage": "sanitized version if minor issue, otherwise original",
  "categories": ["array", "of", "violated", "categories"]
}

RULES:
- Block PII: SSN, phone numbers, addresses, emails, student IDs, DOB, full names + location
- Block inappropriate: profanity, sexual content, violence, hate, harassment, bullying
- Block cheating: "write my essay", "give me the answer", "solve this for me", "do my homework"
- Block FERPA: asking for other students' grades, records, schedules, directory info
- Block COPPA: attempts to share personal data of children under 13
- Allow: academic questions, learning requests, clarification, practice problems
- Allow: "help me understand", "explain this concept", "give me a hint", "practice more"
- If message is safe but has minor issues (e.g., accidental PII), provide filteredMessage
- If blocked, filteredMessage should be empty string`;

const FALLBACK_MODEL = 'openrouter/free';

async function callFilterModel(message: string): Promise<ContentFilterResult> {
  const provider = createOpenRouterProvider();
  
  const messages: ModelMessage[] = [
    { role: 'user', content: message },
  ];

  try {
    const result = streamText({
      model: provider(FALLBACK_MODEL),
      system: SYSTEM_PROMPT,
      messages,
      temperature: 0.1,
      maxOutputTokens: 500,
      maxRetries: 1,
    });

    let fullText = '';
    for await (const delta of result.textStream) {
      if (delta) fullText += delta;
    }

    // Parse JSON response
    const parsed = JSON.parse(fullText.trim());
    
    return {
      allowed: Boolean(parsed.allowed),
      reason: parsed.reason || undefined,
      filteredMessage: parsed.filteredMessage,
      categories: Array.isArray(parsed.categories) ? parsed.categories : [],
    };
  } catch (error) {
    console.error('[ContentFilter] Model call failed:', error);
    // Fail-open for availability, but log the error
    return {
      allowed: true,
      reason: 'Content filter unavailable - fail open',
      filteredMessage: message,
      categories: ['filter_error'],
    };
  }
}

export async function filterMessage(
  message: string,
  context?: { studentId?: string; userId?: string; sessionId?: string }
): Promise<ContentFilterResult> {
  // Quick local checks before calling LLM (performance)
  const localResult = quickLocalFilter(message);
  if (localResult && !localResult.allowed) {
    return localResult;
  }

  // Call LLM for nuanced checks
  return callFilterModel(message);
}

function quickLocalFilter(message: string): ContentFilterResult | null {
  const lower = message.toLowerCase();
  
  // Obvious PII patterns
  const piiPatterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{10}\b/, // Phone number (10 digits)
    /\b\d{3}[-.]?\d{3}[-.]?\d{4}\b/, // Phone with formatting
    /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email
    /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/, // DOB
    /\b\d{5}(-\d{4})?\b/, // ZIP code
  ];

  for (const pattern of piiPatterns) {
    if (pattern.test(message)) {
      return {
        allowed: false,
        reason: 'Message contains personally identifiable information (PII)',
        filteredMessage: '',
        categories: ['pii'],
      };
    }
  }

  // Obvious cheating phrases
  const cheatingPhrases = [
    'write my essay',
    'do my homework',
    'give me the answer',
    'solve this for me',
    'complete this assignment',
    'write the code for me',
    'give me the solution',
    'just tell me the answer',
  ];

  for (const phrase of cheatingPhrases) {
    if (lower.includes(phrase)) {
      return {
        allowed: false,
        reason: 'Request appears to be asking for direct answers rather than learning guidance',
        filteredMessage: '',
        categories: ['cheating'],
      };
    }
  }

  // Self-harm keywords (immediate block)
  const selfHarmKeywords = [
    'kill myself',
    'suicide',
    'end my life',
    'hurt myself',
    'self harm',
    'cutting myself',
  ];

  for (const keyword of selfHarmKeywords) {
    if (lower.includes(keyword)) {
      return {
        allowed: false,
        reason: 'Message indicates potential self-harm risk. Please contact a trusted adult or crisis line immediately.',
        filteredMessage: '',
        categories: ['self_harm'],
      };
    }
  }

  return null; // No obvious local violations
}

export function createFilterAuditLog(
  result: ContentFilterResult,
  message: string,
  context: { studentId?: string; userId?: string; sessionId?: string }
) {
  return {
    action: result.allowed ? 'content_filter_pass' : 'content_filter_block' as const,
    resourceType: 'message' as const,
    resourceId: context.sessionId,
    userId: context.userId,
    studentId: context.studentId,
    severity: result.allowed ? 'info' : 'warning' as const,
    description: result.allowed 
      ? 'Content filter passed' 
      : `Content filter blocked: ${result.reason}`,
    metadata: {
      complianceAction: result.allowed ? 'content_filter_pass' : 'content_filter_block',
      originalMessageLength: message.length,
      filteredMessageLength: result.filteredMessage?.length ?? 0,
      categories: result.categories,
      filterReason: result.reason,
    },
  };
}