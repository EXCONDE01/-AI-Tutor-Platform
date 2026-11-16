/**
 * Google Drive API client for file operations
 */

import { googleTokenStore } from './token-store';

const DRIVE_BASE = 'https://www.googleapis.com/drive/v3';

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  webViewLink: string;
  createdTime: string;
  modifiedTime: string;
  parents?: string[];
}

export interface FileList {
  files: DriveFile[];
  nextPageToken?: string;
}

export class GoogleDriveClient {
  constructor(private userId: string) {}

  private async getToken(): Promise<string | null> {
    return await googleTokenStore.getValidAccessToken(this.userId);
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const token = await this.getToken();
    if (!token) throw new Error('No valid Google token available');

    const res = await fetch(`${DRIVE_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google Drive API ${method} ${path} failed: ${res.status} - ${error}`);
    }

    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }

  /**
   * List files in a folder (root by default)
   */
  async listFiles(folderId: string = 'root', query?: string): Promise<DriveFile[]> {
    let url = `/files?q='${folderId}'+in+parents+and+trashed=false`;
    if (query) {
      url += `+and+name+contains+'${encodeURIComponent(query)}'`;
    }
    url += `&fields=files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents)`;
    
    const result = await this.request<FileList>('GET', url);
    return result.files;
  }

  /**
   * Search for files by name
   */
  async searchFiles(query: string): Promise<DriveFile[]> {
    const url = `/files?q=name+contains+'${encodeURIComponent(query)}'+and+trashed=false&fields=files(id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents)`;
    const result = await this.request<FileList>('GET', url);
    return result.files;
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<DriveFile> {
    return this.request<DriveFile>('GET', `/files/${fileId}?fields=id,name,mimeType,size,webViewLink,createdTime,modifiedTime,parents`);
  }

  /**
   * Download file content
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const token = await this.getToken();
    if (!token) throw new Error('No valid Google token available');

    const res = await fetch(`${DRIVE_BASE}/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`File download failed: ${res.status}`);
    }

    return res.blob();
  }

  /**
   * Get file as text (for text-based files)
   */
  async downloadFileAsText(fileId: string): Promise<string> {
    const blob = await this.downloadFile(fileId);
    return await blob.text();
  }
}