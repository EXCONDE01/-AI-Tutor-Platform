/**
 * Export Tools for Tutor Function
 * Callable by the tutor agent to export content to Google Workspace
 */

import { z } from 'zod';
import { GoogleDocsClient } from '@/lib/google/docs';
import { GoogleFormsClient, type FormQuestion } from '@/lib/google/forms';
import { GoogleSlidesClient, type SlideContent } from '@/lib/google/slides';
import { GoogleTokenStore } from '@/lib/google/token-store';
import { db } from '@/lib/db';
import { exportJobs, generatedArtifacts } from '@/db/schema/artifacts';
import { eq } from 'drizzle-orm';

interface ToolContext {
  userId: string; // teacher ID
  db: any;
}

export const exportTools = {
  exportToGoogleDoc: {
    name: 'exportToGoogleDoc',
    description:
      'Export content to a new Google Doc. Requires teacher to have connected Google account.',
    parameters: z.object({
      content: z.string().describe('The content to export (markdown or plain text)'),
      title: z.string().describe('Title for the Google Doc'),
    }),
    execute: async (
      { content, title }: { content: string; title: string },
      context: ToolContext
    ) => {
      const tokenStore = new GoogleTokenStore(context.db);
      const accessToken = await tokenStore.getValidAccessToken(context.userId);

      if (!accessToken) {
        throw new Error(
          'Google account not connected. Please connect your Google account first.'
        );
      }

      const docsClient = new GoogleDocsClient(accessToken);
      const result = await docsClient.createDocument(title, content);

      // Log export job
      await context.db.insert(exportJobs).values({
        artifactId: null,
        requestedBy: context.userId,
        format: 'google_docs',
        status: 'completed',
        destination: result.url,
        destinationType: 'google_docs',
        resultUrl: result.url,
        completedAt: new Date(),
      });

      return {
        success: true,
        url: result.url,
        fileId: result.documentId,
        message: `Exported to Google Doc: ${result.url}`,
      };
    },
  },

  exportToGoogleForm: {
    name: 'exportToGoogleForm',
    description:
      'Export questions to a new Google Form. Requires teacher to have connected Google account.',
    parameters: z.object({
      questions: z
        .array(
          z.object({
            title: z.string(),
            type: z.enum([
              'multiple_choice',
              'checkbox',
              'short_answer',
              'paragraph',
              'dropdown',
              'linear_scale',
            ]),
            options: z.array(z.string()).optional(),
            required: z.boolean().default(false),
          })
        )
        .min(1),
      title: z.string(),
    }),
    execute: async (
      { questions, title }: { questions: FormQuestion[]; title: string },
      context: ToolContext
    ) => {
      const tokenStore = new GoogleTokenStore(context.db);
      const accessToken = await tokenStore.getValidAccessToken(context.userId);

      if (!accessToken) {
        throw new Error(
          'Google account not connected. Please connect your Google account first.'
        );
      }

      const formsClient = new GoogleFormsClient(accessToken);
      const result = await formsClient.createForm(title, questions);

      await context.db.insert(exportJobs).values({
        artifactId: null,
        requestedBy: context.userId,
        format: 'google_forms',
        status: 'completed',
        destination: result.url,
        destinationType: 'google_forms',
        resultUrl: result.url,
        completedAt: new Date(),
      });

      return {
        success: true,
        url: result.url,
        formId: result.formId,
        message: `Exported to Google Form: ${result.url}`,
      };
    },
  },

  exportToSlides: {
    name: 'exportToSlides',
    description:
      'Export slides to a new Google Slides presentation. Requires teacher to have connected Google account.',
    parameters: z.object({
      slides: z
        .array(
          z.object({
            title: z.string(),
            content: z.string(),
            layout: z
              .enum(['title', 'title_and_body', 'blank', 'section_header'])
              .default('title_and_body'),
          })
        )
        .min(1),
      title: z.string(),
    }),
    execute: async (
      { slides, title }: { slides: SlideContent[]; title: string },
      context: ToolContext
    ) => {
      const tokenStore = new GoogleTokenStore(context.db);
      const accessToken = await tokenStore.getValidAccessToken(context.userId);

      if (!accessToken) {
        throw new Error(
          'Google account not connected. Please connect your Google account first.'
        );
      }

      const slidesClient = new GoogleSlidesClient(accessToken);
      const result = await slidesClient.createPresentation(title, slides);

      await context.db.insert(exportJobs).values({
        artifactId: null,
        requestedBy: context.userId,
        format: 'google_slides',
        status: 'completed',
        destination: result.url,
        destinationType: 'google_slides',
        resultUrl: result.url,
        completedAt: new Date(),
      });

      return {
        success: true,
        url: result.url,
        presentationId: result.presentationId,
        message: `Exported to Google Slides: ${result.url}`,
      };
    },
  },

  exportArtifactToGoogleDoc: {
    name: 'exportArtifactToGoogleDoc',
    description:
      'Export an existing generated artifact to a Google Doc',
    parameters: z.object({
      artifactId: z.string().uuid().describe('ID of the artifact to export'),
      title: z.string().optional().describe('Optional custom title'),
    }),
    execute: async (
      { artifactId, title }: { artifactId: string; title?: string },
      context: ToolContext
    ) => {
      const tokenStore = new GoogleTokenStore(context.db);
      const accessToken = await tokenStore.getValidAccessToken(context.userId);

      if (!accessToken) {
        throw new Error(
          'Google account not connected. Please connect your Google account first.'
        );
      }

      // Fetch artifact
      const [artifact] = await context.db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.id, artifactId))
        .limit(1);

      if (!artifact) {
        throw new Error('Artifact not found');
      }

      // Build content from artifact
      const content = artifact.markdownContent ||
        (typeof artifact.content === 'string'
          ? artifact.content
          : JSON.stringify(artifact.content, null, 2));

      const docsClient = new GoogleDocsClient(accessToken);
      const result = await docsClient.createDocument(
        title || artifact.title,
        content
      );

      // Log export job
      await context.db.insert(exportJobs).values({
        artifactId,
        requestedBy: context.userId,
        format: 'google_docs',
        status: 'completed',
        destination: result.url,
        destinationType: 'google_docs',
        resultUrl: result.url,
        completedAt: new Date(),
      });

      return {
        success: true,
        url: result.url,
        fileId: result.documentId,
        message: `Exported artifact to Google Doc: ${result.url}`,
      };
    },
  },

  exportArtifactToGoogleForm: {
    name: 'exportArtifactToGoogleForm',
    description:
      'Export an existing artifact as a Google Form (if it contains questions)',
    parameters: z.object({
      artifactId: z.string().uuid().describe('ID of the artifact to export'),
      title: z.string().optional().describe('Optional custom title'),
    }),
    execute: async (
      { artifactId, title }: { artifactId: string; title?: string },
      context: ToolContext
    ) => {
      const tokenStore = new GoogleTokenStore(context.db);
      const accessToken = await tokenStore.getValidAccessToken(context.userId);

      if (!accessToken) {
        throw new Error(
          'Google account not connected. Please connect your Google account first.'
        );
      }

      const [artifact] = await context.db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.id, artifactId))
        .limit(1);

      if (!artifact) {
        throw new Error('Artifact not found');
      }

      // Parse questions from artifact content
      const questions = parseArtifactQuestions(artifact);

      const formsClient = new GoogleFormsClient(accessToken);
      const result = await formsClient.createForm(
        title || artifact.title,
        questions
      );

      await context.db.insert(exportJobs).values({
        artifactId,
        requestedBy: context.userId,
        format: 'google_forms',
        status: 'completed',
        destination: result.url,
        destinationType: 'google_forms',
        resultUrl: result.url,
        completedAt: new Date(),
      });

      return {
        success: true,
        url: result.url,
        formId: result.formId,
        message: `Exported artifact to Google Form: ${result.url}`,
      };
    },
  },

  exportArtifactToSlides: {
    name: 'exportArtifactToSlides',
    description:
      'Export an existing artifact to Google Slides',
    parameters: z.object({
      artifactId: z.string().uuid().describe('ID of the artifact to export'),
      title: z.string().optional().describe('Optional custom title'),
    }),
    execute: async (
      { artifactId, title }: { artifactId: string; title?: string },
      context: ToolContext
    ) => {
      const tokenStore = new GoogleTokenStore(context.db);
      const accessToken = await tokenStore.getValidAccessToken(context.userId);

      if (!accessToken) {
        throw new Error(
          'Google account not connected. Please connect your Google account first.'
        );
      }

      const [artifact] = await context.db
        .select()
        .from(generatedArtifacts)
        .where(eq(generatedArtifacts.id, artifactId))
        .limit(1);

      if (!artifact) {
        throw new Error('Artifact not found');
      }

      // Parse slides from artifact content
      const slides = parseArtifactSlides(artifact);

      const slidesClient = new GoogleSlidesClient(accessToken);
      const result = await slidesClient.createPresentation(
        title || artifact.title,
        slides
      );

      await context.db.insert(exportJobs).values({
        artifactId,
        requestedBy: context.userId,
        format: 'google_slides',
        status: 'completed',
        destination: result.url,
        destinationType: 'google_slides',
        resultUrl: result.url,
        completedAt: new Date(),
      });

      return {
        success: true,
        url: result.url,
        presentationId: result.presentationId,
        message: `Exported artifact to Google Slides: ${result.url}`,
      };
    },
  },
};

function parseArtifactQuestions(
  artifact: typeof generatedArtifacts.$inferSelect
): FormQuestion[] {
  // Try to extract questions from artifact content
  // Expected format: JSON array or markdown with questions
  const content = artifact.content as any;

  if (Array.isArray(content)) {
    return content.map(q => ({
      title: q.question || q.title || '',
      type: q.type || 'short_answer',
      options: q.options,
      required: q.required || false,
    })) as FormQuestion[];
  }

  if (typeof content === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map(q => ({
          title: q.question || q.title || '',
          type: q.type || 'short_answer',
          options: q.options,
          required: q.required || false,
        })) as FormQuestion[];
      }
    } catch {
      // Not JSON, try markdown parsing
      const lines = content.split('\n');
      const questions: FormQuestion[] = [];
      for (const line of lines) {
        const trimmed = line.trim();
        if (
          trimmed.match(/^\d+\./) ||
          trimmed.startsWith('- ') ||
          trimmed.startsWith('* ')
        ) {
          const title = trimmed.replace(/^(\d+\.|[-*])\s*/, '');
          questions.push({ title, type: 'short_answer' });
        }
      }
      if (questions.length > 0) return questions;
    }
  }

  // Default: create one question from title
  return [{ title: artifact.title, type: 'short_answer' }];
}

function parseArtifactSlides(
  artifact: typeof generatedArtifacts.$inferSelect
): SlideContent[] {
  const content = artifact.content as any;

  if (Array.isArray(content)) {
    return content.map(s => ({
      title: s.title || '',
      content: s.content || '',
      layout: s.layout || 'title_and_body',
    })) as SlideContent[];
  }

  if (typeof content === 'string') {
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) {
        return parsed.map(s => ({
          title: s.title || '',
          content: s.content || '',
          layout: s.layout || 'title_and_body',
        })) as SlideContent[];
      }
    } catch {
      // Try markdown with --- separators
      const sections = content.split(/^---$/m);
      if (sections.length > 1) {
        return sections.map((section, i) => {
          const lines = section.trim().split('\n');
          const title = lines[0].replace(/^#+\s*/, '') || `Slide ${i + 1}`;
          const body = lines.slice(1).join('\n');
          return { title, content: body, layout: 'title_and_body' };
        }) as SlideContent[];
      }
    }
  }

  // Default: single slide with artifact content
  return [
    {
      title: artifact.title,
      content:
        artifact.markdownContent ||
        (typeof artifact.content === 'string'
          ? artifact.content
          : JSON.stringify(artifact.content, null, 2)),
      layout: 'title_and_body',
    },
  ];
}

export type ExportToolNames = keyof typeof exportTools;