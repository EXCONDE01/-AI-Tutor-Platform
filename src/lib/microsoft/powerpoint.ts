/**
 * Microsoft PowerPoint Online presentation creation via Microsoft Graph API
 * Uses PptxGenJS to generate .pptx files
 */

import pptxgen from 'pptxgenjs';
import { OneDriveClient } from './onedrive';

export interface PowerPointParams {
  title: string;
  slides: Array<{
    title: string;
    content: string[];
    layout?: 'title' | 'titleAndContent' | 'twoContent' | 'blank';
  }>;
  fileName: string;
  folderName?: string;
}

/**
 * Create a PowerPoint presentation in OneDrive
 */
export async function createPowerPoint(
  userId: string,
  params: PowerPointParams
): Promise<{ fileId: string; webUrl: string }> {
  const client = new OneDriveClient(userId);

  // Generate the .pptx buffer using PptxGenJS
  const pptxBuffer = await generatePptxBuffer(params);

  // Determine target folder
  let folderId = 'root';
  if (params.folderName) {
    const folder = await client.createFolder(params.folderName);
    folderId = folder.id;
  }

  // Upload the presentation
  const fileName = params.fileName.endsWith('.pptx') ? params.fileName : `${params.fileName}.pptx`;
  const uploaded = await client.uploadFile(fileName, pptxBuffer, folderId);

  return {
    fileId: uploaded.id,
    webUrl: uploaded.webUrl,
  };
}

/**
 * Generate a .pptx file buffer using PptxGenJS
 */
async function generatePptxBuffer(params: PowerPointParams): Promise<ArrayBuffer> {
  const pptx = new pptxgen();

  // Title slide
  const titleSlide = pptx.addSlide();
  titleSlide.addText(params.title, { 
    fontSize: 44, 
    bold: true, 
    color: '363636', 
    x: '10%', 
    y: '30%', 
    w: '80%',
    align: 'center'
  });

  // Content slides
  for (const slide of params.slides) {
    const s = pptx.addSlide();
    s.addText(slide.title, { 
      fontSize: 32, 
      bold: true, 
      color: '363636', 
      x: 0.5, 
      y: 0.5, 
      w: '90%' 
    });

    let y = 1.5;
    for (const content of slide.content) {
      s.addText(content, { 
        fontSize: 18, 
        color: '363636', 
        x: 0.5, 
        y, 
        w: '90%' 
      });
      y += 0.6;
    }
  }

  const buffer = await pptx.write({ outputType: 'arraybuffer' });
  return buffer as ArrayBuffer;
}