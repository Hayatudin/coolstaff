import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
const ImageModule = require('docxtemplater-image-module-free');

const TEMPLATE_MAP: Record<string, string> = {
  'tmpl-alm': 'CV ALM.docx',
  'tmpl-ka7': 'CV KA-7.docx',
  'tmpl-ku2': 'CV KU2.docx',
  'tmpl-ma': 'CV MA.docx',
  'tmpl-ra': 'CV RA.docx',
};

export async function POST(request: Request) {
  try {
    const { candidateId, templateId, format, facePhoto, fullBodyPhoto } = await request.json();

    if (!candidateId || !templateId) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return NextResponse.json({ error: 'Candidate not found' }, { status: 404 });
    }

    let templateFileName = TEMPLATE_MAP[templateId];
    if (!templateFileName) {
      // Fallback for new custom templates that don't have a specific DOCX template yet
      templateFileName = 'CV ALM.docx';
    }

    const templatePath = path.join(process.cwd(), 'templates', templateFileName);

    if (!fs.existsSync(templatePath)) {
      return NextResponse.json({ error: `Template file not found: ${templateFileName}` }, { status: 404 });
    }

    const content = fs.readFileSync(templatePath, 'binary');
    const zip = new PizZip(content);

    // FIX: Strip out grey background highlights, shading, and explicit font colors to force default black text
    const docXmlFile = zip.file('word/document.xml');
    if (docXmlFile) {
      let docXml = docXmlFile.asText();
      // Remove text highlight colors entirely
      docXml = docXml.replace(/<w:highlight[^>]*\/>/g, '');
      // Cleanse Run Properties (w:rPr)
      docXml = docXml.replace(/<w:rPr>([\s\S]*?)<\/w:rPr>/g, (match, inner) => {
        // Remove shading (background color)
        inner = inner.replace(/<w:shd[^>]*\/>/g, '');
        // Remove explicit font color (forces default black)
        inner = inner.replace(/<w:color[^>]*\/>/g, '');
        return `<w:rPr>${inner}</w:rPr>`;
      });

      // ALM Template specific injection for Full Body Photo
      // ALM has a specific empty frame (w="5265" h="8175" x="150" y="4320") designed for the full body photo,
      // but no {%fullBodyPhoto} tag inside it! We inject the tag into the frame's empty paragraph.
      let isAlmFullBodyInjected = false;
      if (!docXml.includes('fullBodyPhoto') && docXml.includes('w:w="5265" w:h="8175"')) {
        docXml = docXml.replace(
          /(<w:framePr w:w="5265" w:h="8175"[^>]+x="150"[^>]+y="4320"\/>[\s\S]*?<\/w:pPr>)/,
          '$1<w:r><w:t>{%fullBodyPhoto}</w:t></w:r>'
        );
        isAlmFullBodyInjected = true;
      }

      // Auto-inject full body photo on a new page ONLY if it wasn't injected into the ALM frame and is missing
      if (!docXml.includes('fullBodyPhoto') && !isAlmFullBodyInjected) {
        const fullBodyInjection = `
          <w:p>
            <w:r><w:br w:type="page"/></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:t>{%fullBodyPhoto}</w:t></w:r>
          </w:p>
        `;
        docXml = docXml.replace('</w:body>', fullBodyInjection + '</w:body>');
      }

      // Auto-inject passport image on a new page if the template is missing it
      if (!docXml.includes('passport image') && !docXml.includes('passportPhoto')) {
        const passportInjection = `
          <w:p>
            <w:r><w:br w:type="page"/></w:r>
          </w:p>
          <w:p>
            <w:pPr><w:jc w:val="center"/></w:pPr>
            <w:r><w:t>{%passport image}</w:t></w:r>
          </w:p>
        `;
        docXml = docXml.replace('</w:body>', passportInjection + '</w:body>');
      }

      // Force all template placeholders (identified by containing '{' or '}') to Times New Roman size 10 (w:val="20")
      docXml = docXml.replace(/<w:r>([\s\S]*?)<\/w:r>/g, (match, inner) => {
        if (inner.includes('{') || inner.includes('}')) {
          // Strip existing fonts and sizes
          inner = inner.replace(/<w:rFonts[^>]*\/>/g, '');
          inner = inner.replace(/<w:sz[^>]*\/>/g, '');
          inner = inner.replace(/<w:szCs[^>]*\/>/g, '');

          const fontStyles = '<w:rFonts w:ascii="Times New Roman" w:hAnsi="Times New Roman" w:cs="Times New Roman" w:eastAsia="Times New Roman"/><w:sz w:val="20"/><w:szCs w:val="20"/>';

          if (inner.includes('<w:rPr>')) {
            inner = inner.replace('<w:rPr>', '<w:rPr>' + fontStyles);
          } else {
            inner = inner.replace('<w:t', '<w:rPr>' + fontStyles + '</w:rPr><w:t');
          }
        }
        return `<w:r>${inner}</w:r>`;
      });

      zip.file('word/document.xml', docXml);
    }

    // Initialize Image Module
    const imageOptions = {
      centered: false,
      getImage: (tagValue: string) => {
        if (!tagValue) return Buffer.from('');
        const base64Data = tagValue.split(',')[1] || tagValue;
        return Buffer.from(base64Data, 'base64');
      },
      getSize: (img: Buffer, tagValue: string, tagName: string) => {
        // Default sizes for CV photos
        if (tagName === 'facePhoto' || tagName === 'photo') return [150, 180];
        if (tagName === 'fullBodyPhoto') {
          // If we are generating for ALM, the box is ~350x545 points. Size it to fit precisely!
          if (templateId === 'tmpl-alm') return [350, 545];
          return [550, 750];
        }
        if (tagName === 'passport image' || tagName === 'passportPhoto') return [550, 750];
        return [150, 150];
      },
    };

    const doc = new Docxtemplater(zip, {
      paragraphLoop: true,
      linebreaks: true,
      modules: [new ImageModule(imageOptions)],
    });

    // Skill Check Helpers
    const skillsArray = Array.isArray(candidate.skills)
      ? candidate.skills.map(String)
      : [];

    const langsArray = Array.isArray(candidate.languages)
      ? candidate.languages.map(String)
      : [];

    const hasSkill = (keyword: string) =>
      skillsArray.some(s => s.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';

    const hasLang = (keyword: string) =>
      langsArray.some(l => l.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';

    const calculateAge = (dob: Date | null | undefined) => {
      if (!dob) return '';
      const diff = Date.now() - dob.getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
    };

    // Helper to fetch Cloudinary/external URLs as Base64 before rendering
    const fetchImageAsBase64 = async (url: string) => {
      if (!url) return '';
      if (url.startsWith('http')) {
        try {
          const res = await fetch(url);
          if (!res.ok) return '';
          const arrayBuffer = await res.arrayBuffer();
          return Buffer.from(arrayBuffer).toString('base64');
        } catch (e) {
          console.error('Failed to fetch image for DOCX:', e);
          return '';
        }
      }
      return url.split(',')[1] || url;
    };

    const facePhotoData = await fetchImageAsBase64(facePhoto || candidate.passportImageUrl || '');
    const fullBodyPhotoData = await fetchImageAsBase64(fullBodyPhoto || candidate.fullBodyPhotoUrl || '');
    const passportPhotoData = await fetchImageAsBase64(candidate.passportImageUrl || '');

    const formatValue = (val: any) => (val && val !== 'undefined' && val !== 'null' ? val : '');

    // Flatten and expand data for template compatibility (English & Arabic aliases)
    const data = {
      // Passport Data
      givenNames: formatValue(candidate.givenNames),
      surname: formatValue(candidate.surname),
      fullName: `${formatValue(candidate.givenNames)} ${formatValue(candidate.surname)}`.trim(),
      passportNumber: formatValue(candidate.passportNumber),
      dateOfBirth: candidate.dateOfBirth ? candidate.dateOfBirth.toISOString().split('T')[0] : '',
      gender: formatValue(candidate.gender),
      nationality: formatValue(candidate.nationality),
      issuingCountry: formatValue(candidate.issuingCountry),
      dateOfIssue: candidate.dateOfIssue ? candidate.dateOfIssue.toISOString().split('T')[0] : '',
      dateOfExpiry: candidate.dateOfExpiry ? candidate.dateOfExpiry.toISOString().split('T')[0] : '',
      placeOfBirth: formatValue(candidate.placeOfBirth),

      // Personal Info
      maritalStatus: formatValue(candidate.maritalStatus),
      numberOfChildren: candidate.numberOfChildren || 0,
      religion: formatValue(candidate.religion),
      bloodType: formatValue(candidate.bloodType),
      height: formatValue(candidate.height),
      weight: formatValue(candidate.weight),
      phone: formatValue(candidate.phone),
      email: formatValue(candidate.email),
      address: formatValue(candidate.address),
      city: formatValue(candidate.city),
      state: formatValue(candidate.state),
      country: formatValue(candidate.country),
      educationLevel: candidate.educationLevel || '',
      languages: langsArray.join(', ') || '',
      workExperience: candidate.workExperience || '',
      skills: skillsArray.join(', ') || '',
      medicalStatus: candidate.medicalStatus || '',
      knownConditions: candidate.knownConditions || '',

      // Dynamic Skills (Yes / No)
      canDoIroning: formatValue(hasSkill('iron')),
      canClean: formatValue(hasSkill('clean')),
      canDoCleaning: formatValue(hasSkill('clean')),
      canCook: formatValue(hasSkill('cook')),
      canDoCoocking: formatValue(hasSkill('cook')),
      'canDoArabic Coocking': formatValue(hasSkill('arabic')),
      canWash: formatValue(hasSkill('wash') || hasSkill('laundry')),
      canDoWashing: formatValue(hasSkill('wash') || hasSkill('laundry')),
      canCareForBaby: formatValue(hasSkill('baby') || hasSkill('child')),
      canDoBabySitting: formatValue(hasSkill('baby')),
      canDoChildrenCare: formatValue(hasSkill('child')),
      canCareForElderly: formatValue(hasSkill('elder') || hasSkill('old')),
      canDrive: formatValue(hasSkill('driv')),
      canDoSewing: formatValue(hasSkill('sew')),
      haveComputerKnowledge: formatValue(hasSkill('computer')),
      canDoTutoring: formatValue(hasSkill('tutor')),
      haveOtherSkills: formatValue(hasSkill('other')),

      // Dynamic Languages (Yes / No)
      canSpeakEnglish: formatValue(hasLang('english')),
      canSpeakArabic: formatValue(hasLang('arabic')),
      canSpeakAmharic: formatValue(hasLang('amharic')),

      // Photos (for ImageModule)
      // Base64 fetched beforehand to ensure synchronous rendering
      facePhoto: facePhotoData,
      photo: facePhotoData,
      fullBodyPhoto: fullBodyPhotoData,
      passportPhoto: passportPhotoData,
      'passport image': passportPhotoData,

      // Meta
      deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      generatedAt: new Date().toLocaleDateString(),

      // Uppercase & Custom Aliases
      FULL_NAME: `${formatValue(candidate.givenNames)} ${formatValue(candidate.surname)}`.trim(),
      NAME_AR: 'الاسم الكامل',
      PASSPORT_NO: formatValue(candidate.passportNumber),
      DOB: candidate.dateOfBirth ? candidate.dateOfBirth.toISOString().split('T')[0] : '',
      NATIONALITY: formatValue(candidate.nationality),
      GENDER: formatValue(candidate.gender),
      PHONE: formatValue(candidate.phone),
      phoneNumber: formatValue(candidate.phone),
      HEIGHT: formatValue(candidate.height),
      WEIGHT: formatValue(candidate.weight),
      EXPERIENCE: formatValue(candidate.workExperience),
      workPeriod: formatValue(candidate.workExperience ? 'Experienced' : 'Fresher'),
      position: formatValue(candidate.job),
      salary: '',
      SKILLS: skillsArray.join(', ') || '',
      PLACE_OF_BIRTH: formatValue(candidate.placeOfBirth),
      AGE: calculateAge(candidate.dateOfBirth),
    };

    doc.render(data);

    const docxBuf = doc.getZip().generate({
      type: 'nodebuffer',
      compression: 'DEFLATE',
    });

    if (format === 'doc') {
      return new NextResponse(docxBuf as unknown as BodyInit, {
        status: 200,
        headers: {
          'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
          'Content-Disposition': `attachment; filename="CV_${candidate.surname}.docx"`,
        },
      });
    }

    // PDF and JPG conversion using Mammoth + Playwright
    try {
      const { chromium } = require(/* webpackIgnore: true */ 'playwright');
      const mammoth = require('mammoth');

      const { value: html } = await mammoth.convertToHtml({ buffer: docxBuf });

      const styledHtml = `
        <html>
          <head>
            <style>
              body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; padding: 50px; line-height: 1.6; color: #333; max-width: 800px; margin: auto; }
              table { width: 100%; border-collapse: collapse; margin-top: 20px; border: 1px solid #ddd; }
              th, td { text-align: left; padding: 12px; border: 1px solid #ddd; }
              th { background-color: #f8f9fa; font-weight: 600; }
              .header { text-align: center; border-bottom: 2px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
              h1 { color: #2563eb; margin: 0; text-transform: uppercase; letter-spacing: 1px; }
              img { max-width: 150px; height: auto; border-radius: 8px; border: 1px solid #ddd; }
            </style>
          </head>
          <body>${html}</body>
        </html>
      `;

      const browser = await chromium.launch();
      const page = await browser.newPage();
      await page.setContent(styledHtml);

      let outputBuf: Buffer;
      let contentType: string;
      let extension: string;

      if (format === 'pdf') {
        outputBuf = await page.pdf({ format: 'A4', printBackground: true });
        contentType = 'application/pdf';
        extension = 'pdf';
      } else {
        outputBuf = await page.screenshot({ type: 'jpeg', fullPage: true });
        contentType = 'image/jpeg';
        extension = 'jpg';
      }

      await browser.close();

      return new NextResponse(outputBuf as any, {
        status: 200,
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="CV_${candidate.surname}.${extension}"`,
        },
      });
    } catch (browserError) {
      console.error('Browser Launch Error:', browserError);
      return NextResponse.json({
        error: 'PDF/JPG generation failed because the system browser is not installed.',
        details: 'Please run "npx playwright install" in your terminal to fix this. Word (DOCX) downloads still work.',
      }, { status: 500 });
    }

  } catch (error: any) {
    console.error('CV Generation Error Details:', error);

    // Handle Docxtemplater MultiError specifically
    if (error.properties && error.properties.errors instanceof Array) {
      const errorMessages = error.properties.errors.map((e: any) => {
        return `${e.name}: ${e.message} (Tag: ${e.properties?.id || e.properties?.name || 'unknown'})`;
      }).join(' | ');

      return NextResponse.json({
        error: 'Template Syntax Error',
        details: `Found errors in the Word template tags: ${errorMessages}`
      }, { status: 400 });
    }

    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json({
      error: 'Failed to generate CV',
      details: errorMessage
    }, { status: 500 });
  }
}

