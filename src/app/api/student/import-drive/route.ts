/**
 * Student Google Drive Import API
 * Allows students to import reading passages from Google Drive
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { GoogleDriveClient } from '@/lib/google/drive';
import { googleTokenStore } from '@/lib/google/token-store';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  try {
    const authSession = await getSession(request);
    if (!authSession.data?.user) {
      return NextResponse.json({ error: 'Unauthenticated' }, { status: 401 });
    }

    const appUser = await ensureAppUser('student', request);
    if (!appUser || appUser.role !== 'student') {
      return NextResponse.json({ error: 'Student access required' }, { status: 403 });
    }

    // Check if student has Google connected
    const connected = await googleTokenStore.hasConnectedGoogle(appUser.user.id);
    if (!connected) {
      return NextResponse.json({ error: 'Google account not connected' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const fileId = searchParams.get('fileId');
    const query = searchParams.get('q');

    const driveClient = new GoogleDriveClient(appUser.user.id);

    switch (action) {
      case 'list': {
        const files = await driveClient.listFiles();
        // Filter for document types
        const docFiles = files.filter(f => 
          f.mimeType === 'application/vnd.google-apps.document' ||
          f.mimeType === 'text/plain' ||
          f.mimeType === 'application/pdf'
        );
        return NextResponse.json({ files: docFiles });
      }

      case 'search': {
        if (!query) {
          return NextResponse.json({ error: 'Query required' }, { status: 400 });
        }
        const files = await driveClient.searchFiles(query);
        const docFiles = files.filter(f => 
          f.mimeType === 'application/vnd.google-apps.document' ||
          f.mimeType === 'text/plain' ||
          f.mimeType === 'application/pdf'
        );
        return NextResponse.json({ files: docFiles });
      }

      case 'download': {
        if (!fileId) {
          return NextResponse.json({ error: 'File ID required' }, { status: 400 });
        }
        const file = await driveClient.getFile(fileId);
        
        if (file.mimeType === 'application/vnd.google-apps.document') {
          // Export Google Doc as plain text
          const content = await driveClient.downloadFileAsText(fileId);
          return NextResponse.json({ 
            file, 
            content,
            type: 'google_doc'
          });
        } else if (file.mimeType === 'text/plain') {
          const content = await driveClient.downloadFileAsText(fileId);
          return NextResponse.json({ 
            file, 
            content,
            type: 'text'
          });
        } else if (file.mimeType === 'application/pdf') {
          // For PDF, return the blob URL - student will need to view it
          return NextResponse.json({ 
            file, 
            content: null,
            type: 'pdf',
            downloadUrl: file.webViewLink
          });
        }
        
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Student Drive Import] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}