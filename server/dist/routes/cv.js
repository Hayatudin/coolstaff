"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const cvHelpers_1 = require("../lib/cvHelpers");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const pizzip_1 = __importDefault(require("pizzip"));
const docxtemplater_1 = __importDefault(require("docxtemplater"));
const ImageModule = require('docxtemplater-image-module-free');
const playwright_1 = require("playwright");
const qrcode_1 = __importDefault(require("qrcode"));
const jszip_1 = __importDefault(require("jszip"));
const crypto_1 = __importDefault(require("crypto"));
const router = (0, express_1.Router)();
const bulkJobs = {};
setInterval(() => {
    const now = Date.now();
    for (const [jobId, job] of Object.entries(bulkJobs)) {
        if (now > job.expiresAt) {
            delete bulkJobs[jobId];
            console.log(`[Bulk CV] Cleaned up expired job: ${jobId}`);
        }
    }
}, 5 * 60 * 1000);
const fetchImageAsBase64 = async (url) => {
    if (!url)
        return '';
    if (url.startsWith('data:')) {
        return url.split(',')[1] || url;
    }
    try {
        let cleanUrl = url.startsWith('http') ? new URL(url).pathname : url;
        if (cleanUrl.includes('/api/assets/')) {
            cleanUrl = cleanUrl.split('/api/assets/')[1];
        }
        const relativePath = cleanUrl.startsWith('/') ? cleanUrl.slice(1) : cleanUrl;
        const pathsToTry = [
            path_1.default.join(process.cwd(), 'public', relativePath),
            path_1.default.join(process.cwd(), relativePath),
            path_1.default.join(process.cwd(), '..', 'public', relativePath),
            path_1.default.join(process.cwd(), 'public', 'uploads', relativePath),
        ];
        for (const localPath of pathsToTry) {
            if (fs_1.default.existsSync(localPath)) {
                return fs_1.default.readFileSync(localPath, 'base64');
            }
        }
    }
    catch (e) { }
    if (url.startsWith('http')) {
        try {
            const res = await fetch(url);
            if (res.ok) {
                const arrayBuffer = await res.arrayBuffer();
                return Buffer.from(arrayBuffer).toString('base64');
            }
        }
        catch (e) { }
    }
    return '';
};
const calculateAge = (dob) => {
    if (!dob)
        return '';
    const diff = Date.now() - dob.getTime();
    const ageDate = new Date(diff);
    return Math.abs(ageDate.getUTCFullYear() - 1970).toString();
};
const TEMPLATE_MAP = {
    'tmpl-alm': 'CV ALM.docx',
    'tmpl-almala': 'CV Almala.docx',
    'tmpl-ka7': 'CV KA-7-v3.docx',
    'tmpl-ku2': 'CV KU2.docx',
    'tmpl-ma': 'CV MA.docx',
    'tmpl-ra': 'CV RA.docx',
    'tmpl-al-shablan': 'CV Al-shablan.docx',
    'tmpl-ussus': 'CV Ussus.docx',
};
router.post('/generate', async (req, res) => {
    try {
        const { candidateId, templateId, format, facePhoto, fullBodyPhoto } = req.body;
        if (!candidateId || !templateId) {
            return res.status(400).json({ error: 'Missing required fields' });
        }
        const [cands] = await db_1.pool.query('SELECT c.*, b.name as brokerName FROM Candidate c LEFT JOIN Broker b ON c.brokerId = b.id WHERE c.id = ? LIMIT 1', [candidateId]);
        if (!cands || cands.length === 0) {
            return res.status(404).json({ error: 'Candidate not found' });
        }
        const candidate = cands[0];
        if (candidate.brokerName === 'Calling') {
            return res.status(400).json({ error: 'CV is not available for Calling candidates.' });
        }
        if (candidate.isLocked === 1 || candidate.isLocked === true) {
            return res.status(403).json({ error: 'This candidate is locked. CV downloading is restricted.' });
        }
        const templateRef = TEMPLATE_MAP[templateId];
        if (!templateRef) {
            return res.status(400).json({ error: `Invalid template ID: ${templateId}` });
        }
        if (format === 'pdf' || format === 'image' || format === 'jpg') {
            const browser = await playwright_1.chromium.launch({ headless: true, args: ['--no-sandbox'] });
            try {
                const page = await browser.newPage();
                const clientTemplateRoute = (templateRef === 'CV Al-shablan.docx' ? 'al-shablan' : (templateRef === 'CV Ussus.docx' ? 'ussus' : templateRef));
                const printUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/cv-print/${candidateId}/${clientTemplateRoute}`;
                await page.goto(printUrl, { waitUntil: 'networkidle' });
                let outputBuf;
                let contentType;
                let extension;
                if (format === 'pdf') {
                    outputBuf = await page.pdf({ format: 'A4', printBackground: true });
                    contentType = 'application/pdf';
                    extension = 'pdf';
                }
                else {
                    outputBuf = await page.screenshot({ type: 'jpeg', fullPage: true });
                    contentType = 'image/jpeg';
                    extension = 'jpg';
                }
                await browser.close();
                res.setHeader('Content-Type', contentType);
                res.setHeader('Content-Disposition', `attachment; filename="CV_${candidate.surname}.${extension}"`);
                return res.send(outputBuf);
            }
            catch (err) {
                await browser.close();
                throw err;
            }
        }
        if (format === 'doc' || format === 'docx') {
            const templatePath = path_1.default.join(process.cwd(), 'templates', templateRef);
            if (!fs_1.default.existsSync(templatePath)) {
                return res.status(404).json({ error: `Template file not found: ${templateRef}` });
            }
            const content = fs_1.default.readFileSync(templatePath, 'binary');
            const zip = new pizzip_1.default(content);
            const docXmlFile = zip.file('word/document.xml');
            if (docXmlFile) {
                let docXml = docXmlFile.asText();
                docXml = docXml.replace(/<w:highlight[^>]*\/>/g, '');
                let isAlmFullBodyInjected = false;
                if (!docXml.includes('fullBodyPhoto') && docXml.includes('w:w="5265" w:h="8175"')) {
                    docXml = docXml.replace(/(<w:framePr w:w="5265" w:h="8175"[^>]+x="150"[^>]+y="4320"\/>[\s\S]*?<\/w:pPr>)/, '$1<w:r><w:t>{%fullBodyPhoto}</w:t></w:r>');
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
                getImage: (tagValue) => {
                    if (!tagValue)
                        return Buffer.from('');
                    const base64Data = tagValue.split(',')[1] || tagValue;
                    return Buffer.from(base64Data, 'base64');
                },
                getSize: (img, tagValue, tagName) => {
                    if (tagName === 'qrCode')
                        return [100, 100];
                    let maxWidth = 150, maxHeight = 180;
                    if (tagName === 'facePhoto' || tagName === 'photo') {
                        if (templateId === 'tmpl-ussus') {
                            maxWidth = 220;
                            maxHeight = 270;
                        }
                        else if (templateId === 'tmpl-al-shablan') {
                            maxWidth = 150;
                            maxHeight = 165;
                        }
                        else {
                            maxWidth = 150;
                            maxHeight = 180;
                        }
                    }
                    else if (tagName === 'fullBodyPhoto') {
                        if (templateId === 'tmpl-ussus') {
                            maxWidth = 250;
                            maxHeight = 500;
                        }
                        else if (templateId === 'tmpl-al-shablan') {
                            maxWidth = 240;
                            maxHeight = 600;
                        }
                        else {
                            maxWidth = 320;
                            maxHeight = 580;
                        }
                    }
                    else if (tagName === 'passport image' || tagName === 'passportPhoto') {
                        maxWidth = 550;
                        maxHeight = 750;
                    }
                    try {
                        const dimensions = sizeOf(img);
                        const ratio = dimensions.width / dimensions.height;
                        if (ratio > maxWidth / maxHeight) {
                            return [maxWidth, Math.round(maxWidth / ratio)];
                        }
                        else {
                            return [Math.round(maxHeight * ratio), maxHeight];
                        }
                    }
                    catch (e) {
                        return [maxWidth, maxHeight];
                    }
                },
            };
            const doc = new docxtemplater_1.default(zip, {
                paragraphLoop: true,
                linebreaks: true,
                modules: [new ImageModule(imageOptions)],
            });
            const parseJson = (val) => {
                if (!val)
                    return [];
                if (typeof val === 'object')
                    return val;
                try {
                    return JSON.parse(val);
                }
                catch (_) {
                    return [];
                }
            };
            const skillsArray = parseJson(candidate.skills).map(String);
            const langsArray = parseJson(candidate.languages).map(String);
            const resolvedExps = (0, cvHelpers_1.resolveCandidateWorkExperience)(candidate);
            const resolvedNationality = (0, cvHelpers_1.resolveCandidateNationality)(candidate);
            const isExperienced = resolvedExps.length > 0;
            const hasSkill = (keyword) => {
                const kw = keyword.toLowerCase();
                if (kw.includes('cook') || kw.includes('arabic')) {
                    return isExperienced ? 'Yes' : 'No';
                }
                if (kw.includes('iron')) {
                    return isExperienced ? (skillsArray.some((s) => s.toLowerCase().includes(kw)) ? 'Yes' : 'No') : 'No';
                }
                if (kw.includes('clean') || kw.includes('wash') || kw.includes('baby') || kw.includes('child')) {
                    return 'Yes';
                }
                return skillsArray.some((s) => s.toLowerCase().includes(kw)) ? 'Yes' : 'No';
            };
            const hasLang = (keyword) => langsArray.some((l) => l.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';
            const [facePhotoData, fullBodyPhotoData, passportPhotoData] = await Promise.all([
                fetchImageAsBase64(facePhoto || candidate.passportImageUrl || ''),
                fetchImageAsBase64(fullBodyPhoto || candidate.fullBodyPhotoUrl || ''),
                fetchImageAsBase64(candidate.passportImageUrl || '')
            ]);
            const finalVideoUrl = candidate.Youtube_URL || candidate.videoUrl || null;
            const qrCodeData = finalVideoUrl ? await qrcode_1.default.toDataURL(finalVideoUrl) : '';
            const formatValue = (val) => (val && val !== 'undefined' && val !== 'null' && String(val).trim() !== '' ? val : '-');
            const expCountryVal = resolvedExps.length > 0 ? resolvedExps.map(e => e.country).join(', ') : '-';
            const expPeriodVal = resolvedExps.length > 0 ? resolvedExps.map(e => `${e.yearsOfExperience} YEARS`).join(', ') : '-';
            const expPositionVal = resolvedExps.length > 0 ? resolvedExps.map(e => e.position || candidate.job || 'HOUSE MAID').join(', ') : '-';
            const expSummaryVal = resolvedExps.length > 0 ? resolvedExps.map(e => `${e.country} (${e.yearsOfExperience} YRS)`).join(', ') : 'Fresher';
            const dobDate = candidate.dateOfBirth ? new Date(candidate.dateOfBirth) : null;
            const issueDate = candidate.dateOfIssue ? new Date(candidate.dateOfIssue) : null;
            const expiryDate = candidate.dateOfExpiry ? new Date(candidate.dateOfExpiry) : null;
            const data = {
                refNumber: candidate.id.slice(-6).toUpperCase(),
                givenNames: formatValue(candidate.givenNames),
                surname: formatValue(candidate.surname),
                fullName: `${formatValue(candidate.givenNames)} ${formatValue(candidate.surname)}`.replace(/-/g, '').trim() || '-',
                passportNumber: formatValue(candidate.passportNumber),
                dateOfBirth: dobDate ? dobDate.toISOString().split('T')[0] : '-',
                dob: dobDate ? dobDate.toISOString().split('T')[0] : '-',
                gender: formatValue(candidate.gender),
                nationality: resolvedNationality,
                issuingCountry: formatValue(candidate.issuingCountry),
                dateOfIssue: issueDate ? issueDate.toISOString().split('T')[0] : '-',
                issueDate: issueDate ? issueDate.toISOString().split('T')[0] : '-',
                dateOfExpiry: expiryDate ? expiryDate.toISOString().split('T')[0] : '-',
                expiryDate: expiryDate ? expiryDate.toISOString().split('T')[0] : '-',
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
                workExperience: expSummaryVal,
                skills: skillsArray.join(', ') || '-',
                medicalStatus: formatValue(candidate.medicalStatus),
                knownConditions: formatValue(candidate.knownConditions),
                emergencyName: formatValue(candidate.emergencyContactName),
                emergencyPhone: formatValue(candidate.emergencyContactPhone),
                job: formatValue(candidate.job),
                age: calculateAge(dobDate),
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
                expCountry: expCountryVal,
                expPeriod: expPeriodVal,
                expPosition: expPositionVal,
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
                DOB: dobDate ? dobDate.toISOString().split('T')[0] : '-',
                NATIONALITY: resolvedNationality,
                GENDER: formatValue(candidate.gender),
                PHONE: formatValue(candidate.phone),
                phoneNumber: formatValue(candidate.phone),
                HEIGHT: formatValue(candidate.height),
                WEIGHT: formatValue(candidate.weight),
                EXPERIENCE: expSummaryVal,
                workPeriod: isExperienced ? 'Experienced' : 'Fresher',
                position: formatValue(candidate.job),
                salary: '-',
                SKILLS: skillsArray.join(', ') || '-',
                PLACE_OF_BIRTH: formatValue(candidate.placeOfBirth),
                AGE: calculateAge(dobDate),
            };
            doc.render(data);
            const docxBuf = doc.getZip().generate({ type: 'nodebuffer', compression: 'DEFLATE' });
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
            res.setHeader('Content-Disposition', `attachment; filename="CV_${candidate.surname}.docx"`);
            return res.send(docxBuf);
        }
    }
    catch (error) {
        console.error('CV Generation Error:', error);
        res.status(500).json({ error: 'Failed to generate CV' });
    }
});
router.post('/bulk-generate', async (req, res) => {
    try {
        const { candidateIds, format } = req.body;
        if (!Array.isArray(candidateIds) || candidateIds.length === 0 || !format) {
            return res.status(400).json({ error: 'Missing candidateIds or format' });
        }
        const jobId = crypto_1.default.randomUUID();
        bulkJobs[jobId] = {
            progress: 0,
            total: candidateIds.length,
            status: 'pending',
            expiresAt: Date.now() + 15 * 60 * 1000
        };
        res.json({ jobId });
        (async () => {
            bulkJobs[jobId].status = 'processing';
            const zip = new jszip_1.default();
            try {
                const dbCandidates = await db_1.db.select().from(db_1.candidate).where((0, drizzle_orm_1.inArray)(db_1.candidate.id, candidateIds));
                const candidates = dbCandidates.filter(c => c.isLocked !== true);
                if (format === 'doc' || format === 'docx') {
                    const BATCH_SIZE = 20;
                    const errors = [];
                    for (let i = 0; i < candidates.length; i += BATCH_SIZE) {
                        const batch = candidates.slice(i, i + BATCH_SIZE);
                        await Promise.all(batch.map(async (candidate) => {
                            try {
                                const cvs = await db_1.db.select().from(db_1.generatedCv).where((0, drizzle_orm_1.eq)(db_1.generatedCv.candidateId, candidate.id));
                                const firstCv = cvs[0];
                                const rawTemplateId = firstCv ? firstCv.templateId : 'alm';
                                const templateId = rawTemplateId.startsWith('tmpl-') ? rawTemplateId : `tmpl-${rawTemplateId}`;
                                const templateRef = TEMPLATE_MAP[templateId] || 'CV ALM.docx';
                                const templatePath = path_1.default.join(process.cwd(), 'templates', templateRef);
                                if (!fs_1.default.existsSync(templatePath)) {
                                    throw new Error(`Template not found: ${templateRef}`);
                                }
                                const content = fs_1.default.readFileSync(templatePath, 'binary');
                                const candidateZip = new pizzip_1.default(content);
                                const docXmlFile = candidateZip.file('word/document.xml');
                                if (docXmlFile) {
                                    let docXml = docXmlFile.asText();
                                    docXml = docXml.replace(/<w:highlight[^>]*\/>/g, '');
                                    let isAlmFullBodyInjected = false;
                                    if (!docXml.includes('fullBodyPhoto') && docXml.includes('w:w="5265" w:h="8175"')) {
                                        docXml = docXml.replace(/(<w:framePr w:w="5265" w:h="8175"[^>]+x="150"[^>]+y="4320"\/>[\s\S]*?<\/w:pPr>)/, '$1<w:r><w:t>{%fullBodyPhoto}</w:t></w:r>');
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
                                const finalVideoUrl = candidate.videoUrl || null;
                                const qrCodeData = finalVideoUrl ? await qrcode_1.default.toDataURL(finalVideoUrl) : '';
                                const parseJson = (val) => {
                                    if (!val)
                                        return [];
                                    if (typeof val === 'object')
                                        return val;
                                    try {
                                        return JSON.parse(val);
                                    }
                                    catch (_) {
                                        return [];
                                    }
                                };
                                const skillsArray = parseJson(candidate.skills).map(String);
                                const langsArray = parseJson(candidate.languages).map(String);
                                const resolvedExps = (0, cvHelpers_1.resolveCandidateWorkExperience)(candidate);
                                const resolvedNationality = (0, cvHelpers_1.resolveCandidateNationality)(candidate);
                                const isExperienced = resolvedExps.length > 0;
                                const hasSkill = (keyword) => {
                                    const kw = keyword.toLowerCase();
                                    if (kw.includes('cook') || kw.includes('arabic'))
                                        return isExperienced ? 'Yes' : 'No';
                                    if (kw.includes('iron'))
                                        return isExperienced ? (skillsArray.some((s) => s.toLowerCase().includes(kw)) ? 'Yes' : 'No') : 'No';
                                    if (kw.includes('clean') || kw.includes('wash') || kw.includes('baby') || kw.includes('child'))
                                        return 'Yes';
                                    return skillsArray.some((s) => s.toLowerCase().includes(kw)) ? 'Yes' : 'No';
                                };
                                const hasLang = (keyword) => langsArray.some((l) => l.toLowerCase().includes(keyword.toLowerCase())) ? 'Yes' : 'No';
                                const formatValue = (val) => (val && val !== 'undefined' && val !== 'null' && String(val).trim() !== '' ? val : '-');
                                const expCountryVal = resolvedExps.length > 0 ? resolvedExps.map(e => e.country).join(', ') : '-';
                                const expPeriodVal = resolvedExps.length > 0 ? resolvedExps.map(e => `${e.yearsOfExperience} YEARS`).join(', ') : '-';
                                const expPositionVal = resolvedExps.length > 0 ? resolvedExps.map(e => e.position || candidate.job || 'HOUSE MAID').join(', ') : '-';
                                const expSummaryVal = resolvedExps.length > 0 ? resolvedExps.map(e => `${e.country} (${e.yearsOfExperience} YRS)`).join(', ') : 'Fresher';
                                const dobDate = candidate.dateOfBirth ? new Date(candidate.dateOfBirth) : null;
                                const data = {
                                    refNumber: candidate.id.slice(-6).toUpperCase(),
                                    givenNames: formatValue(candidate.givenNames),
                                    surname: formatValue(candidate.surname),
                                    fullName: `${formatValue(candidate.givenNames)} ${formatValue(candidate.surname)}`.replace(/-/g, '').trim() || '-',
                                    passportNumber: formatValue(candidate.passportNumber),
                                    dateOfBirth: dobDate ? dobDate.toISOString().split('T')[0] : '-',
                                    dob: dobDate ? dobDate.toISOString().split('T')[0] : '-',
                                    gender: formatValue(candidate.gender),
                                    nationality: resolvedNationality,
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
                                    workExperience: expSummaryVal,
                                    skills: skillsArray.join(', ') || '-',
                                    medicalStatus: formatValue(candidate.medicalStatus),
                                    knownConditions: formatValue(candidate.knownConditions),
                                    emergencyName: formatValue(candidate.emergencyContactName),
                                    emergencyPhone: formatValue(candidate.emergencyContactPhone),
                                    job: formatValue(candidate.job),
                                    age: calculateAge(dobDate),
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
                                    expCountry: expCountryVal,
                                    expPeriod: expPeriodVal,
                                    expPosition: expPositionVal,
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
                                    DOB: dobDate ? dobDate.toISOString().split('T')[0] : '-',
                                    NATIONALITY: resolvedNationality,
                                    GENDER: formatValue(candidate.gender),
                                    PHONE: formatValue(candidate.phone),
                                    phoneNumber: formatValue(candidate.phone),
                                    HEIGHT: formatValue(candidate.height),
                                    WEIGHT: formatValue(candidate.weight),
                                    EXPERIENCE: expSummaryVal,
                                    workPeriod: isExperienced ? 'Experienced' : 'Fresher',
                                    position: formatValue(candidate.job),
                                    salary: '-',
                                    SKILLS: skillsArray.join(', ') || '-',
                                    PLACE_OF_BIRTH: formatValue(candidate.placeOfBirth),
                                    AGE: calculateAge(dobDate),
                                };
                                const sizeOf = require('image-size');
                                const imageOptions = {
                                    centered: true,
                                    getImage: (tagValue) => {
                                        if (!tagValue)
                                            return Buffer.from('');
                                        const base64Data = tagValue.split(',')[1] || tagValue;
                                        return Buffer.from(base64Data, 'base64');
                                    },
                                    getSize: (img, tagValue, tagName) => {
                                        if (tagName === 'qrCode')
                                            return [100, 100];
                                        let maxWidth = 150, maxHeight = 180;
                                        if (tagName === 'facePhoto' || tagName === 'photo') {
                                            if (templateId === 'tmpl-ussus') {
                                                maxWidth = 220;
                                                maxHeight = 270;
                                            }
                                            else if (templateId === 'tmpl-al-shablan') {
                                                maxWidth = 150;
                                                maxHeight = 165;
                                            }
                                            else {
                                                maxWidth = 150;
                                                maxHeight = 180;
                                            }
                                        }
                                        else if (tagName === 'fullBodyPhoto') {
                                            if (templateId === 'tmpl-ussus') {
                                                maxWidth = 250;
                                                maxHeight = 500;
                                            }
                                            else if (templateId === 'tmpl-al-shablan') {
                                                maxWidth = 240;
                                                maxHeight = 600;
                                            }
                                            else {
                                                maxWidth = 320;
                                                maxHeight = 580;
                                            }
                                        }
                                        else if (tagName === 'passport image' || tagName === 'passportPhoto') {
                                            maxWidth = 550;
                                            maxHeight = 750;
                                        }
                                        try {
                                            const dimensions = sizeOf(img);
                                            const ratio = dimensions.width / dimensions.height;
                                            if (ratio > maxWidth / maxHeight) {
                                                return [maxWidth, Math.round(maxWidth / ratio)];
                                            }
                                            else {
                                                return [Math.round(maxHeight * ratio), maxHeight];
                                            }
                                        }
                                        catch (e) {
                                            return [maxWidth, maxHeight];
                                        }
                                    }
                                };
                                const doc = new docxtemplater_1.default(candidateZip, {
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
                            }
                            catch (err) {
                                console.error(`[Bulk CV] Error generating DOCX for candidate ${candidate.id}:`, err);
                                errors.push(`Candidate ${candidate.givenNames} ${candidate.surname}: ${err.message}`);
                            }
                            finally {
                                bulkJobs[jobId].progress += 1;
                            }
                        }));
                    }
                    if (errors.length === candidates.length) {
                        throw new Error(`All DOCX generations failed: \n${errors.join('\n')}`);
                    }
                }
                else if (format === 'pdf' || format === 'jpg' || format === 'image') {
                    const BATCH_SIZE = 10;
                    const browser = await playwright_1.chromium.launch({ headless: true, args: ['--no-sandbox'] });
                    const errors = [];
                    try {
                        const queue = [...candidates];
                        const workers = Array.from({ length: Math.min(BATCH_SIZE, queue.length) }, async () => {
                            while (queue.length > 0) {
                                const candidate = queue.shift();
                                if (!candidate)
                                    break;
                                const page = await browser.newPage();
                                try {
                                    const cvs = await db_1.db.select().from(db_1.generatedCv).where((0, drizzle_orm_1.eq)(db_1.generatedCv.candidateId, candidate.id));
                                    const firstCv = cvs[0];
                                    const rawTemplateId = firstCv ? firstCv.templateId : 'alm';
                                    const clientTemplateRoute = rawTemplateId.replace('tmpl-', '').toLowerCase();
                                    const printUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/cv-print/${candidate.id}/${clientTemplateRoute}`;
                                    await page.goto(printUrl, { waitUntil: 'networkidle', timeout: 30000 });
                                    let outputBuf;
                                    let extension;
                                    if (format === 'pdf') {
                                        outputBuf = await page.pdf({ format: 'A4', printBackground: true });
                                        extension = 'pdf';
                                    }
                                    else {
                                        outputBuf = await page.screenshot({ type: 'jpeg', fullPage: true });
                                        extension = 'jpg';
                                    }
                                    const passportNo = candidate.passportNumber || candidate.id.slice(-6);
                                    const namePart = `${candidate.givenNames || ''}_${candidate.surname || ''}`.replace(/[^a-zA-Z0-9_]/g, '');
                                    const safeName = `${namePart}_${passportNo}`.replace(/[^a-zA-Z0-9_]/g, '');
                                    zip.file(`${safeName}.${extension}`, outputBuf);
                                }
                                catch (err) {
                                    console.error(`[Bulk CV] Error rendering page for candidate ${candidate.id}:`, err);
                                    errors.push(`Candidate ${candidate.givenNames} ${candidate.surname}: ${err.message}`);
                                }
                                finally {
                                    await page.close();
                                    bulkJobs[jobId].progress += 1;
                                }
                            }
                        });
                        await Promise.all(workers);
                    }
                    finally {
                        await browser.close();
                    }
                    if (errors.length === candidates.length) {
                        throw new Error(`All PDF/JPG generations failed: \n${errors.join('\n')}`);
                    }
                }
                const zipBuf = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } });
                bulkJobs[jobId].zipBuffer = zipBuf;
                bulkJobs[jobId].status = 'completed';
                await db_1.db.update(db_1.candidate).set({ cvDownloaded: true }).where((0, drizzle_orm_1.inArray)(db_1.candidate.id, candidateIds));
                for (const candidate of candidates) {
                    try {
                        const cvs = await db_1.db.select().from(db_1.generatedCv).where((0, drizzle_orm_1.eq)(db_1.generatedCv.candidateId, candidate.id));
                        if (cvs.length === 0) {
                            await db_1.db.insert(db_1.generatedCv).values({
                                candidateId: candidate.id,
                                templateId: 'alm',
                                facePhotoUrl: candidate.facePhotoUrl || '',
                                fullBodyPhotoUrl: candidate.fullBodyPhotoUrl || ''
                            });
                        }
                    }
                    catch (dbErr) {
                        console.warn(`[Bulk CV] Failed to create default GeneratedCV for candidate ${candidate.id}`, dbErr);
                    }
                }
            }
            catch (err) {
                console.error(`[Bulk CV] Job failed: ${jobId}`, err);
                bulkJobs[jobId].status = 'failed';
                bulkJobs[jobId].error = err.message || 'Generation failed';
            }
        })();
    }
    catch (error) {
        console.error('Bulk generate CV error:', error);
        res.status(500).json({ error: error?.message || 'Failed to initialize bulk generation' });
    }
});
router.get('/bulk-generate/status/:jobId', (req, res) => {
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
router.get('/bulk-generate/download/:jobId', (req, res) => {
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
    delete bulkJobs[jobId];
});
router.post('/candidates-batch', async (req, res) => {
    try {
        const { candidateIds } = req.body;
        if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
            return res.status(400).json({ error: 'candidateIds must be a non-empty array' });
        }
        const dbCandidates = await db_1.db.select().from(db_1.candidate).where((0, drizzle_orm_1.inArray)(db_1.candidate.id, candidateIds));
        const candidates = dbCandidates.filter(c => c.isLocked !== true);
        const formatDate = (date) => date?.toISOString().split('T')[0] || '';
        const formatted = [];
        for (const c of candidates) {
            const cvs = await db_1.db.select().from(db_1.generatedCv).where((0, drizzle_orm_1.eq)(db_1.generatedCv.candidateId, c.id));
            let brokerObj = null;
            if (c.brokerId) {
                const brokers = await db_1.db.select().from(db_1.broker).where((0, drizzle_orm_1.eq)(db_1.broker.id, c.brokerId));
                if (brokers.length > 0)
                    brokerObj = brokers[0];
            }
            let registeredByName = 'Admin';
            if (c.registeredById) {
                const users = await db_1.db.select().from(db_1.user).where((0, drizzle_orm_1.eq)(db_1.user.id, c.registeredById));
                if (users.length > 0)
                    registeredByName = users[0].name || 'Admin';
            }
            const parseJson = (val) => {
                if (!val)
                    return [];
                if (typeof val === 'object')
                    return val;
                try {
                    return JSON.parse(val);
                }
                catch (_) {
                    return [];
                }
            };
            formatted.push({
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
                    languages: parseJson(c.languages),
                    workExperience: parseJson(c.workExperience),
                    skills: parseJson(c.skills),
                    medicalStatus: c.medicalStatus,
                    biometricStatus: c.biometricStatus,
                    medicalDate: formatDate(c.medicalDate),
                    biometricDate: formatDate(c.biometricDate),
                    knownConditions: c.knownConditions,
                    emergencyContactName: c.emergencyContactName,
                    emergencyContactRelation: c.emergencyContactRelation,
                    emergencyContactPhone: c.emergencyContactPhone,
                    emergencyContactAddress: c.emergencyContactAddress,
                    additionalPhones: parseJson(c.additionalPhones),
                    brokerId: c.brokerId || '',
                    cocDocumentUrl: c.cocDocumentUrl || '',
                    medicalDocumentUrl: c.medicalDocumentUrl || '',
                    candidateIdImageUrl: c.candidateIdImageUrl || '',
                    relativeIdImageUrl: c.relativeIdImageUrl || '',
                    labourIdUrl: c.labourIdUrl || '',
                    salary: c.salary || '1000SR',
                },
                brokerId: c.brokerId,
                broker: brokerObj,
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
                generatedCVs: cvs.map((cv) => ({ id: cv.id, templateId: cv.templateId })),
                latestCVTemplate: cvs[0]?.templateId || null,
                registeredBy: registeredByName,
            });
        }
        res.json(formatted);
    }
    catch (error) {
        console.error('Candidates batch fetch error:', error);
        res.status(500).json({ error: error?.message || 'Failed to fetch candidates details' });
    }
});
exports.default = router;
