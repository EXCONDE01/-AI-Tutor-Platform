/**
 * Multipart file upload endpoint for chat.
 *
 * Accepts POST multipart/form-data with a `file` field.
 * Uploads to Neon Object Storage under `chat-uploads/{sessionId}/{timestamp}-{filename}`.
 * Returns `{ url, key, contentType, size }`.
 *
 * Only authenticated students can upload.
 * Validates file type (image/*, application/pdf) and max size (5MB).
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { uploadFile } from '@/lib/object-storage/client';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];

function isValidType(type: string): boolean {
  return ALLOWED_TYPES.includes(type);
}

export async function POST(request: NextRequest) {
  try {
    // 1) Authenticate student
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('student', request);
    if (!appUser || appUser.role !== 'student') {
      return NextResponse.json({ error: 'Student access required' }, { status: 403 });
    }

    // 2) Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file');

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 3) Validate file type and size
    if (!isValidType(file.type)) {
      return NextResponse.json(
        { error: 'File type not allowed. Allowed: JPEG, PNG, GIF, WebP, PDF' },
        { status: 400 }
      );
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // 4) Generate storage key: chat-uploads/{sessionId}/{timestamp}-{filename}
    const sessionId = formData.get('sessionId') as string | null;
    const sessionPart = sessionId && /^[0-9a-f-]{36}$/i.test(sessionId)
      ? sessionId
      : 'anonymous';
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const key = `chat-uploads/${sessionPart}/${timestamp}-${sanitizedName}`;

    // 5) Upload to Neon Object Storage
    const url = await uploadFile(key, file, file.type);

    return NextResponse.json({
      url,
      key,
      contentType: file.type,
      size: file.size,
    });
  } catch (error) {
    console.error('[chat/upload] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}