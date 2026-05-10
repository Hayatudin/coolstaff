import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import mammoth from 'mammoth';

const TEMPLATE_MAP: Record<string, string> = {
  'tmpl-alm': 'CV ALM.docx',
  'tmpl-ka7': 'CV KA-7.docx',
  'tmpl-ku2': 'CV KU2.docx',
  'tmpl-ma': 'CV MA.docx',
  'tmpl-ra': 'CV RA.docx',
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const templateId = searchParams.get('templateId');

  if (!templateId || !TEMPLATE_MAP[templateId]) {
    return NextResponse.json({ error: 'Valid Template ID required' }, { status: 400 });
  }

  try {
    const templateFileName = TEMPLATE_MAP[templateId];
    const templatePath = path.join(process.cwd(), 'templates', templateFileName);

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: 'Template file not found' }, { status: 404 });
    }

    const buffer = fs.readFileSync(templatePath);
    
    // Use mammoth to convert the actual DOCX to HTML for preview
    const { value: html } = await mammoth.convertToHtml({ buffer });

    return NextResponse.json({ html });
  } catch (error) {
    console.error('Preview Generation Error:', error);
    return NextResponse.json({ error: 'Failed to generate preview' }, { status: 500 });
  }
}
