/**
 * Microsoft Forms integration via Microsoft Graph API
 * Note: Microsoft Forms API is more limited than Google Forms
 */

import { OneDriveClient } from './onedrive';

export interface MicrosoftFormParams {
  title: string;
  description?: string;
  questions: Array<{
    type: 'text' | 'choice' | 'rating' | 'date';
    question: string;
    required?: boolean;
    options?: string[]; // for choice type
  }>;
  fileName?: string;
  folderName?: string;
}

/**
 * Create a Microsoft Form
 * Note: As of 2024, Microsoft Forms creation via Graph API has limitations.
 * The Forms API primarily allows reading responses, not creating forms programmatically.
 * 
 * Workaround: Create a form template manually, then copy it via Graph API,
 * or use the Microsoft Forms web UI and share the link.
 */
export async function createMicrosoftForm(
  userId: string,
  params: MicrosoftFormParams
): Promise<{ formId: string; webUrl: string; shareUrl: string }> {
  // Microsoft Forms creation via API is limited
  // This is a placeholder for the concept
  
  const client = new OneDriveClient(userId);
  
  // For now, create a JSON representation that could be imported
  const formJson = {
    title: params.title,
    description: params.description,
    questions: params.questions.map(q => ({
      type: q.type,
      text: q.question,
      required: q.required ?? false,
      choices: q.options?.map(opt => ({ text: opt })),
    })),
  };
  
  // Save as a JSON file in OneDrive that documents the form structure
  // The teacher would then manually create the form in Microsoft Forms UI
  const buffer = new TextEncoder().encode(JSON.stringify(formJson, null, 2)).buffer;
  
  let folderId = 'root';
  if (params.folderName) {
    const folder = await client.createFolder(params.folderName);
    folderId = folder.id;
  }
  
  const fileName = params.fileName ? `${params.fileName}.json` : `${params.title.replace(/[^a-z0-9]/gi, '_')}_form.json`;
  const uploaded = await client.uploadFile(fileName, buffer, folderId);
  
  return {
    formId: uploaded.id,
    webUrl: uploaded.webUrl,
    shareUrl: `https://forms.office.com/Pages/DesignPage.aspx?origin=NeoPortalPage&route=Start`,
  };
}

/**
 * Get form responses (read-only, works with Graph API)
 */
export async function getFormResponses(
  userId: string,
  formId: string
): Promise<any[]> {
  const token = await (await import('./token-store')).microsoftTokenStore.getValidAccessToken(userId);
  if (!token) throw new Error('No valid Microsoft token available');
  
  const res = await fetch(`https://graph.microsoft.com/v1.0/me/forms/${formId}/responses`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  
  if (!res.ok) {
    throw new Error(`Get form responses failed: ${res.status}`);
  }
  
  const data = await res.json();
  return data.value || [];
}