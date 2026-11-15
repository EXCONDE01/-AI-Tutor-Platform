/**
 * OpenRouter client utilities.
 *
 * IMPORTANT: this project is restricted to FREE models only.
 * Any model id that is not `openrouter/free` and does not end in `:free`
 * is rejected before it can ever reach the provider.
 */

import { streamText, type ModelMessage } from 'ai';
import { createOpenRouter, type OpenRouterProvider } from '@openrouter/ai-sdk-provider';

/**
 * Free models verified against the live OpenRouter API, in preference order.
 * The auto-router is included as a resilience fallback.
 */
export const FREE_MODEL_FALLBACKS = [
  'nvidia/nemotron-3-ultra-550b-a55b:free',
  'openrouter/free',
  'particle-ai/particle-1:free',
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
] as const;

/**
 * Vision-capable free models (models that support image input).
 * These are tried first when `hasImages === true`.
 */
export const VISION_FREE_MODELS = [
  'nvidia/nemotron-3-nano-omni-30b-a3b-reasoning:free',
  'openrouter/free',
] as const;

export const DEFAULT_FREE_MODEL = FREE_MODEL_FALLBACKS[0];

/** A model is allowed only when it is the free router or explicitly `:free`. */
export function isFreeModel(modelId: string | null | undefined): boolean {
  if (!modelId) return false;
  return modelId === 'openrouter/free' || modelId.endsWith(':free');
}

/** Throws when a non-free model id is supplied. */
export function assertFreeModel(modelId: string): string {
  if (!isFreeModel(modelId)) {
    throw new Error(
      `Model "${modelId}" is not allowed: this deployment is restricted to OpenRouter free models.`
    );
  }
  return modelId;
}

/**
 * Builds the ordered list of models to try.
 * A preferred model is used first only when it is free; anything else is dropped.
 * If `hasImages` is true, vision-capable models are preferred.
 */
export function resolveModelChain(preferred?: string | null, hasImages?: boolean): string[] {
  const chain: string[] = [];

  if (preferred && isFreeModel(preferred)) {
    chain.push(preferred);
  } else if (preferred) {
    console.warn(
      `[openrouter] Ignoring non-free model "${preferred}" — free models only.`
    );
  }

  const envPreferred = process.env.OPENROUTER_DEFAULT_MODEL;
  if (envPreferred && isFreeModel(envPreferred)) {
    chain.push(envPreferred);
  }

  // Prefer vision models when images are present
  if (hasImages) {
    chain.push(...VISION_FREE_MODELS);
  }

  chain.push(...FREE_MODEL_FALLBACKS);

  return Array.from(new Set(chain));
}

let cachedProvider: OpenRouterProvider | null = null;

/** Creates (and caches) the OpenRouter provider. */
export function createOpenRouterProvider(): OpenRouterProvider {
  if (cachedProvider) return cachedProvider;

  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set.');
  }

  cachedProvider = createOpenRouter({
    apiKey,
    headers: {
      'HTTP-Referer': process.env.OPENROUTER_SITE_URL ?? 'http://localhost:3000',
      'X-Title': process.env.OPENROUTER_APP_NAME ?? 'AI Tutor',
    },
  });

  return cachedProvider;
}

export interface StreamTutorOptions {
  messages: ModelMessage[];
  /** System prompt, passed separately so it is not treated as chat history. */
  system?: string;
  /** Preferred model (only honoured when free). */
  model?: string | null;
  temperature?: number;
  maxTokens?: number;
  /** Called once with the id of the model that produced the first token. */
  onModelSelected?: (modelId: string) => void;
  /** Whether the message contains images. If true, vision models are preferred. */
  hasImages?: boolean;
  /** Image URLs to include in the message (for vision models). */
  images?: string[];
}

/**
 * Streams tutor text, falling back through the free model chain when a model
 * fails before producing any output (429s, upstream errors, empty completions).
 * If `hasImages` is true or `images` are provided, vision-capable models are tried first.
 */
export async function* streamTutorText({
  messages,
  system,
  model,
  temperature = 0.7,
  maxTokens = 1500,
  onModelSelected,
  hasImages = false,
  images = [],
}: StreamTutorOptions): AsyncGenerator<string> {
  const provider = createOpenRouterProvider();
  const chain = resolveModelChain(model, hasImages);
  let lastError: unknown;

  for (const modelId of chain) {
    assertFreeModel(modelId);

    let produced = false;

    try {
      // Build messages with images if provided
      const modelMessages = [...messages];
      
      // If the last message is from the user and we have images, inject them
      if (images.length > 0 && modelMessages.length > 0) {
        const lastMsg = modelMessages[modelMessages.length - 1];
        if (lastMsg.role === 'user' && typeof lastMsg.content === 'string') {
          // Replace with multimodal content using AI SDK's content format
          modelMessages[modelMessages.length - 1] = {
            role: 'user',
            content: [
              { type: 'text', text: lastMsg.content },
              ...images.map((url) => ({
                type: 'image',
                image: url,
              }) as { type: 'image'; image: string }),
            ],
          };
        }
      }

      const result = streamText({
        model: provider(modelId),
        system,
        messages: modelMessages,
        temperature,
        maxOutputTokens: maxTokens,
        maxRetries: 0,
      });

      for await (const delta of result.textStream) {
        if (!delta) continue;
        if (!produced) {
          produced = true;
          onModelSelected?.(modelId);
        }
        yield delta;
      }

      if (produced) return;

      console.warn(`[openrouter] "${modelId}" returned no text; trying next free model.`);
    } catch (error) {
      lastError = error;
      if (produced) throw error;
      console.warn(
        `[openrouter] "${modelId}" failed before producing text; trying next free model.`,
        error
      );
    }
  }

  throw new Error(
    `All free tutor models failed${lastError instanceof Error ? `: ${lastError.message}` : ''}`
  );
}