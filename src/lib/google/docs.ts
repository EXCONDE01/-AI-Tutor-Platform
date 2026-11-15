/**
 * Google Docs API wrapper
 * Creates documents and appends content
 */

const DOCS_API_BASE = 'https://docs.googleapis.com/v1';

export class GoogleDocsClient {
  constructor(private accessToken: string) {}

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
    const res = await fetch(url, {
      ...options,
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const error = await res.text();
      throw new Error(`Google Docs API error: ${res.status} - ${error}`);
    }
    return res.json() as T;
  }

  async createDocument(title: string, content: string): Promise<{
    documentId: string;
    url: string;
  }> {
    // 1. Create empty document
    const doc = await this.request<{ documentId: string }>(
      `${DOCS_API_BASE}/documents`,
      {
        method: 'POST',
        body: JSON.stringify({ title }),
      }
    );

    // 2. Insert content as batch update
    const requests = this.markdownToRequests(content);
    if (requests.length > 0) {
      await this.request(
        `${DOCS_API_BASE}/documents/${doc.documentId}:batchUpdate`,
        {
          method: 'POST',
          body: JSON.stringify({ requests }),
        }
      );
    }

    return {
      documentId: doc.documentId,
      url: `https://docs.google.com/document/d/${doc.documentId}/edit`,
    };
  }

  private markdownToRequests(markdown: string): any[] {
    // Convert markdown to Google Docs batchUpdate requests
    const requests: any[] = [];
    let index = 1; // Start after document header

    const lines = markdown.split('\n');
    for (const line of lines) {
      if (line.startsWith('# ')) {
        requests.push({
          insertText: { location: { index }, text: line.slice(2) + '\n' },
        });
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: index, endIndex: index + line.slice(2).length + 1 },
            paragraphStyle: { namedStyleType: 'HEADING_1' },
            fields: 'namedStyleType',
          },
        });
      } else if (line.startsWith('## ')) {
        requests.push({
          insertText: { location: { index }, text: line.slice(3) + '\n' },
        });
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: index, endIndex: index + line.slice(3).length + 1 },
            paragraphStyle: { namedStyleType: 'HEADING_2' },
            fields: 'namedStyleType',
          },
        });
      } else if (line.startsWith('### ')) {
        requests.push({
          insertText: { location: { index }, text: line.slice(4) + '\n' },
        });
        requests.push({
          updateParagraphStyle: {
            range: { startIndex: index, endIndex: index + line.slice(4).length + 1 },
            paragraphStyle: { namedStyleType: 'HEADING_3' },
            fields: 'namedStyleType',
          },
        });
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