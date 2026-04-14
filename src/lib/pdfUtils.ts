import * as pdfjs from 'pdfjs-dist';
import mammoth from 'mammoth';

// Set worker source to a reliable ESM-compatible CDN
pdfjs.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/build/pdf.worker.min.mjs`;

export async function extractTextFromPdf(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  
  // Configure with CMaps for better support of non-Latin scripts like Bangla
  const loadingTask = pdfjs.getDocument({
    data: arrayBuffer,
    cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/cmaps/',
    cMapPacked: true,
    standardFontDataUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.6.205/standard_fonts/',
    disableRange: true,
    disableStream: true
  });

  const pdf = await loadingTask.promise;
  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const items = textContent.items as any[];
    
    // Sort items by Y (top to bottom) then X (left to right) to ensure correct reading order
    items.sort((a, b) => {
      if (Math.abs(a.transform[5] - b.transform[5]) > 5) {
        return b.transform[5] - a.transform[5];
      }
      return a.transform[4] - b.transform[4];
    });
    
    let lastY;
    let lastX;
    let lastWidth;
    let pageText = '';
    
    for (const item of items) {
      // Check for line breaks
      if (lastY !== undefined && Math.abs(lastY - item.transform[5]) > 5) {
        pageText += '\n';
        lastX = undefined;
      } else if (lastY !== undefined && lastX !== undefined && lastWidth !== undefined) {
        // Add space if there is a gap between items on the same line
        // For Bangla, we use a slightly larger threshold to avoid splitting words
        const gap = item.transform[4] - (lastX + lastWidth);
        // Average space width is around 3-5 units in PDF coordinate space
        if (gap > 3.5) {
          pageText += ' ';
        }
      }
      
      pageText += item.str;
      lastY = item.transform[5];
      lastX = item.transform[4];
      lastWidth = item.width;
    }
    
    fullText += pageText + '\n\n';
  }

  // Normalize Unicode to NFC (Canonical Composition)
  // This is critical for Bangla to ensure characters are represented consistently
  return fullText.normalize('NFC')
    .split('\n')
    .map(line => line.trim().replace(/\s+/g, ' '))
    .join('\n')
    .trim();
}

export async function extractTextFromWord(file: File): Promise<string> {
  const arrayBuffer = await file.arrayBuffer();
  try {
    const result = await mammoth.extractRawText({ arrayBuffer });
    // Normalize Unicode to NFC
    return result.value.normalize('NFC');
  } catch (error) {
    console.error("Word extraction error:", error);
    throw new Error("Failed to extract text from Word document.");
  }
}
