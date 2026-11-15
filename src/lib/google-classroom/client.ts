/**
 * Google Classroom API Client (M2 Day 1 foundation)
 *
 * Dev-only token storage: tokens are persisted to a JSON file under
 * `data/google-classroom-tokens.json` for today. This is explicitly a
 * placeholder flagged for migration to Postgres (Drizzle) in a later phase.
 * No real Google OAuth client credentials are required; missing env vars
 * result in graceful degradation (503 from the auth route).
 */

import { createHash } from 'crypto';
import fs from 'fs';
import path from 'path';

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

export interface GoogleClassroomTokens {
  accessToken: string;
  refreshToken?: string;
  expiryDate: number; // epoch ms
}

export interface GoogleClassroomState {
  platformId?: string;
  expiresAt: number;
}

export interface Course {
  id: string;
  name: string;
  courseState: string;
  ownerId?: string;
  alternateLink?: string;
}

export interface Student {
  userId: string;
  email?: string;
  name?: string;
  role: 'TEACHER' | 'STUDENT';
}

export interface CourseWork {
  id: string;
  title: string;
  description?: string;
  state: string;
  dueDate?: string;
}

export class GoogleClassroomError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'GoogleClassroomError';
  }
}

/* ------------------------------------------------------------------ */
/* File-based token store (dev-only placeholder)                     */
/* ------------------------------------------------------------------ */

const STORE_DIR = path.join(process.cwd(), 'data');
const STORE_PATH = path.join(STORE_DIR, 'google-classroom-tokens.json');

interface StoreShape {
  tokens: Record<string, GoogleClassroomTokens>; // key: `${userId}:${platformId}` or `${userId}`
  states: Record<string, GoogleClassroomState>;
}

function ensureStoreDir(): void {
  if (!fs.existsSync(STORE_DIR)) {
    fs.mkdirSync(STORE_DIR, { recursive: true });
  }
}

function readStore(): StoreShape {
  ensureStoreDir();
  if (!fs.existsSync(STORE_PATH)) {
    return { tokens: {}, states: {} };
  }
  try {
    const raw = fs.readFileSync(STORE_PATH, 'utf-8');
    const parsed = JSON.parse(raw) as Partial<StoreShape>;
    return {
      tokens: parsed.tokens ?? {},
      states: parsed.states ?? {},
    };
  } catch {
    return { tokens: {}, states: {} };
  }
}

function writeStore(store: StoreShape): void {
  ensureStoreDir();
  fs.writeFileSync(STORE_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

function tokenKey(userId: string, platformId?: string): string {
  return platformId ? `${userId}:${platformId}` : userId;
}

export function storeOAuthState(state: string, platformId?: string): void {
  const store = readStore();
  store.states[state] = {
    platformId,
    expiresAt: Date.now() + 10 * 60 * 1000, // 10 min TTL
  };
  writeStore(store);
}

export function consumeOAuthState(state: string): { platformId?: string } | null {
  const store = readStore();
  const entry = store.states[state];
  if (!entry || entry.expiresAt < Date.now()) {
    delete store.states[state];
    writeStore(store);
    return null;
  }
  delete store.states[state];
  writeStore(store);
  return { platformId: entry.platformId };
}

export function storeTokens(userId: string, tokens: GoogleClassroomTokens, platformId?: string): void {
  const store = readStore();
  store.tokens[tokenKey(userId, platformId)] = tokens;
  writeStore(store);
}

export function getTokens(userId: string, platformId?: string): GoogleClassroomTokens | null {
  const store = readStore();
  // Try with platformId first, then fall back to user-only key
  if (platformId) {
    const withPlatform = store.tokens[tokenKey(userId, platformId)];
    if (withPlatform) return withPlatform;
  }
  return store.tokens[userId] ?? null;
}

/* ------------------------------------------------------------------ */
/* GoogleClassroomClient                                              */
/* ------------------------------------------------------------------ */

const AUTHORIZATION_BASE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
const CLASSROOM_BASE = 'https://classroom.googleapis.com/v1';

const SCOPES = [
  'https://www.googleapis.com/auth/classroom.courses.readonly',
  'https://www.googleapis.com/auth/classroom.rosters.readonly',
  'https://www.googleapis.com/auth/classroom.coursework.students.readonly',
  'https://www.googleapis.com/auth/classroom.profile.emails',
  'openid',
];

export class GoogleClassroomClient {
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;
  private tokens: GoogleClassroomTokens;

  constructor(
    tokens: GoogleClassroomTokens,
    clientId: string,
    clientSecret: string,
    redirectUri: string,
  ) {
    this.tokens = tokens;
    this.clientId = clientId;
    this.clientSecret = clientSecret;
    this.redirectUri = redirectUri;
  }

  /* ---------------------------------------------------------------- */
  /* OAuth2 helpers                                                   */
  /* ---------------------------------------------------------------- */

  static getAuthorizationUrl(
    state: string,
    redirectUri: string,
    scopes: string[] = SCOPES,
  ): string {
    const params = new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? '',
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes.join(' '),
      access_type: 'offline',
      prompt: 'consent',
      state,
    });
    return `${AUTHORIZATION_BASE_URL}?${params.toString()}`;
  }

  async exchangeCode(code: string): Promise<GoogleClassroomTokens> {
    const body = new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      client_id: this.clientId,
      client_secret: this.clientSecret,
      redirect_uri: this.redirectUri,
    });

    let res: Response;
    try {
      res = await fetch(TOKEN_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new GoogleClassroomError(502, 'Google API unavailable');
    }

    if (!res.ok) {
      const status = res.status;
      let message = 'Token exchange failed';
      try {
        const json = await res.json();
        message = json?.error_description ?? json?.error ?? message;
      } catch {
        // ignore parse errors
      }
      throw new GoogleClassroomError(status, message);
    }

    const data = (await res.json()) as {
      access_token: string;
      refresh_token?: string;
      expires_in: number;
      id_token?: string;
    };

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiryDate: Date.now() + data.expires_in * 1000,
    };
  }

  /* ---------------------------------------------------------------- */
  /* Classroom API                                                    */
  /* ---------------------------------------------------------------- */

  private async classroomGet<T>(url: string): Promise<T> {
    let res: Response;
    try {
      res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.tokens.accessToken}` },
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new GoogleClassroomError(502, 'Google API unavailable');
    }

    if (!res.ok) {
      const status = res.status;
      let message = 'Classroom API request failed';
      try {
        const json = await res.json();
        message = json?.error?.message ?? message;
      } catch {
        // ignore parse errors
      }
      throw new GoogleClassroomError(status, message);
    }

    return res.json();
  }

  async listCourses(): Promise<Course[]> {
    const data = await this.classroomGet<{
      courses?: Array<{
        id: string;
        name: string;
        courseState: string;
        ownerId?: string;
        alternateLink?: string;
      }>;
      nextPageToken?: string;
    }>(`${CLASSROOM_BASE}/courses`);

    return (data.courses ?? []).map(c => ({
      id: c.id,
      name: c.name,
      courseState: c.courseState,
      ownerId: c.ownerId,
      alternateLink: c.alternateLink,
    }));
  }

  async listStudents(courseId: string): Promise<Student[]> {
    interface StudentsResponse {
      studentMembers?: Array<{
        userId: string;
        profile?: { emailAddress?: string; name?: { fullName?: string } };
      }>;
    }
    interface TeachersResponse {
      teacherMembers?: Array<{
        userId: string;
        profile?: { emailAddress?: string; name?: { fullName?: string } };
      }>;
    }

    const [students, teachers] = await Promise.all([
      this.classroomGet<StudentsResponse>(
        `${CLASSROOM_BASE}/courses/${encodeURIComponent(courseId)}/students`,
      ),
      this.classroomGet<TeachersResponse>(
        `${CLASSROOM_BASE}/courses/${encodeURIComponent(courseId)}/teachers`,
      ),
    ]);

    const result: Student[] = [];
    for (const s of students.studentMembers ?? []) {
      result.push({
        userId: s.userId,
        email: s.profile?.emailAddress,
        name: s.profile?.name?.fullName,
        role: 'STUDENT',
      });
    }
    for (const t of teachers.teacherMembers ?? []) {
      result.push({
        userId: t.userId,
        email: t.profile?.emailAddress,
        name: t.profile?.name?.fullName,
        role: 'TEACHER',
      });
    }
    return result;
  }

  async listCoursework(courseId: string): Promise<CourseWork[]> {
    const data = await this.classroomGet<{
      courseWork?: Array<{
        id: string;
        title: string;
        description?: string;
        state: string;
        dueDate?: { year: number; month: number; day: number };
      }>;
    }>(`${CLASSROOM_BASE}/courses/${encodeURIComponent(courseId)}/courseWork`);

    return (data.courseWork ?? []).map(cw => ({
      id: cw.id,
      title: cw.title,
      description: cw.description,
      state: cw.state,
      dueDate: cw.dueDate
        ? `${cw.dueDate.year}-${String(cw.dueDate.month).padStart(2, '0')}-${String(cw.dueDate.day).padStart(2, '0')}`
        : undefined,
    }));
  }

  /* ---------------------------------------------------------------- */
  /* Static helpers (no instance needed)                              */
  /* ---------------------------------------------------------------- */

  static generateState(): string {
    return createHash('sha256')
      .update(`${Date.now()}:${crypto.randomUUID()}`)
      .digest('hex');
  }
}
