/**
 * Microsoft Word Online document creation via Microsoft Graph API
 * Uses the 'docx' library to generate proper .docx files
 */

import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { OneDriveClient } from './onedrive';

export interface WordDocumentParams {
  title: string;
  sections: Array<{
    heading: string;
    body: string;
    level?: 1 | 2 | 3;
  }>;
  fileName: string;
  folderName?: string;
}

/**
 * Create a Word document in OneDrive
 */
export async function createWordDocument(
  userId: string,
  params: WordDocumentParams
): Promise<{ fileId: string; webUrl: string }> {
  const client = new OneDriveClient(userId);
  
  // Generate the .docx buffer
  const docxBuffer = await generateDocxBuffer(params);
  
  // Determine target folder
  let folderId = 'root';
  if (params.folderName) {
    const folder = await client.createFolder(params.folderName);
    folderId = folder.id;
  }
  
  // Upload the document
  const fileName = params.fileName.endsWith('.docx') ? params.fileName : `${params.fileName}.docx`;
  const uploaded = await client.uploadFile(fileName, docxBuffer, folderId);
  
  return {
    fileId: uploaded.id,
    webUrl: uploaded.webUrl,
  };
}

/**
 * Generate a .docx file buffer using the docx library
 */
async function generateDocxBuffer(params: WordDocumentParams): Promise<ArrayBuffer> {
  const { title, sections, fileName } = params;
  
  const children = [
    new Paragraph({
      text: title,
      heading: HeadingLevel.TITLE,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400 },
    }),
  ];
  
  for (const section of sections) {
    const headingLevel = section.level === 1 ? HeadingLevel.HEADING_1 
      : section.level === 2 ? HeadingLevel.HEADING_2 
      : HeadingLevel.HEADING_3;
    
    children.push(
      new Paragraph({
        text: section.heading,
        heading: headingLevel,
        spacing: { before: 200, after: 100 },
      }),
      new Paragraph({
        text: section.body,
        spacing: { after: 200 },
      })
    );
  }
  
  const doc = new Document({
    sections: [{
      properties: {},
      children,
    }],
  });
  
  const buffer = await Packer.toBuffer(doc);
  // Convert Node.js Buffer to ArrayBuffer
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}