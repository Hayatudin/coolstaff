import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
const ImageModule = require('docxtemplater-image-module-free');
import mammoth from 'mammoth';
import { chromium } from 'playwright';
import QRCode from 'qrcode';
import JSZip from 'jszip';
import crypto from 'crypto';

const router = Router();

interface BulkJob {
  progress: number;
  total: number;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  zipBuffer?: Buffer;
  error?: string;
  expiresAt: number;
}

const bulkJobs: Record<string, BulkJob> = {};

// Clean up expired jobs (older than 15 minutes) every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [jobId, job] of Object.entries(bulkJobs)) {
    if (now > job.expiresAt) {
      delete bulkJobs[jobId];
      console.log(`[Bulk CV] Cleaned up expired job: ${jobId}`);
    }
  }
}, 5 * 60 * 1000);

const fetchImageAsBase64 = async (url: string) => {
  if (!url) return '';

  // If it's already a base64 data URL, just strip the prefix
  if (url.startsWith('data:')) {
    return url.split(',')[1] || url;
  }

  // Try local file system first (faster and more reliable on cPanel)
  try {
    // Handle both relative paths and absolute-looking relative paths
    let cleanUrl = url.startsWith('http') ? new URL(url).pathname : url;

    // If it uses our new proxy route /api/assets/..., strip it to get the real path
    if (cleanUrl.includes('/api/assets/')) {
      cleanUrl = cleanUrl.split('/api/assets/')[1];
    }

    const relativePath = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl;

    // Try common locations: root/public/uploads or root/uploads
    const pathsToTry = [
      path.join(process.cwd(), 'public', relativePath),
      path.join(process.cwd(), relativePath),
      path.join(process.cwd(), '..', 'public', relativePath),
      path.join(process.cwd(), 'public', 'uploads', relativePath),
    ];

    for (const localPath of pathsToTry) {
      if (fs.existsSync(localPath)) {
        console.log(`[DOCX] Found local image at: ${localPath}`);
        return fs.readFileSync(localPath, 'base64');
      }
    }
  } catch (e) {
    console.warn(`[DOCX] Local read failed for: ${url}`, e);
  }

  // Fallback to remote fetch if local fails
  if (url.startsWith('http')) {
    try {
      console.log(`[DOCX] Fetching remote image: ${url}`);
      const res = await fetch(url);
      if (res.ok) {
        const arrayBuffer = await res.arrayBuffer();
        return Buffer.from(arrayBuffer).toString('base64');
      }
    } catch (e) {
      console.warn(`[DOCX] Remote fetch failed: ${url}`);
    }
  }

  return '';
};

const calculateAge = (dob: Date | null | undefined) => {
  if (!dob) return '';
  const diff = Date.now() - dob.getTime();
  const ageDate = new Date(diff);
  return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
};

const TEMPLATE_MAP: Record<string, string> = {
  'tmpl-alm': 'CV ALM.docx',
  'tmpl-ka7': 'CV KA-7-v3.docx',
  'tmpl-ku2': 'CV KU2.docx',
  'tmpl-ma': 'CV MA.docx',
  'tmpl-ra': 'CV RA.docx',
  'tmpl-al-shablan': 'CV Al-shablan.docx',
  'tmpl-ussus': 'CV Ussus.docx',
};

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const { candidateId, templateId, format, facePhoto, fullBodyPhoto } = req.body;

    if (!candidateId || !templateId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id: candidateId },
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    if (candidate.isLocked) {
      return res.status(403).json({ error: 'This candidate is locked. CV downloading is restricted.' });
    }

    const templateRef = TEMPLATE_MAP[templateId];
    if (!templateRef) {
      return res.status(400).json({ error: `Invalid template ID: ${templateId}` });
    }

    // PDF / Image formatting (Playwright logic remains intact)
    if (format === 'pdf' || format === 'image' || format === 'jpg') {
      const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
      try {
        const page = await browser.newPage();

        // Construct the print URL (assuming client is on port 3000)
        // NOTE: For 'al-shablan' or 'ussus', the printUrl uses the route name
        const clientTemplateRoute = (templateRef === 'CV Al-shablan.docx' ? 'al-shablan' : (templateRef === 'CV Ussus.docx' ? 'ussus' : templateRef));
        const printUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/cv-print/${candidateId}/${clientTemplateRoute}`;
        console.log('Generating from URL:', printUrl);

        await page.goto(printUrl, { waitUntil: 'networkidle' });

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
        res.setHeader('Content-Type', contentType);
        res.setHeader('Content-Disposition', `attachment; filename="CV_${candidate.surname}.${extension}"`);
        return res.send(outputBuf);
      } catch (err: any) {
        await browser.close();
        throw err;
      }
    }

    // DOCX formatting (docxtemplater logic)
    if (format === 'doc' || format === 'docx') {
      const templatePath = path.join(process.cwd(), 'templates', templateRef);
      if (!fs.existsSync(templatePath)) {
        return res.status(404).json({ error: `Template file not found: ${templateRef}` });
      }

      const content = fs.readFileSync(templatePath, 'binary');
      const zip = new PizZip(content);

      const docXmlFile = zip.file('word/document.xml');
      if (docXmlFile) {
        let docXml = docXmlFile.asText();
        docXml = docXml.replace(/<w:highlight[^>]*\/>/g, ''); // Clear highlights if any

        let isAlmFullBodyInjected = false;
        if (!docXml.includes('fullBodyPhoto') && docXml.includes('w:w="5265" w:h="8175"')) {
          docXml = docXml.replace(
            /(<w:framePr w:w="5265" w:h="8175"[^>]+x="150"[^>]+y="4320"\/>[\s\S]*?<\/w:pPr>)/,
            '$1<w:r><w:t>{%fullBodyPhoto}</w:t></w:r>'
          );
          isAlmFullBodyInjected = true;
        }

        if (!docXml.includes('fullBodyPhoto') && !isAlmFullBodyInjected) {
          const fullBodyInjection = `<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%fullBodyPhoto}</w:t></w:r></w:p>`;
          docXml = docXml.replace('</w:body>', fullBodyInjection + '</w:body>');
        }

        if (templateId !== 'tmpl-ussus' && !docXml.includes('passport image') && !docXml.includes('passportPhoto')) {
          const passportInjection = `<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%passport image}</w:t></w:r></w:p>`;
          docXml = docXml.replace('</w:body>', passportInjection + '</w:body>');
        }

        zip.file('word/document.xml', docXml);
      }

      const sizeOf = require('image-size');
      const imageOptions = {
        centered: true,
        getImage: (tagValue: string) => {
          if (!tagValue) return Buffer.from('');
          const base64Data = tagValue.split(',')[1] || tagValue;
          return Buffer.from(base64Data, 'base64');
        },
        getSize: (img: Buffer, tagValue: string, tagName: string) => {
          if (tagName === 'qrCode') return [100, 100];

          let maxWidth = 150;
          let maxHeight = 180;

          if (tagName === 'facePhoto' || tagName === 'photo') {
            if (templateId === 'tmpl-ussus') {
              maxWidth = 220; maxHeight = 270;
            } else if (templateId === 'tmpl-al-shablan') {
              maxWidth = 150; maxHeight = 165;
            } else {
              maxWidth = 150; maxHeight = 180;
            }
          } else if (tagName === 'fullBodyPhoto') {
            if (templateId === 'tmpl-ussus') {
              maxWidth = 250; maxHeight = 500;
            } else if (templateId === 'tmpl-al-shablan') {
              maxWidth = 240; maxHeight = 600;
            } else {
              maxWidth = 320; maxHeight = 580;
            }
          } else if (tagName === 'passport image' || tagName === 'passportPhoto') {
            maxWidth = 550;
            maxHeight = 750;
          }

          try {
            const dimensions = sizeOf(img);
            console.log(`[DOCX] Image ${tagName} original size: ${dimensions.width}x${dimensions.height}`);
            const ratio = dimensions.width / dimensions.height;

            if (ratio > maxWidth / maxHeight) {
              // Limited by width
              return [maxWidth, Math.round(maxWidth / ratio)];
            } else {
              // Limited by height
              return [Math.round(maxHeight * ratio), maxHeight];
            }
          } catch (e) {
            console.warn(`[DOCX] Failed to get dimensions for ${tagName}`, e);
            return [maxWidth, maxHeight];
          }
        },
      };

      const doc = new Docxtemplater(zip, {
        paragraphLoop: true,
        linebreaks: true,
        modules: [new ImageModule(imageOptions)],
      });

      const skillsArray = Array.isArray(candidate.skills) ? candidate.skills.map(String) : [];
      const langsArray = Array.isArray(candidate.languages) ? candidate.languages.map(String) : [];
      const hasSkill = (keyword: string) => skillsArray.some((s: string) => s.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';
      const hasLang = (keyword: string) => langsArray.some((l: string) => l.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';


      const [facePhotoData, fullBodyPhotoData, passportPhotoData] = await Promise.all([
        fetchImageAsBase64(facePhoto || candidate.passportImageUrl || ''),
        fetchImageAsBase64(fullBodyPhoto || candidate.fullBodyPhotoUrl || ''),
        fetchImageAsBase64(candidate.passportImageUrl || '')
      ]);
      let finalVideoUrl = (candidate as any).videoUrl;
      try {
        const rawRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT Youtube_URL FROM \`Candidate\` WHERE id = ?`,
          candidateId
        );
        if (rawRows.length > 0 && rawRows[0].Youtube_URL) {
          finalVideoUrl = rawRows[0].Youtube_URL;
        }
      } catch (_) {}
      const qrCodeData = finalVideoUrl ? await QRCode.toDataURL(finalVideoUrl) : '';

      const formatValue = (val: any) => (val && val !== 'undefined' && val !== 'null' && String(val).trim() !== '' ? val : '-');

      const data = {
        refNumber: candidate.id.slice(-6).toUpperCase(),
        givenNames: formatValue(candidate.givenNames),
        surname: formatValue(candidate.surname),
        fullName: `${formatValue(candidate.givenNames)} ${formatValue(candidate.surname)}`.replace(/-/g, '').trim() || '-',
        passportNumber: formatValue(candidate.passportNumber),
        dateOfBirth: candidate.dateOfBirth ? candidate.dateOfBirth.toISOString().split('T')[0] : '-',
        dob: candidate.dateOfBirth ? candidate.dateOfBirth.toISOString().split('T')[0] : '-',
        gender: formatValue(candidate.gender),
        nationality: formatValue(candidate.nationality),
        issuingCountry: formatValue(candidate.issuingCountry),
        dateOfIssue: candidate.dateOfIssue ? candidate.dateOfIssue.toISOString().split('T')[0] : '-',
        issueDate: candidate.dateOfIssue ? candidate.dateOfIssue.toISOString().split('T')[0] : '-',
        dateOfExpiry: candidate.dateOfExpiry ? candidate.dateOfExpiry.toISOString().split('T')[0] : '-',
        expiryDate: candidate.dateOfExpiry ? candidate.dateOfExpiry.toISOString().split('T')[0] : '-',
        issuePlace: formatValue(candidate.issuingCountry),
        maritalStatus: formatValue(candidate.maritalStatus),
        numberOfChildren: candidate.numberOfChildren || 0,
        religion: formatValue(candidate.religion),
        bloodType: formatValue(candidate.bloodType),
        height: formatValue(candidate.height),
        weight: formatValue(candidate.weight),
        phone: formatValue(candidate.phone),
        email: formatValue(candidate.email),
        address: formatValue(candidate.city),
        city: formatValue(candidate.city),
        state: formatValue(candidate.state),
        country: formatValue(candidate.country),
        educationLevel: formatValue(candidate.educationLevel),
        languages: langsArray.join(', ') || '-',
        workExperience: formatValue(candidate.workExperience),
        skills: skillsArray.join(', ') || '-',
        medicalStatus: formatValue(candidate.medicalStatus),
        knownConditions: formatValue(candidate.knownConditions),
        emergencyName: formatValue(candidate.emergencyContactName),
        emergencyPhone: formatValue(candidate.emergencyContactPhone),
        job: formatValue(candidate.job),
        age: calculateAge(candidate.dateOfBirth),

        // Skill specific tags
        skillBaby: formatValue(hasSkill('baby')),
        skillChildren: formatValue(hasSkill('child')),
        skillTutor: formatValue(hasSkill('tutor')),
        skillComputer: formatValue(hasSkill('computer')),
        skillClean: formatValue(hasSkill('clean')),
        skillWash: formatValue(hasSkill('wash')),
        skillIron: formatValue(hasSkill('iron')),
        skillCook: formatValue(hasSkill('cook')),
        skillArabicCook: formatValue(hasSkill('arabic')),
        skillSew: formatValue(hasSkill('sew')),
        skillDrive: formatValue(hasSkill('driv')),
        skillDisabled: formatValue(hasSkill('disabl')),

        // Language specific tags
        english: formatValue(hasLang('english')),
        arabic: formatValue(hasLang('arabic')),

        qrCode: qrCodeData,

        // Experience placeholders
        expCountry: '-',
        expPeriod: '-',

        facePhoto: facePhotoData,
        photo: facePhotoData,
        fullBodyPhoto: fullBodyPhotoData,
        passportPhoto: passportPhotoData,
        'passport image': passportPhotoData,
        deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
        generatedAt: new Date().toLocaleDateString(),
        FULL_NAME: `${formatValue(candidate.givenNames)} ${formatValue(candidate.surname)}`.replace(/-/g, '').trim() || '-',
        NAME_AR: 'الاسم الكامل',
        PASSPORT_NO: formatValue(candidate.passportNumber),
        DOB: candidate.dateOfBirth ? candidate.dateOfBirth.toISOString().split('T')[0] : '-',
        NATIONALITY: formatValue(candidate.nationality),
        GENDER: formatValue(candidate.gender),
        PHONE: formatValue(candidate.phone),
        phoneNumber: formatValue(candidate.phone),
        HEIGHT: formatValue(candidate.height),
        WEIGHT: formatValue(candidate.weight),
        EXPERIENCE: formatValue(candidate.workExperience),
        workPeriod: formatValue(candidate.workExperience ? 'Experienced' : 'Fresher'),
        position: formatValue(candidate.job),
        salary: '-',
        SKILLS: skillsArray.join(', ') || '-',
        PLACE_OF_BIRTH: formatValue(candidate.placeOfBirth),
        AGE: calculateAge(candidate.dateOfBirth),
        expPosition: '-',
      };

      const exps = Array.isArray(candidate.workExperience) ? candidate.workExperience as any[] : [];
      const validExp = exps.find(e => e.experienceStatus === 'Have experience');
      if (validExp) {
        data.expCountry = validExp.country || '-';
        data.expPeriod = validExp.yearsOfExperience ? `${validExp.yearsOfExperience} YEARS` : '-';
        data.expPosition = validExp.position || candidate.job || '-';
      }

      doc.render(data);

      const docxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
      res.setHeader('Content-Disposition', `attachment; filename="CV_${candidate.surname}.docx"`);
      return res.send(docxBuf);
    }

  } catch (error: any) {
    console.error('CV Generation Error:', error);
    res.status(500).json({ error: 'Failed to generate CV' });
  }
});

router.post('/bulk-generate', async (req: Request, res: Response) => {
  try {
    const { candidateIds, format } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length === 0 || !format) {
      return res.status(400).json({ error: 'Missing candidateIds or format' });
    }

    const jobId = crypto.randomUUID();
    bulkJobs[jobId] = {
      progress: 0,
      total: candidateIds.length,
      status: 'pending',
      expiresAt: Date.now() + 15 * 60 * 1000 // expires in 15 mins
    };

    res.json({ jobId });

    // Start background processing
    (async () => {
      bulkJobs[jobId].status = 'processing';
      const zip = new JSZip();

      try {
        const candidates = await prisma.candidate.findMany({
          where: { 
            id: { in: candidateIds },
            isLocked: false
          },
          include: { generatedCVs: true }
        });

        if (format === 'doc' || format === 'docx') {
          const BATCH_SIZE = 20;
          const errors: string[] = [];

          for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
            const batch = candidates.slice(i, i + BATCH_SIZE);
            await Promise.all(batch.map(async (candidate) => {
              try {
                const firstCv = candidate.generatedCVs?.[0];
                const rawTemplateId = firstCv ? firstCv.templateId : 'alm';
                const templateId = rawTemplateId.startsWith('tmpl-') ? rawTemplateId : `tmpl-${rawTemplateId}`;

                const templateRef = TEMPLATE_MAP[templateId] || 'CV ALM.docx';
                const templatePath = path.join(process.cwd(), 'templates', templateRef);
                if (!fs.existsSync(templatePath)) {
                  throw new Error(`Template not found: ${templateRef}`);
                }

                const content = fs.readFileSync(templatePath, 'binary');
                const candidateZip = new PizZip(content);

                const docXmlFile = candidateZip.file('word/document.xml');
                if (docXmlFile) {
                  let docXml = docXmlFile.asText();
                  docXml = docXml.replace(/<w:highlight[^>]*\/>/g, ''); // Clear highlights if any

                  let isAlmFullBodyInjected = false;
                  if (!docXml.includes('fullBodyPhoto') && docXml.includes('w:w="5265" w:h="8175"')) {
                    docXml = docXml.replace(
                      /(<w:framePr w:w="5265" w:h="8175"[^>]+x="150"[^>]+y="4320"\/>[\s\S]*?<\/w:pPr>)/,
                      '$1<w:r><w:t>{%fullBodyPhoto}</w:t></w:r>'
                    );
                    isAlmFullBodyInjected = true;
                  }

                  if (!docXml.includes('fullBodyPhoto') && !isAlmFullBodyInjected) {
                    const fullBodyInjection = `<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%fullBodyPhoto}</w:t></w:r></w:p>`;
                    docXml = docXml.replace('</w:body>', fullBodyInjection + '</w:body>');
                  }

                  if (templateId !== 'tmpl-ussus' && !docXml.includes('passport image') && !docXml.includes('passportPhoto')) {
                    const passportInjection = `<w:p><w:r><w:br w:type="page"/></w:r></w:p><w:p><w:pPr><w:jc w:val="center"/></w:pPr><w:r><w:t>{%passport image}</w:t></w:r></w:p>`;
                    docXml = docXml.replace('</w:body>', passportInjection + '</w:body>');
                  }

                  candidateZip.file('word/document.xml', docXml);
                }

                const facePhotoUrl = firstCv ? firstCv.facePhotoUrl : candidate.facePhotoUrl;
                const fullBodyPhotoUrl = firstCv ? firstCv.fullBodyPhotoUrl : candidate.fullBodyPhotoUrl;

                const [facePhotoData, fullBodyPhotoData, passportPhotoData] = await Promise.all([
                  fetchImageAsBase64(facePhotoUrl || candidate.passportImageUrl || ''),
                  fetchImageAsBase64(fullBodyPhotoUrl || candidate.fullBodyPhotoUrl || ''),
                  fetchImageAsBase64(candidate.passportImageUrl || '')
                ]);

                let finalVideoUrl = (candidate as any).videoUrl;
                try {
                  const rawRows: any[] = await prisma.$queryRawUnsafe(
                    `SELECT Youtube_URL FROM \`Candidate\` WHERE id = ?`,
                    candidate.id
                  );
                  if (rawRows.length > 0 && rawRows[0].Youtube_URL) {
                    finalVideoUrl = rawRows[0].Youtube_URL;
                  }
                } catch (_) {}
                const qrCodeData = finalVideoUrl ? await QRCode.toDataURL(finalVideoUrl) : '';

                const skillsArray = Array.isArray(candidate.skills) ? candidate.skills.map(String) : [];
                const langsArray = Array.isArray(candidate.languages) ? candidate.languages.map(String) : [];
                const hasSkill = (keyword: string) => skillsArray.some((s: string) => s.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';
                const hasLang = (keyword: string) => langsArray.some((l: string) => l.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';

                const formatValue = (val: any) => (val && val !== 'undefined' && val !== 'null' && String(val).trim() !== '' ? val : '-');

                const data = {
                  refNumber: candidate.id.slice(-6).toUpperCase(),
                  givenNames: formatValue(candidate.givenNames),
                  surname: formatValue(candidate.surname),
                  fullName: `${formatValue(candidate.givenNames)} ${formatValue(candidate.surname)}`.replace(/-/g, '').trim() || '-',
                  passportNumber: formatValue(candidate.passportNumber),
                  dateOfBirth: candidate.dateOfBirth ? candidate.dateOfBirth.toISOString().split('T')[0] : '-',
                  dob: candidate.dateOfBirth ? candidate.dateOfBirth.toISOString().split('T')[0] : '-',
                  gender: formatValue(candidate.gender),
                  nationality: formatValue(candidate.nationality),
                  issuingCountry: formatValue(candidate.issuingCountry),
                  dateOfIssue: candidate.dateOfIssue ? candidate.dateOfIssue.toISOString().split('T')[0] : '-',
                  issueDate: candidate.dateOfIssue ? candidate.dateOfIssue.toISOString().split('T')[0] : '-',
                  dateOfExpiry: candidate.dateOfExpiry ? candidate.dateOfExpiry.toISOString().split('T')[0] : '-',
                  expiryDate: candidate.dateOfExpiry ? candidate.dateOfExpiry.toISOString().split('T')[0] : '-',
                  issuePlace: formatValue(candidate.issuingCountry),
                  maritalStatus: formatValue(candidate.maritalStatus),
                  numberOfChildren: candidate.numberOfChildren || 0,
                  religion: formatValue(candidate.religion),
                  bloodType: formatValue(candidate.bloodType),
                  height: formatValue(candidate.height),
                  weight: formatValue(candidate.weight),
                  phone: formatValue(candidate.phone),
                  email: formatValue(candidate.email),
                  address: formatValue(candidate.city),
                  city: formatValue(candidate.city),
                  state: formatValue(candidate.state),
                  country: formatValue(candidate.country),
                  educationLevel: formatValue(candidate.educationLevel),
                  languages: langsArray.join(', ') || '-',
                  workExperience: formatValue(candidate.workExperience),
                  skills: skillsArray.join(', ') || '-',
                  medicalStatus: formatValue(candidate.medicalStatus),
                  knownConditions: formatValue(candidate.knownConditions),
                  emergencyName: formatValue(candidate.emergencyContactName),
                  emergencyPhone: formatValue(candidate.emergencyContactPhone),
                  job: formatValue(candidate.job),
                  age: calculateAge(candidate.dateOfBirth),

                  skillBaby: formatValue(hasSkill('baby')),
                  skillChildren: formatValue(hasSkill('child')),
                  skillTutor: formatValue(hasSkill('tutor')),
                  skillComputer: formatValue(hasSkill('computer')),
                  skillClean: formatValue(hasSkill('clean')),
                  skillWash: formatValue(hasSkill('wash')),
                  skillIron: formatValue(hasSkill('iron')),
                  skillCook: formatValue(hasSkill('cook')),
                  skillArabicCook: formatValue(hasSkill('arabic')),
                  skillSew: formatValue(hasSkill('sew')),
                  skillDrive: formatValue(hasSkill('driv')),
                  skillDisabled: formatValue(hasSkill('disabl')),

                  english: formatValue(hasLang('english')),
                  arabic: formatValue(hasLang('arabic')),

                  qrCode: qrCodeData,

                  expCountry: '-',
                  expPeriod: '-',

                  facePhoto: facePhotoData,
                  photo: facePhotoData,
                  fullBodyPhoto: fullBodyPhotoData,
                  passportPhoto: passportPhotoData,
                  'passport image': passportPhotoData,
                  deadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
                  generatedAt: new Date().toLocaleDateString(),
                  FULL_NAME: `${formatValue(candidate.givenNames)} ${formatValue(candidate.surname)}`.replace(/-/g, '').trim() || '-',
                  NAME_AR: 'الاسم الكامل',
                  PASSPORT_NO: formatValue(candidate.passportNumber),
                  DOB: candidate.dateOfBirth ? candidate.dateOfBirth.toISOString().split('T')[0] : '-',
                  NATIONALITY: formatValue(candidate.nationality),
                  GENDER: formatValue(candidate.gender),
                  PHONE: formatValue(candidate.phone),
                  phoneNumber: formatValue(candidate.phone),
                  HEIGHT: formatValue(candidate.height),
                  WEIGHT: formatValue(candidate.weight),
                  EXPERIENCE: formatValue(candidate.workExperience),
                  workPeriod: formatValue(candidate.workExperience ? 'Experienced' : 'Fresher'),
                  position: formatValue(candidate.job),
                  salary: '-',
                  SKILLS: skillsArray.join(', ') || '-',
                  PLACE_OF_BIRTH: formatValue(candidate.placeOfBirth),
                  AGE: calculateAge(candidate.dateOfBirth),
                  expPosition: '-',
                };

                const exps = Array.isArray(candidate.workExperience) ? candidate.workExperience as any[] : [];
                const validExp = exps.find(e => e.experienceStatus === 'Have experience');
                if (validExp) {
                  data.expCountry = validExp.country || '-';
                  data.expPeriod = validExp.yearsOfExperience ? `${validExp.yearsOfExperience} YEARS` : '-';
                  data.expPosition = validExp.position || candidate.job || '-';
                }

                const sizeOf = require('image-size');
                const imageOptions = {
                  centered: true,
                  getImage: (tagValue: string) => {
                    if (!tagValue) return Buffer.from('');
                    const base64Data = tagValue.split(',')[1] || tagValue;
                    return Buffer.from(base64Data, 'base64');
                  },
                  getSize: (img: Buffer, tagValue: string, tagName: string) => {
                    if (tagName === 'qrCode') return [100, 100];
                    let maxWidth = 150, maxHeight = 180;
                    if (tagName === 'facePhoto' || tagName === 'photo') {
                      if (templateId === 'tmpl-ussus') { maxWidth = 220; maxHeight = 270; }
                      else if (templateId === 'tmpl-al-shablan') { maxWidth = 150; maxHeight = 165; }
                      else { maxWidth = 150; maxHeight = 180; }
                    } else if (tagName === 'fullBodyPhoto') {
                      if (templateId === 'tmpl-ussus') { maxWidth = 250; maxHeight = 500; }
                      else if (templateId === 'tmpl-al-shablan') { maxWidth = 240; maxHeight = 600; }
                      else { maxWidth = 320; maxHeight = 580; }
                    } else if (tagName === 'passport image' || tagName === 'passportPhoto') {
                      maxWidth = 550; maxHeight = 750;
                    }
                    try {
                      const dimensions = sizeOf(img);
                      const ratio = dimensions.width / dimensions.height;
                      if (ratio > maxWidth / maxHeight) {
                        return [maxWidth, Math.round(maxWidth / ratio)];
                      } else {
                        return [Math.round(maxHeight * ratio), maxHeight];
                      }
                    } catch (e) {
                      return [maxWidth, maxHeight];
                    }
                  }
                };

                const doc = new Docxtemplater(candidateZip, {
                  paragraphLoop: true,
                  linebreaks: true,
                  modules: [new ImageModule(imageOptions)],
                });

                doc.render(data);
                const docxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });

                const passportNo = candidate.passportNumber || candidate.id.slice(-6);
                const namePart = `${candidate.givenNames || ''}_${candidate.surname || ''}`.replace(/[^a-zA-Z0-9_]/g, '');
                const safeName = `${namePart}_${passportNo}`.replace(/[^a-zA-Z0-9_]/g, '');

                zip.file(`${safeName}.docx`, docxBuf);
              } catch (err: any) {
                console.error(`[Bulk CV] Error generating DOCX for candidate ${candidate.id}:`, err);
                errors.push(`Candidate ${candidate.givenNames} ${candidate.surname}: ${err.message}`);
              } finally {
                bulkJobs[jobId].progress += 1;
              }
            }));
          }

          if (errors.length === candidates.length) {
            throw new Error(`All DOCX generations failed: \n${errors.join('\n')}`);
          }
        } else if (format === 'pdf' || format === 'jpg' || format === 'image') {
          const BATCH_SIZE = 10;
          const browser = await chromium.launch({ headless: true, args: ['--no-sandbox'] });
          const errors: string[] = [];

          try {
            const queue = [...candidates];
            const workers = Array.from({ length: Math.min(BATCH_SIZE, queue.length) }, async () => {
              while (queue.length > 0) {
                const candidate = queue.shift();
                if (!candidate) break;

                const page = await browser.newPage();
                try {
                  const firstCv = candidate.generatedCVs?.[0];
                  const rawTemplateId = firstCv ? firstCv.templateId : 'alm';
                  const clientTemplateRoute = rawTemplateId.replace('tmpl-', '').toLowerCase();

                  const printUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/cv-print/${candidate.id}/${clientTemplateRoute}`;

                  await page.goto(printUrl, { waitUntil: 'networkidle', timeout: 30000 });

                  let outputBuf: Buffer;
                  let extension: string;

                  if (format === 'pdf') {
                    outputBuf = await page.pdf({ format: 'A4', printBackground: true });
                    extension = 'pdf';
                  } else {
                    outputBuf = await page.screenshot({ type: 'jpeg', fullPage: true });
                    extension = 'jpg';
                  }

                  const passportNo = candidate.passportNumber || candidate.id.slice(-6);
                  const namePart = `${candidate.givenNames || ''}_${candidate.surname || ''}`.replace(/[^a-zA-Z0-9_]/g, '');
                  const safeName = `${namePart}_${passportNo}`.replace(/[^a-zA-Z0-9_]/g, '');

                  zip.file(`${safeName}.${extension}`, outputBuf);
                } catch (err: any) {
                  console.error(`[Bulk CV] Error rendering page for candidate ${candidate.id}:`, err);
                  errors.push(`Candidate ${candidate.givenNames} ${candidate.surname}: ${err.message}`);
                } finally {
                  await page.close();
                  bulkJobs[jobId].progress += 1;
                }
              }
            });

            await Promise.all(workers);
          } finally {
            await browser.close();
          }

          if (errors.length === candidates.length) {
            throw new Error(`All PDF/JPG generations failed: \n${errors.join('\n')}`);
          }
        }

        console.log(`[Bulk CV] Compressing ZIP for job ${jobId}...`);
        const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
        bulkJobs[jobId].zipBuffer = zipBuf;
        bulkJobs[jobId].status = 'completed';
        console.log(`[Bulk CV] Completed job: ${jobId}`);

        // Update database in bulk
        const placeholders = candidateIds.map(() => '?').join(', ');
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`cvDownloaded\` = 1 WHERE \`id\` IN (${placeholders})`,
          ...candidateIds
        );

        for (const candidate of candidates) {
          try {
            const firstCv = candidate.generatedCVs?.[0];
            if (!firstCv) {
              await prisma.generatedCV.create({
                data: {
                  candidateId: candidate.id,
                  templateId: 'alm',
                  facePhotoUrl: candidate.facePhotoUrl || '',
                  fullBodyPhotoUrl: candidate.fullBodyPhotoUrl || ''
                }
              });
            }
          } catch (dbErr) {
            console.warn(`[Bulk CV] Failed to create default GeneratedCV for candidate ${candidate.id}`, dbErr);
          }
        }

      } catch (err: any) {
        console.error(`[Bulk CV] Job failed: ${jobId}`, err);
        bulkJobs[jobId].status = 'failed';
        bulkJobs[jobId].error = err.message || 'Generation failed';
      }
    })();
  } catch (error: any) {
    console.error('Bulk generate CV error:', error);
    res.status(500).json({ error: error?.message || 'Failed to initialize bulk generation' });
  }
});

router.get('/bulk-generate/status/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = bulkJobs[jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found' });
  }
  res.json({
    progress: job.progress,
    total: job.total,
    status: job.status,
    error: job.error
  });
});

router.get('/bulk-generate/download/:jobId', (req: Request, res: Response) => {
  const { jobId } = req.params;
  const job = bulkJobs[jobId];
  if (!job) {
    return res.status(404).json({ error: 'Job not found or has expired' });
  }

  if (job.status !== 'completed' || !job.zipBuffer) {
    return res.status(400).json({ error: 'Job is not completed yet' });
  }

  res.setHeader('Content-Type', 'application/zip');
  res.setHeader('Content-Disposition', `attachment; filename="CVs_Bulk_${Date.now()}.zip"`);
  res.send(job.zipBuffer);

  // Clean up memory immediately after download starts/completes
  delete bulkJobs[jobId];
});

router.post('/candidates-batch', async (req: Request, res: Response) => {
  try {
    const { candidateIds } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'candidateIds must be a non-empty array' });
    }

    const candidates = await prisma.candidate.findMany({
      where: { 
        id: { in: candidateIds },
        isLocked: false
      },
      include: { 
        generatedCVs: true,
        broker: true,
        registeredBy: true
      }
    });

    const formatDate = (date: Date | null | undefined) => date?.toISOString().split('T')[0] || '';

    const formatted = candidates.map((c: any) => ({
      id: c.id,
      shelfId: c.shelfId,
      cvDeadline: formatDate(c.cvDeadline),
      passportData: {
        passportNumber: c.passportNumber,
        surname: c.surname,
        givenNames: c.givenNames,
        dateOfBirth: formatDate(c.dateOfBirth),
        gender: c.gender,
        nationality: c.nationality,
        issuingCountry: c.issuingCountry,
        dateOfIssue: formatDate(c.dateOfIssue),
        dateOfExpiry: formatDate(c.dateOfExpiry),
        placeOfBirth: c.placeOfBirth,
      },
      personalInfo: {
        idNumber: c.idNumber || c.passportNumber,
        job: c.job || '',
        maritalStatus: c.maritalStatus,
        numberOfChildren: c.numberOfChildren,
        religion: c.religion,
        bloodType: c.bloodType,
        height: c.height,
        weight: c.weight,
        phone: c.phone,
        email: c.email,
        address: c.address,
        city: c.city,
        state: c.state,
        country: c.country,
        educationLevel: c.educationLevel,
        languages: c.languages,
        workExperience: c.workExperience || [],
        skills: c.skills,
        medicalStatus: c.medicalStatus,
        biometricStatus: c.biometricStatus,
        medicalDate: formatDate(c.medicalDate),
        biometricDate: formatDate(c.biometricDate),
        knownConditions: c.knownConditions,
        emergencyContactName: c.emergencyContactName,
        emergencyContactRelation: c.emergencyContactRelation,
        emergencyContactPhone: c.emergencyContactPhone,
        emergencyContactAddress: c.emergencyContactAddress,
        additionalPhones: c.additionalPhones,
        brokerId: c.brokerId || '',
        cocDocumentUrl: c.cocDocumentUrl || '',
        medicalDocumentUrl: c.medicalDocumentUrl || '',
        candidateIdImageUrl: c.candidateIdImageUrl || '',
        relativeIdImageUrl: c.relativeIdImageUrl || '',
        labourIdUrl: c.labourIdUrl || '',
        salary: c.salary || '1000SR',
      },
      brokerId: c.brokerId,
      broker: c.broker || null,
      passportImageUrl: c.passportImageUrl || '',
      facePhotoUrl: c.facePhotoUrl || '',
      fullBodyPhotoUrl: c.fullBodyPhotoUrl || '',
      cocDocumentUrl: c.cocDocumentUrl || '',
      medicalDocumentUrl: c.medicalDocumentUrl || '',
      candidateIdImageUrl: c.candidateIdImageUrl || '',
      relativeIdImageUrl: c.relativeIdImageUrl || '',
      labourIdUrl: c.labourIdUrl || '',
      isRequested: c.isRequested || false,
      visaOrContractNumber: c.visaOrContractNumber || null,
      isFlagged: c.isFlagged || false,
      isLocked: c.isLocked || false,
      cvDownloaded: c.cvDownloaded || false,
      videoUrl: c.videoUrl || null,
      Youtube_URL: c.videoUrl || null,
      deployedDate: formatDate(c.deployedDate),
      registeredAt: c.registeredAt.toISOString(),
      status: c.status,
      visaSelected: c.visaSelected,
      visaDate: c.visaDate ? c.visaDate.toISOString() : null,
      salary: c.salary || '1000SR',
      generatedCVs: c.generatedCVs?.map((cv: any) => ({ id: cv.id, templateId: cv.templateId })) || [],
      latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
      registeredBy: c.registeredBy?.name || 'Admin',
    }));

    res.json(formatted);
  } catch (error: any) {
    console.error('Candidates batch fetch error:', error);
    res.status(500).json({ error: error?.message || 'Failed to fetch candidates details' });
  }
});

export default router;
