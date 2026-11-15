# Phase 4 Export Tools (Teacher) Implementation Plan

## Overview
Implement `exportToGoogleDoc`, `exportToGoogleForm`, `exportToSlides` as tutor-callable tools in the Neon Function, with Google OAuth flow for teachers and encrypted token storage.

---

## 1. Prerequisites & Blockers (Resolve First)

| Blocker | Action Required | Status |
|---------|----------------|--------|
| **Google Cloud Project** | Create project, enable Drive API, Docs API, Forms API, Slides API; configure OAuth consent screen | ☐ |
| **OAuth Credentials** | Create OAuth 2.0 client ID (Web application); add authorized redirect URIs | ☐ |
| **Scopes Required** | `https://www.googleapis.com/auth/drive.file`, `https://www.googleapis.com/auth/documents`, `https://www.googleapis.com/auth/forms.body`, `https://www.googleapis.com/auth/presentations` | ☐ |
| **VAPID Keys** | Already needed for push notifications (Phase 4) | ✅ |

**Environment Variables to Add:**
```
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GOOGLE_REDIRECT_URI=https://<your-app>/api/auth/google/callback
ENCRYPTION_KEY=  # 32-byte base64 key for token encryption
```

---

## 2. Database Schema Changes

### File: `db/schema/artifacts.ts` (Extend existing `oauthTokens` table)

The `oauthTokens` table already exists with the right structure. Need to verify/update:

```typescript
// Already exists - verify these fields are sufficient:
export const oauthTokens = pgTable('oauth_tokens', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: oauthProviderEnum('provider').notNull(), // 'google' | 'microsoft' | ...
  providerUserId: text('provider_user_id').notNull(),
  accessToken: text('access_token').notNull(),       // ENCRYPTED
  refreshToken: text('refresh_token'),                // ENCRYPTED
  idToken: text('id_token'),
  tokenType: text('token_type').default('Bearer').notNull(),
  scope: text('scope'),
  expiresAt: timestamp('expires_at', { withTimezone: true }),
  refreshExpiresAt: timestamp('refresh_expires_at', { withTimezone: true }),
  isActive: boolean('is_active').default(true).notNull(),
  metadata: jsonb('metadata').default({}).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  userIdx: index('oauth_tokens_user_id_idx').on(table.userId),
  providerIdx: index('oauth_tokens_provider_idx').on(table.provider),
  providerUserIdx: uniqueIndex('oauth_tokens_provider_user_idx').on(table.provider, table.providerUserId),
  activeIdx: index('oauth_tokens_active_idx').on(table.isActive),
  expiresIdx: index('oauth_tokens_expires_at_idx').on(table.expiresAt),
}));
```

**Action:** Add encryption utilities and ensure tokens are encrypted at rest. No new columns needed.

---

## 3. New Files to Create

### 3.1 Encryption Utilities
**File:** `src/lib/crypto/encryption.ts`
```typescript
// AES-GCM encryption for OAuth tokens at rest
// Uses ENCRYPTION_KEY from env (32-byte base64)
export function encrypt(text: string): string
export function decrypt(encrypted: string): string
```

### 3.2 Google OAuth Client Library
**File:** `src/lib/google/oauth.ts`
```typescript
// Google OAuth2 flow for Drive/Docs/Forms/Slides
export class GoogleOAuthClient {
  static getAuthorizationUrl(state: string, scopes: string[]): string
  async exchangeCode(code: string): Promise<TokenResponse>
  async refreshAccessToken(refreshToken: string): Promise<TokenResponse>
  async getUserInfo(accessToken: string): Promise<UserInfo>
}
```

### 3.3 Google API Service Clients
**File:** `src/lib/google/docs.ts`
```typescript
// Google Docs API wrapper
export class GoogleDocsClient {
  constructor(accessToken: string)
  async createDocument(title: string, content: string): Promise<{ documentId: string; url: string }>
  async appendContent(documentId: string, content: string): Promise<void>
}
```

**File:** `src/lib/google/forms.ts`
```typescript
// Google Forms API wrapper
export class GoogleFormsClient {
  constructor(accessToken: string)
  async createForm(title: string, questions: FormQuestion[]): Promise<{ formId: string; url: string }>
}
```

**File:** `src/lib/google/slides.ts`
```typescript
// Google Slides API wrapper
export class GoogleSlidesClient {
  constructor(accessToken: string)
  async createPresentation(title: string, slides: SlideContent[]): Promise<{ presentationId: string; url: string }>
}
```

### 3.4 Token Management Service
**File:** `src/lib/google/token-store.ts`
```typescript
// Drizzle-backed token storage with encryption
export class GoogleTokenStore {
  constructor(db: DrizzleDb)
  async saveTokens(userId: string, tokens: TokenResponse, providerUserId: string): Promise<void>
  async getValidAccessToken(userId: string): Promise<string | null> // auto-refreshes if needed
  async revokeTokens(userId: string): Promise<void>
}
```

### 3.5 API Routes for OAuth Flow
**File:** `src/app/api/auth/google/route.ts` (GET)
```typescript
// Initiate Google OAuth - teacher clicks "Connect Google"
```

**File:** `src/app/api/auth/google/callback/route.ts` (GET)
```typescript
// Handle OAuth callback - exchange code, store encrypted tokens
```

**File:** `src/app/api/auth/google/status/route.ts` (GET)
```typescript
// Check if teacher has Google connected
```

**File:** `src/app/api/auth/google/disconnect/route.ts` (POST)
```typescript
// Revoke and delete tokens
```

### 3.6 Export Tool Implementations (for Tutor Function)
**File:** `src/functions/tools/export-tools.ts`
```typescript
// Tool definitions callable by the tutor agent

export const exportToGoogleDoc = {
  name: 'exportToGoogleDoc',
  description: 'Export content to a new Google Doc',
  parameters: z.object({
    content: z.string(),
    title: z.string(),
  }),
  execute: async ({ content, title }, { userId, db }) => { ... }
}

export const exportToGoogleForm = {
  name: 'exportToGoogleForm',
  description: 'Export questions to a new Google Form',
  parameters: z.object({
    questions: z.array(z.object({
      title: z.string(),
      type: z.enum(['multiple_choice', 'checkbox', 'short_answer', 'paragraph', 'dropdown', 'linear_scale']),
      options: z.array(z.string()).optional(),
      required: z.boolean().default(false),
    })),
    title: z.string(),
  }),
  execute: async ({ questions, title }, { userId, db }) => { ... }
}

export const exportToSlides = {
  name: 'exportToSlides',
  description: 'Export slides to a new Google Slides presentation',
  parameters: z.object({
    slides: z.array(z.object({
      title: z.string(),
      content: z.string(), // markdown or plain text
      layout: z.enum(['title', 'title_and_body', 'blank', 'section_header']).default('title_and_body'),
    })),
    title: z.string(),
  }),
  execute: async ({ slides, title }, { userId, db }) => { ... }
}
```

### 3.7 Export Jobs API (Teacher Dashboard)
**File:** `src/app/api/teacher/exports/route.ts` (POST)
```typescript
// Create export job from artifact or direct content
```

**File:** `src/app/api/teacher/exports/[id]/route.ts` (GET)
```typescript
// Check export job status
```

### 3.8 Teacher UI Component
**File:** `src/components/teacher/ExportTools.tsx`
```typescript
// UI for teachers to export artifacts to Google
// Integrates with tutor function via tool calling
```

---

## 4. Files to Modify

### 4.1 Tutor Function - Register New Tools
**File:** `src/functions/tutor.ts`
- Import export tools from `src/functions/tools/export-tools.ts`
- Add tools to the tool loop / available tools registry
- Ensure tools have access to `userId` (teacher) and `db`

### 4.2 Tutor Config Schema (if needed)
**File:** `db/schema/classes.ts` (tutorConfigs)
- Add `allowedTools` array to include export tools
- Teacher can enable/disable export tools per class

### 4.3 Environment Configuration
**File:** `neon.ts` (if adding Function env vars)
- Add Google OAuth env vars to tutor function declaration

### 4.4 Database Migration
Run after schema changes:
```bash
npm run db:generate
npm run db:migrate
```

---

## 5. Implementation Order

### Phase A: Foundation (Day 1-2)
1. **Create encryption utilities** - `src/lib/crypto/encryption.ts`
2. **Update `oauthTokens` usage** - Ensure encryption is used when saving/retrieving tokens
3. **Create Google OAuth client** - `src/lib/google/oauth.ts`
4. **Create token store** - `src/lib/google/token-store.ts` with Drizzle + encryption

### Phase B: OAuth Flow (Day 2-3)
5. **Create API routes** for OAuth initiation, callback, status, disconnect
6. **Test OAuth flow** end-to-end with Google Cloud project
7. **Verify tokens are encrypted** in database

### Phase C: Google API Clients (Day 3-4)
8. **Implement GoogleDocsClient** - create document, append content
9. **Implement GoogleFormsClient** - create form with questions
10. **Implement GoogleSlidesClient** - create presentation with slides
11. **Add error handling & retry logic** for API calls

### Phase D: Export Tools for Tutor (Day 4-5)
12. **Create export tool definitions** - `src/functions/tools/export-tools.ts`
13. **Integrate into tutor.ts** - Register tools in tool loop
14. **Add tool permissions** to tutor config (teacher can enable/disable)

### Phase E: Teacher UI & Export Jobs (Day 5-6)
15. **Create ExportTools component** - `src/components/teacher/ExportTools.tsx`
16. **Create export jobs API** - Track async export operations
17. **Add to teacher dashboard** - Link in class sessions/analytics pages

### Phase F: Testing & Validation (Day 6-7)
18. **Write unit tests** for encryption, token store, API clients
19. **Write integration tests** for OAuth flow and export tools
20. **Run validation gates**: `typecheck`, `lint`, `build`, `db:generate`, `db:migrate`, `test`, `test:e2e`

---

## 6. Detailed Technical Design

### 6.1 Encryption Implementation
```typescript
// src/lib/crypto/encryption.ts
import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY!; // base64 encoded 32 bytes
const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM recommended
const SALT_LENGTH = 16;
const TAG_LENGTH = 16;

let derivedKey: Buffer | null = null;

async function getKey(): Promise<Buffer> {
  if (derivedKey) return derivedKey;
  const keyBuffer = Buffer.from(ENCRYPTION_KEY, 'base64');
  if (keyBuffer.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes base64');
  derivedKey = keyBuffer;
  return derivedKey;
}

export async function encrypt(plaintext: string): Promise<string> {
  const key = await getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  // Format: iv:salt:ciphertext:tag (salt not used with fixed key, but keep for future)
  return Buffer.concat([iv, ciphertext, authTag]).toString('base64');
}

export async function decrypt(encrypted: string): Promise<string> {
  const key = await getKey();
  const data = Buffer.from(encrypted, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(data.length - TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH, data.length - TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}
```

### 6.2 Token Store with Auto-Refresh
```typescript
// src/lib/google/token-store.ts
export class GoogleTokenStore {
  constructor(private db: DrizzleDb) {}

  async saveTokens(userId: string, tokens: TokenResponse, providerUserId: string) {
    const encryptedAccess = await encrypt(tokens.access_token);
    const encryptedRefresh = tokens.refresh_token ? await encrypt(tokens.refresh_token) : null;
    
    await this.db.insert(oauthTokens).values({
      userId,
      provider: 'google',
      providerUserId,
      accessToken: encryptedAccess,
      refreshToken: encryptedRefresh,
      tokenType: tokens.token_type,
      scope: tokens.scope,
      expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
      isActive: true,
    }).onConflictDoUpdate({
      target: [oauthTokens.provider, oauthTokens.providerUserId],
      set: {
        accessToken: encryptedAccess,
        refreshToken: encryptedRefresh,
        expiresAt: new Date(Date.now() + tokens.expires_in * 1000),
        updatedAt: new Date(),
      },
    });
  }

  async getValidAccessToken(userId: string): Promise<string | null> {
    const tokenRecord = await this.db.query.oauthTokens.findFirst({
      where: and(
        eq(oauthTokens.userId, userId),
        eq(oauthTokens.provider, 'google'),
        eq(oauthTokens.isActive, true)
      ),
    });

    if (!tokenRecord) return null;

    // Check if expired (with 5 min buffer)
    if (tokenRecord.expiresAt && tokenRecord.expiresAt < new Date(Date.now() + 5 * 60 * 1000)) {
      if (!tokenRecord.refreshToken) return null;
      const newTokens = await this.refreshToken(await decrypt(tokenRecord.refreshToken));
      await this.saveTokens(userId, newTokens, tokenRecord.providerUserId);
      return newTokens.access_token;
    }

    return await decrypt(tokenRecord.accessToken);
  }
}
```

### 6.3 Export Tool Integration in Tutor Function
```typescript
// src/functions/tools/export-tools.ts
import { z } from 'zod';
import { GoogleDocsClient } from '@/lib/google/docs';
import { GoogleFormsClient } from '@/lib/google/forms';
import { GoogleSlidesClient } from '@/lib/google/slides';
import { GoogleTokenStore } from '@/lib/google/token-store';

interface ToolContext {
  userId: string; // teacher ID
  db: DrizzleDb;
}

export const exportTools = {
  exportToGoogleDoc: {
    name: 'exportToGoogleDoc',
    description: 'Export content to a new Google Doc. Requires teacher to have connected Google account.',
    parameters: z.object({
      content: z.string().describe('The content to export (markdown or plain text)'),
      title: z.string().describe('Title for the Google Doc'),
    }),
    execute: async ({ content, title }: { content: string; title: string }, context: ToolContext) => {
      const tokenStore = new GoogleTokenStore(context.db);
      const accessToken = await tokenStore.getValidAccessToken(context.userId);
      
      if (!accessToken) {
        throw new Error('Google account not connected. Please connect your Google account first.');
      }

      const docsClient = new GoogleDocsClient(accessToken);
      const result = await docsClient.createDocument(title, content);
      
      // Log export job
      await context.db.insert(exportJobs).values({
        artifactId: null, // or link to artifact if applicable
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
    description: 'Export questions to a new Google Form. Requires teacher to have connected Google account.',
    parameters: z.object({
      questions: z.array(z.object({
        title: z.string(),
        type: z.enum(['multiple_choice', 'checkbox', 'short_answer', 'paragraph', 'dropdown', 'linear_scale']),
        options: z.array(z.string()).optional(),
        required: z.boolean().default(false),
      })).min(1),
      title: z.string(),
    }),
    execute: async ({ questions, title }, context: ToolContext) => {
      const tokenStore = new GoogleTokenStore(context.db);
      const accessToken = await tokenStore.getValidAccessToken(context.userId);
      
      if (!accessToken) {
        throw new Error('Google account not connected. Please connect your Google account first.');
      }

      const formsClient = new GoogleFormsClient(accessToken);
      const result = await formsClient.createForm(title, questions);
      
      await context.db.insert(exportJobs).values({
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
    description: 'Export slides to a new Google Slides presentation. Requires teacher to have connected Google account.',
    parameters: z.object({
      slides: z.array(z.object({
        title: z.string(),
        content: z.string(),
        layout: z.enum(['title', 'title_and_body', 'blank', 'section_header']).default('title_and_body'),
      })).min(1),
      title: z.string(),
    }),
    execute: async ({ slides, title }, context: ToolContext) => {
      const tokenStore = new GoogleTokenStore(context.db);
      const accessToken = await tokenStore.getValidAccessToken(context.userId);
      
      if (!accessToken) {
        throw new Error('Google account not connected. Please connect your Google account first.');
      }

      const slidesClient = new GoogleSlidesClient(accessToken);
      const result = await slidesClient.createPresentation(title, slides);
      
      await context.db.insert(exportJobs).values({
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
};
```

### 6.4 Register Tools in Tutor Function
```typescript
// src/functions/tutor.ts - Add to imports
import { exportTools } from './tools/export-tools';

// In the tool loop / agent setup, register the tools:
const availableTools = {
  // ... existing tools
  ...exportTools,
};

// Ensure the tool execution context includes userId (teacher) and db
async function executeTool(name: string, args: any, context: ToolContext) {
  const tool = availableTools[name];
  if (!tool) throw new Error(`Unknown tool: ${name}`);
  return await tool.execute(args, context);
}
```

---

## 7. Teacher UI Component Design

### ExportTools.tsx
```tsx
// src/components/teacher/ExportTools.tsx
'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { FileText, LayoutTemplate, Presentation, Loader2 } from 'lucide-react';

interface ExportToolsProps {
  classId: string;
  teacherId: string;
  artifacts?: GeneratedArtifact[];
}

export function ExportTools({ classId, teacherId, artifacts = [] }: ExportToolsProps) {
  const [exportType, setExportType] = useState<'doc' | 'form' | 'slides'>('doc');
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleConnected, setGoogleConnected] = useState(false);

  // Check Google connection status on mount
  // Call tutor function with tool invocation

  const handleExport = async () => {
    if (!title || !content) {
      toast.error('Title and content are required');
      return;
    }
    setLoading(true);
    try {
      // Call tutor function with export tool
      const response = await fetch('/api/functions/tutor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'export',
          tool: `exportToGoogle${exportType === 'doc' ? 'Doc' : exportType === 'form' ? 'Form' : 'Slides'}`,
          args: exportType === 'form' 
            ? { title, questions: parseQuestions(content) }
            : exportType === 'slides'
            ? { title, slides: parseSlides(content) }
            : { title, content },
          teacherId,
        }),
      });
      const result = await response.json();
      if (result.success) {
        toast.success(result.message);
        window.open(result.url, '_blank');
      } else {
        toast.error(result.error || 'Export failed');
      }
    } catch (error) {
      toast.error('Export failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <LayoutTemplate className="h-5 w-5" />
          Export to Google Workspace
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        {!googleConnected && (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              Connect your Google account to enable exports.
              <Button variant="link" size="sm" className="ml-2" onClick={connectGoogle}>
                Connect Google
              </Button>
            </p>
          </div>
        )}

        {/* Export Type Selector */}
        <Select value={exportType} onValueChange={setExportType} disabled={!googleConnected}>
          <SelectTrigger>
            <SelectValue placeholder="Select export type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="doc">
              <FileText className="mr-2 h-4 w-4" /> Google Doc
            </SelectItem>
            <SelectItem value="form">
              <LayoutTemplate className="mr-2 h-4 w-4" /> Google Form
            </SelectItem>
            <SelectItem value="slides">
              <Presentation className="mr-2 h-4 w-4" /> Google Slides
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Title Input */}
        <Input
          placeholder="Document title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          disabled={!googleConnected}
        />

        {/* Content Input - varies by type */}
        <Textarea
          placeholder={
            exportType === 'doc'
              ? 'Enter content (markdown supported)...'
              : exportType === 'form'
              ? 'Enter questions (one per line, format: "Question? | type | option1,option2,...")'
              : 'Enter slides (one per line, format: "Title | Content | layout")'
          }
          value={content}
          onChange={(e) => setContent(e.target.value)}
          disabled={!googleConnected}
          rows={8}
        />

        {/* Artifact Quick-Select */}
        {artifacts.length > 0 && (
          <div>
            <label className="text-sm font-medium">Or select existing artifact:</label>
            <Select onValueChange={(id) => {
              const artifact = artifacts.find(a => a.id === id);
              if (artifact) {
                setTitle(artifact.title);
                setContent(typeof artifact.content === 'string' ? artifact.content : JSON.stringify(artifact.content));
              }
            }}>
              <SelectTrigger>
                <SelectValue placeholder="Choose artifact..." />
              </SelectTrigger>
              <SelectContent>
                {artifacts.map(a => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.title} ({a.type})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Button 
          onClick={handleExport} 
          disabled={loading || !googleConnected || !title || !content}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting...
            </>
          ) : (
            `Export to Google ${exportType === 'doc' ? 'Doc' : exportType === 'form' ? 'Form' : 'Slides'}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
```

---

## 8. Google API Client Implementations

### Google Docs Client
```typescript
// src/lib/google/docs.ts
const DOCS_API_BASE = 'https://docs.googleapis.com/v1';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

export class GoogleDocsClient {
  constructor(private accessToken: string) {}

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google Docs API error: ${res.status} - ${error}`);
    }
    return res.json();
  }

  async createDocument(title: string, content: string): Promise<{ documentId: string; url: string }> {
    // 1. Create empty document
    const doc = await this.request<{ documentId: string }>(`${DOCS_API_BASE}/documents`, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });

    // 2. Insert content as batch update
    const requests = this.markdownToRequests(content);
    if (requests.length > 0) {
      await this.request(`${DOCS_API_BASE}/documents/${doc.documentId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests }),
      });
    }

    // 3. Make readable (optional - depends on sharing needs)
    // Could use Drive API to set permissions

    return {
      documentId: doc.documentId,
      url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
    };
  }

  private markdownToRequests(markdown: string): any[] {
    // Convert markdown to Google Docs batchUpdate requests
    // Simplified: just insert text with basic formatting
    const requests: any[] = [];
    let index = 1; // Start after title
    
    const lines = markdown.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        requests.push({
          insertText: { location: { index }, text: line.slice(2) + '\n' },
        });
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: index, endIndex: index + line.length - 1 },
            paragraphStyle: { namedStyleType: 'HEADING_1' },
            fields: 'namedStyleType',
          },
        });
      } else if (line.startsWith('## ')) {
        // Similar for HEADING_2
      } else {
        requests.push({
          insertText: { location: { index }, text: line + '\n' },
        });
      }
      index += line.length + 1;
    }
    return requests;
  }
}
```

### Google Forms Client
```typescript
// src/lib/google/forms.ts
const FORMS_API_BASE = 'https://forms.googleapis.com/v1/forms';

export interface FormQuestion {
  title: string;
  type: 'multiple_choice' | 'checkbox' | 'short_answer' | 'paragraph' | 'dropdown' | 'linear_scale';
  options?: string[];
  required?: boolean;
}

export class GoogleFormsClient {
  constructor(private accessToken: string) {}

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`Google Forms API error: ${res.status} - ${await res.text()}`);
    return res.json();
  }

  async createForm(title: string, questions: FormQuestion[]): Promise<{ formId: string; url: string }> {
    // 1. Create form
    const form = await this.request<{ formId: string; responderUri: string }>(FORMS_API_BASE, {
      method: 'POST',
      body: JSON.stringify({ info: { title } }),
    });

    // 2. Batch update to add questions
    const requests = questions.map((q, i) => this.questionToRequest(q, i));
    
    await this.request(`${FORMS_API_BASE}/${form.formId}:batchUpdate`, {
      method: 'POST',
      body: JSON.stringify({ requests }),
    });

    return {
      formId: form.formId,
      url: form.responderUri,
    };
  }

  private questionToRequest(q: FormQuestion, index: number): any {
    const typeMap: Record<string, string> = {
      multiple_choice: 'RADIO',
      checkbox: 'CHECKBOX',
      short_answer: 'TEXT',
      paragraph: 'PARAGRAPH',
      dropdown: 'DROP_DOWN',
      linear_scale: 'LINEAR_SCALE',
    };

    const base = {
      createItem: {
        item: {
          title: q.title,
          questionItem: {
            question: {
              required: q.required ?? false,
              [this.getQuestionTypeKey(q.type)]: this.getQuestionConfig(q),
            },
          },
        },
        location: { index },
      },
    };

    return base;
  }

  private getQuestionTypeKey(type: string): string {
    const map: Record<string, string> = {
      multiple_choice: 'choiceQuestion',
      checkbox: 'choiceQuestion',
      short_answer: 'textQuestion',
      paragraph: 'textQuestion',
      dropdown: 'choiceQuestion',
      linear_scale: 'scaleQuestion',
    };
    return map[type] || 'textQuestion';
  }

  private getQuestionConfig(q: FormQuestion): any {
    switch (q.type) {
      case 'multiple_choice':
      case 'checkbox':
      case 'dropdown':
        return {
          type: q.type === 'dropdown' ? 'DROP_DOWN' : q.type.toUpperCase(),
          options: q.options?.map(opt => ({ value: opt })) || [],
          shuffle: false,
        };
      case 'linear_scale':
        return {
          low: 1,
          high: 5,
          lowLabel: '',
          highLabel: '',
        };
      default:
        return { paragraph: q.type === 'paragraph' };
    }
  }
}
```

### Google Slides Client
```typescript
// src/lib/google/slides.ts
const SLIDES_API_BASE = 'https://slides.googleapis.com/v1/presentations';
const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';

export interface SlideContent {
  title: string;
  content: string;
  layout?: 'title' | 'title_and_body' | 'blank' | 'section_header';
}

export class GoogleSlidesClient {
  constructor(private accessToken: string) {}

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) throw new Error(`Google Slides API error: ${res.status} - ${await res.text()}`);
    return res.json();
  }

  async createPresentation(title: string, slides: SlideContent[]): Promise<{ presentationId: string; url: string }> {
    // 1. Create presentation
    const presentation = await this.request<{ presentationId: string }>(SLIDES_API_BASE, {
      method: 'POST',
      body: JSON.stringify({ title }),
    });

    // 2. Get default slide ID (first slide)
    const pres = await this.request<{ slides: Array<{ objectId: string }> }>(
      `${SLIDES_API_BASE}/${presentation.presentationId}`
    );
    
    // 3. Update first slide with title
    const firstSlideId = pres.slides[0].objectId;
    const requests: any[] = [
      {
        replaceAllText: {
          containsText: { text: '{{TITLE}}', matchCase: true },
          replaceText: slides[0]?.title || title,
        },
      },
    ];

    // 4. Add additional slides
    for (let i = 1; i < slides.length; i++) {
      const slide = slides[i];
      const layoutMap: Record<string, string> = {
        title: 'TITLE',
        title_and_body: 'TITLE_AND_BODY',
        blank: 'BLANK',
        section_header: 'SECTION_HEADER',
      };
      
      const newSlideId = `slide_${i}_${Date.now()}`;
      requests.push({
        createSlide: {
          objectId: newSlideId,
          insertionIndex: i,
          slideLayoutReference: {
            predefinedLayout: layoutMap[slide.layout || 'title_and_body'],
          },
        },
      });

      // Add content to new slide
      requests.push({
        replaceAllText: {
          containsText: { text: '{{TITLE}}', matchCase: true },
          replaceText: slide.title,
          pageObjectIds: [newSlideId],
        },
      });
      requests.push({
        replaceAllText: {
          containsText: { text: '{{BODY}}', matchCase: true },
          replaceText: slide.content,
          pageObjectIds: [newSlideId],
        },
      });
    }

    if (requests.length > 0) {
      await this.request(`${SLIDES_API_BASE}/${presentation.presentationId}:batchUpdate`, {
        method: 'POST',
        body: JSON.stringify({ requests }),
      });
    }

    return {
      presentationId: presentation.presentationId,
      url: `https://docs.google.com/presentation/d/${presentation.presentationId}/edit`,
    };
  }
}
```

---

## 9. Validation Gates

Run after implementation:

```bash
# Code Quality
npm run type-check          # ✅ Zero TypeScript errors
npm run lint                # ✅ Zero ESLint errors
npm run build               # ✅ Production build succeeds

# Database
npm run db:generate         # ✅ Migration files created
npm run db:migrate          # ✅ Migrations apply cleanly
npm run db:check            # ✅ Schema matches database

# Tests
npm run test                # ✅ All unit tests pass
npm run test:e2e            # ✅ Critical path E2E tests pass

# Manual Verification
# 1. Teacher connects Google account via UI
# 2. Teacher exports artifact to Google Doc/Form/Slides
# 3. Tutor agent calls export tools during chat
# 4. Export jobs tracked in export_jobs table
# 5. Tokens encrypted in database
```

---

## 10. Open Questions / Decisions Needed

| Question | Options | Recommendation |
|----------|---------|----------------|
| **Token encryption key management** | Single ENCRYPTION_KEY env var vs per-tenant keys | Single key for MVP; rotate via env |
| **Export from artifacts vs direct content** | Both supported | Allow both - artifact quick-select + manual entry |
| **Form question parsing** | Structured UI vs markdown parsing | Start with markdown parsing; add structured UI later |
| **Slide content format** | Markdown vs custom format | Markdown with `---` slide separators |
| **Sharing permissions** | Private only vs link sharing | Private by default; teacher can share manually in Google |
| **Rate limiting** | Google API quotas | Implement exponential backoff; queue exports |

---

## 11. Cost Considerations (Free Tier)

| Component | Cost |
|-----------|------|
| Google APIs | Free (within quotas) |
| Neon Functions | Free tier |
| Neon Postgres | Free tier |
| Vercel hosting | Free tier |
| OpenRouter (for tutor) | $10-50/mo (existing) |

**No additional costs** for export tools implementation.

---

## 12. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Google OAuth consent screen verification needed for >100 users | Medium | Use internal/test mode for pilot; submit for verification later |
| Token refresh failures | High | Implement robust retry + user re-auth flow |
| API quota limits | Medium | Implement request queuing + backoff; monitor usage |
| Encryption key rotation | Medium | Support key versioning in token metadata |
| Teacher revokes Google access | Medium | Handle 401 gracefully; prompt re-connection |

---

## 13. Definition of Done

- [ ] Google Cloud project configured with required APIs
- [ ] OAuth credentials created and added to environment
- [ ] Encryption utilities implemented and tested
- [ ] `oauthTokens` table stores encrypted tokens
- [ ] OAuth flow: connect → callback → token storage works
- [ ] Token auto-refresh on expiry works
- [ ] Google Docs client creates documents with content
- [ ] Google Forms client creates forms with questions
- [ ] Google Slides client creates presentations with slides
- [ ] Export tools registered in tutor function
- [ ] Tutor agent can call export tools during chat
- [ ] Teacher UI (ExportTools component) functional
- [ ] Export jobs tracked in `export_jobs` table
- [ ] All validation gates pass
- [ ] E2E test: teacher exports artifact to Google Doc

---

*Plan Version: 1.0 | Created: 2026-11-15 | Phase: 4 Export Tools (Teacher)*