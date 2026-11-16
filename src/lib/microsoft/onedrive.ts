/**
 * Microsoft OneDrive/Graph API client for file operations
 */

import { microsoftTokenStore } from './token-store';

const GRAPH_BASE = 'https://graph.microsoft.com/v1.0';

export interface OneDriveFile {
  id: string;
  name: string;
  size: number;
  webUrl: string;
  '@microsoft.graph.downloadUrl'?: string;
  createdDateTime: string;
  lastModifiedDateTime: string;
  file?: {
    mimeType: string;
    hashes: {
      quickXorHash: string;
    };
  };
  folder?: {
    childCount: number;
  };
}

export interface DriveItemList {
  value: OneDriveFile[];
  '@odata.nextLink'?: string;
}

export interface UploadSession {
  uploadUrl: string;
  expirationDateTime: string;
  nextExpectedRanges: string[];
}

export class OneDriveClient {
  constructor(private userId: string) {}

  private async getToken(): Promise<string | null> {
    return await microsoftTokenStore.getValidAccessToken(this.userId);
  }

  private async request<T>(method: string, path: string, body?: any): Promise<T> {
    const token = await this.getToken();
    if (!token) throw new Error('No valid Microsoft token available');

    const res = await fetch(`${GRAPH_BASE}${path}`, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: body ? JSON.stringify(body) : undefined,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`OneDrive API ${method} ${path} failed: ${res.status} - ${error}`);
    }

    if (res.status === 204) return {} as T;
    return (await res.json()) as T;
  }

  /**
   * Get user's drive info
   */
  async getDrive() {
    return this.request<{ id: string; driveType: string }>('GET', '/me/drive');
  }

  /**
   * List files in a folder (root by default)
   */
  async listFiles(folderId: string = 'root'): Promise<OneDriveFile[]> {
    const result = await this.request<DriveItemList>('GET', `/me/drive/items/${folderId}/children?$select=id,name,size,webUrl,createdDateTime,lastModifiedDateTime,file,folder`);
    return result.value;
  }

  /**
   * Search for files by name
   */
  async searchFiles(query: string): Promise<OneDriveFile[]> {
    const result = await this.request<DriveItemList>('GET', `/me/drive/root/search(q='${encodeURIComponent(query)}')?$select=id,name,size,webUrl,createdDateTime,lastModifiedDateTime,file,folder`);
    return result.value;
  }

  /**
   * Get file metadata
   */
  async getFile(fileId: string): Promise<OneDriveFile> {
    return this.request<OneDriveFile>('GET', `/me/drive/items/${fileId}?$select=id,name,size,webUrl,createdDateTime,lastModifiedDateTime,file,folder,@microsoft.graph.downloadUrl`);
  }

  /**
   * Download file content
   */
  async downloadFile(fileId: string): Promise<Blob> {
    const token = await this.getToken();
    if (!token) throw new Error('No valid Microsoft token available');

    const res = await fetch(`${GRAPH_BASE}/me/drive/items/${fileId}/content`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!res.ok) {
      throw new Error(`File download failed: ${res.status}`);
    }

    return res.blob();
  }

  /**
   * Create upload session for large files
   */
  async createUploadSession(fileName: string, folderId: string = 'root'): Promise<UploadSession> {
    return this.request<UploadSession>('POST', `/me/drive/items/${folderId}/items/${encodeURIComponent(fileName)}/createUploadSession`, {
      item: {
        '@microsoft.graph.conflictBehavior': 'rename',
        name: fileName,
      },
    });
  }

  /**
   * Upload small file (< 4MB) directly
   */
  async uploadFile(fileName: string, content: Blob | ArrayBuffer, folderId: string = 'root'): Promise<OneDriveFile> {
    const token = await this.getToken();
    if (!token) throw new Error('No valid Microsoft token available');

    const res = await fetch(`${GRAPH_BASE}/me/drive/items/${folderId}/items/${encodeURIComponent(fileName)}/content`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/octet-stream',
      },
      body: content,
    });

    if (!res.ok) {
      const error = await res.text();
      throw new Error(`File upload failed: ${res.status} - ${error}`);
    }

    return (await res.json()) as OneDriveFile;
  }

  /**
   * Create a folder
   */
  async createFolder(folderName: string, parentId: string = 'root'): Promise<OneDriveFile> {
    return this.request<OneDriveFile>('POST', `/me/drive/items/${parentId}/children`, {
      name: folderName,
      folder: {},
      '@microsoft.graph.conflictBehavior': 'rename',
    });
  }

  /**
   * Delete file/folder
   */
  async deleteItem(itemId: string): Promise<void> {
    await this.request('DELETE', `/me/drive/items/${itemId}`);
  }

  /**
   * Copy file to another location
   */
  async copyItem(itemId: string, parentId: string, newName?: string): Promise<OneDriveFile> {
    return this.request<OneDriveFile>('POST', `/me/drive/items/${itemId}/copy`, {
      parentReference: { id: parentId },
      name: newName,
    });
  }
}