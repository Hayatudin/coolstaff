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

const router = Router();

const TEMPLATE_MAP: Record<string, string> = {
  'tmpl-alm': 'CV ALM.docx',
  'tmpl-ka7': 'CV KA-7-fixed.docx',
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
          if (templateId === 'tmpl-al-shablan' || templateId === 'tmpl-ussus') {
            maxWidth = 150; maxHeight = 165;
          } else {
            maxWidth = 150; maxHeight = 180;
          }
        } else if (tagName === 'fullBodyPhoto') {
          if (templateId === 'tmpl-alm') {
            maxWidth = 350; maxHeight = 545;
          } else if (templateId === 'tmpl-al-shablan' || templateId === 'tmpl-ussus') {
            maxWidth = 280; maxHeight = 460;
          } else {
            maxWidth = 550; maxHeight = 750;
          }
        } else if (tagName === 'passport image' || tagName === 'passportPhoto') {
          maxWidth = 550; maxHeight = 750;
        }

        try {
          const dimensions = sizeOf(img);
          const ratio = dimensions.width / dimensions.height;
          
          if (ratio > maxWidth / maxHeight) {
            // Limited by width
            return [maxWidth, Math.round(maxWidth / ratio)];
          } else {
            // Limited by height
            return [Math.round(maxHeight * ratio), maxHeight];
          }
        } catch (e) {
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
    const calculateAge = (dob: Date | null | undefined) => {
      if (!dob) return '';
      const diff = Date.now() - dob.getTime();
      const ageDate = new Date(diff);
      return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
    };

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

    const facePhotoData = await fetchImageAsBase64(facePhoto || candidate.passportImageUrl || '');
    const fullBodyPhotoData = await fetchImageAsBase64(fullBodyPhoto || candidate.fullBodyPhotoUrl || '');
    const passportPhotoData = await fetchImageAsBase64(candidate.passportImageUrl || '');
    const qrCodeData = candidate.videoUrl ? await QRCode.toDataURL(candidate.videoUrl) : '';

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
      address: formatValue(candidate.address),
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

export default router;
