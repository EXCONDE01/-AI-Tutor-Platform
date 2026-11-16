/**
 * Student OneDrive Import API
 * Allows students to import reading passages from OneDrive
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth/server';
import { ensureAppUser } from '@/lib/auth/provision';
import { OneDriveClient } from '@/lib/microsoft/onedrive';
import { microsoftTokenStore } from '@/lib/microsoft/token-store';

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

    // Check if student has Microsoft connected
    const connected = await microsoftTokenStore.hasConnectedMicrosoft(appUser.user.id);
    if (!connected) {
      return NextResponse.json({ error: 'Microsoft account not connected' }, { status: 400 });
    }

    const { searchParams } = new URL(request.url);
    const action = searchParams.get('action');
    const fileId = searchParams.get('fileId');
    const query = searchParams.get('q');

    const driveClient = new OneDriveClient(appUser.user.id);

    switch (action) {
      case 'list': {
        const files = await driveClient.listFiles();
        // Filter for document types
        const docFiles = files.filter(f => 
          f.file?.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          f.file?.mimeType === 'text/plain' ||
          f.file?.mimeType === 'application/pdf'
        );
        return NextResponse.json({ files: docFiles });
      }

      case 'search': {
        if (!query) {
          return NextResponse.json({ error: 'Query required' }, { status: 400 });
        }
        const files = await driveClient.searchFiles(query);
        const docFiles = files.filter(f => 
          f.file?.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          f.file?.mimeType === 'text/plain' ||
          f.file?.mimeType === 'application/pdf'
        );
        return NextResponse.json({ files: docFiles });
      }

      case 'download': {
        if (!fileId) {
          return NextResponse.json({ error: 'File ID required' }, { status: 400 });
        }
        const file = await driveClient.getFile(fileId);
        
        if (file.file?.mimeType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
          // For .docx files, we'd need to parse them - return download info
          const blob = await driveClient.downloadFile(fileId);
          // Convert to text would need a docx parser - for now return download URL
          return NextResponse.json({ 
            file, 
            content: null,
            type: 'docx',
            downloadUrl: file['@microsoft.graph.downloadUrl'] || file.webUrl
          });
        } else if (file.file?.mimeType === 'text/plain') {
          const blob = await driveClient.downloadFile(fileId);
          const content = await blob.text();
          return NextResponse.json({ 
            file, 
            content,
            type: 'text'
          });
        } else if (file.file?.mimeType === 'application/pdf') {
          return NextResponse.json({ 
            file, 
            content: null,
            type: 'pdf',
            downloadUrl: file['@microsoft.graph.downloadUrl'] || file.webUrl
          });
        }
        
        return NextResponse.json({ error: 'Unsupported file type' }, { status: 400 });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('[Student OneDrive Import] Error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}