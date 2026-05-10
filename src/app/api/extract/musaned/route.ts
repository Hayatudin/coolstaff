import { NextResponse } from 'next/server';
import { parseMusanedText } from '@/lib/parsers/musaned';

export const maxDuration = 30; // Allow up to 30 seconds for PDF processing

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    if (file.type !== 'application/pdf') {
      return NextResponse.json({ error: 'File must be a PDF' }, { status: 400 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Dynamic import to avoid Vercel bundling issues with pdf-parse
    const pdfParse = (await import('pdf-parse/lib/pdf-parse.js')).default;

    // Read the PDF
    const pdfData = await pdfParse(buffer);
    
    // Parse the extracted text
    const extractedData = parseMusanedText(pdfData.text);

    return NextResponse.json({
      success: true,
      rawText: pdfData.text,
      data: extractedData
    });

  } catch (error: any) {
    console.error('Error extracting Musaned PDF:', error);
    return NextResponse.json(
      { error: 'Failed to process the PDF document. Please ensure it is a valid Musaned export.' },
      { status: 500 }
    );
  }
}
