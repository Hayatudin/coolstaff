import { Router, Request, Response } from 'express';
import {
  db,
  pool,
  candidate as candidateTable,
  generatedCv as generatedCvTable,
  invoice as invoiceTable,
  broker as brokerTable,
  user as userTable,
  notification as notificationTable,
  quickRegistration as quickRegistrationTable,
  preRegisteredVideo as preRegisteredVideoTable,
  generateId,
} from '../db';
import { eq, or, inArray, sql } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';
import { getSession } from '../lib/auth-helper';
import { encryptPath, sanitizeIncomingPath } from '../lib/crypto';
import crypto from 'crypto';

const router = Router();

function formatDbError(error: any): string {
  if (!error) return 'Unknown error';
  return error.message || String(error);
}

// GET /api/candidates
router.get('/', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const role = (session?.user as any)?.role;
    const isSuperAdmin = role === 'super_admin';

    const [dbCandidates]: any = await pool.query('SELECT * FROM `Candidate` ORDER BY `registeredAt` DESC');

    const [users]: any = await pool.query('SELECT `id`, `name` FROM `User`').catch(() => [[]]);
    const userMap = new Map((users || []).map((u: any) => [u.id, u.name]));

    const [brokers]: any = await pool.query('SELECT `id`, `name`, `isLocked` FROM `Broker`').catch(() => [[]]);
    const brokerMap = new Map((brokers || []).map((b: any) => [b.id, { id: b.id, name: b.name, isLocked: b.isLocked === 1 || b.isLocked === true }]));

    const [invoices]: any = await pool.query('SELECT `candidateId`, `isDelivered` FROM `Invoice`').catch(() => [[]]);
    const invoiceMap = new Map<string, any[]>();
    for (const inv of (invoices || [])) {
      const list = invoiceMap.get(inv.candidateId) || [];
      list.push({ isDelivered: inv.isDelivered === 1 || inv.isDelivered === true });
      invoiceMap.set(inv.candidateId, list);
    }

    const [cvs]: any = await pool.query('SELECT `id`, `candidateId`, `templateId` FROM `GeneratedCV` ORDER BY `createdAt` DESC').catch(() => [[]]);
    const cvMap = new Map<string, any[]>();
    for (const cv of (cvs || [])) {
      const list = cvMap.get(cv.candidateId) || [];
      list.push({ id: cv.id, templateId: cv.templateId });
      cvMap.set(cv.candidateId, list);
    }

    let videoProfileMap = new Map<string, any>();
    try {
      const [profiles]: any = await pool.query(
        'SELECT passportNumber, videoUrl, facePhotoUrl, fullBodyPhotoUrl FROM `UploadedVideoProfile` WHERE `videoUrl` IS NOT NULL AND `videoUrl` != \'\''
      );
      for (const p of profiles) {
        videoProfileMap.set(p.passportNumber.trim().toUpperCase(), p);
      }
    } catch (_) {}

    const parseJsonField = (field: any) => {
      if (!field) return [];
      if (typeof field === 'object') return field;
      try {
        return JSON.parse(field);
      } catch (_) {
        return [];
      }
    };

    const formatDate = (date: any) => {
      if (!date) return null;
      try {
        return new Date(date).toISOString().split('T')[0];
      } catch (_) {
        return null;
      }
    };

    const candidates = (dbCandidates || []).map((c: any) => {
      const pNum = (c.passportNumber || '').trim().toUpperCase();
      const profile = videoProfileMap.get(pNum);

      let facePhotoUrlVal = profile ? (profile.facePhotoUrl || c.facePhotoUrl) : c.facePhotoUrl;
      if (facePhotoUrlVal && facePhotoUrlVal.startsWith('data:') && facePhotoUrlVal.length > 50000) {
        facePhotoUrlVal = ''; 
      }
      
      let fullBodyPhotoUrlVal = profile ? (profile.fullBodyPhotoUrl || c.fullBodyPhotoUrl) : c.fullBodyPhotoUrl;
      let videoUrlVal = profile ? profile.videoUrl : (c.videoUrl || (c as any).Youtube_URL);
      
      let laborIdText = c.laborID;
      let actualLabourIdUrl = c.labourIdUrl || null;
      if (videoUrlVal && videoUrlVal.startsWith('data:') && videoUrlVal.length > 50000) {
        videoUrlVal = '';
      }
      const allowVideoVal = profile ? true : (c.allowVideo === 1 || c.allowVideo === true);

      return {
        id: c.id,
        shelfId: c.shelfId || null,
        cvDeadline: formatDate(c.cvDeadline),
        passportData: {
          passportNumber: c.passportNumber || '',
          surname: c.surname || '',
          givenNames: c.givenNames || '',
          dateOfBirth: formatDate(c.dateOfBirth) || '',
          gender: c.gender || '',
          nationality: c.nationality || '',
          issuingCountry: c.issuingCountry || '',
          dateOfIssue: formatDate(c.dateOfIssue),
          dateOfExpiry: formatDate(c.dateOfExpiry),
          placeOfBirth: c.placeOfBirth || '',
        },
        personalInfo: {
          idNumber: c.idNumber || c.passportNumber || '',
          job: c.job || '',
          maritalStatus: c.maritalStatus || '',
          numberOfChildren: c.numberOfChildren || 0,
          religion: c.religion || '',
          bloodType: c.bloodType || 'O+',
          height: c.height || null,
          weight: c.weight || null,
          phone: c.phone || '',
          email: c.email || '',
          address: c.address || '',
          city: c.city || '',
          state: c.state || '',
          country: c.country || '',
          educationLevel: c.educationLevel || '',
          languages: parseJsonField(c.languages),
          workExperience: parseJsonField(c.workExperience),
          skills: parseJsonField(c.skills),
          medicalStatus: c.medicalStatus || 'Pending',
          biometricStatus: c.biometricStatus || 'Pending',
          medicalDate: formatDate(c.medicalDate),
          biometricDate: formatDate(c.biometricDate),
          knownConditions: c.knownConditions || null,
          emergencyContactName: c.emergencyContactName || null,
          emergencyContactRelation: c.emergencyContactRelation || null,
          emergencyContactPhone: c.emergencyContactPhone || null,
          emergencyContactAddress: c.emergencyContactAddress || null,
          additionalPhones: parseJsonField(c.additionalPhones),
          brokerId: c.brokerId || '',
          cocDocumentUrl: encryptPath(c.cocDocumentUrl),
          medicalDocumentUrl: encryptPath(c.medicalDocumentUrl),
          candidateIdImageUrl: encryptPath(c.candidateIdImageUrl),
          relativeIdImageUrl: encryptPath(c.relativeIdImageUrl),
          labourIdUrl: encryptPath(actualLabourIdUrl),
          salary: c.salary || '1000SR',
        },
        passportImageUrl: encryptPath(c.passportImageUrl),
        facePhotoUrl: encryptPath(facePhotoUrlVal),
        fullBodyPhotoUrl: encryptPath(fullBodyPhotoUrlVal),
        cocDocumentUrl: encryptPath(c.cocDocumentUrl),
        medicalDocumentUrl: encryptPath(c.medicalDocumentUrl),
        candidateIdImageUrl: encryptPath(c.candidateIdImageUrl),
        relativeIdImageUrl: encryptPath(c.relativeIdImageUrl),
        labourIdUrl: encryptPath(actualLabourIdUrl),
        laborID: laborIdText || null,
        status: c.status || 'pending',
        isRequested: c.isRequested === 1 || c.isRequested === true,
        isFlagged: c.isFlagged === 1 || c.isFlagged === true,
        flaggedAt: formatDate(c.flaggedAt) ? new Date(c.flaggedAt).toISOString() : null,
        visaOrContractNumber: c.visaOrContractNumber || null,
        videoUrl: encryptPath(videoUrlVal),
        isLocked: c.isLocked === 1 || c.isLocked === true || ((brokerMap.get(c.brokerId) as any)?.isLocked || false),
        cvDownloaded: c.cvDownloaded === 1 || c.cvDownloaded === true,
        deployedDate: c.deployedDate ? new Date(c.deployedDate).toISOString() : null,
        registeredAt: c.registeredAt ? new Date(c.registeredAt).toISOString() : new Date().toISOString(),
        broker: brokerMap.get(c.brokerId) || null,
        visaSelected: c.visaSelected === 1 || c.visaSelected === true,
        visaDate: c.visaDate ? new Date(c.visaDate).toISOString() : null,
        salary: c.salary || '1000SR',
        price: isSuperAdmin ? (c.price || null) : null,
        generatedCVs: cvMap.get(c.id) || [],
        latestCVTemplate: (cvMap.get(c.id)?.[0]?.templateId) || null,
        registeredBy: userMap.get(c.registeredById) || 'Admin',
        hasInvoice: (invoiceMap.get(c.id)?.length ?? 0) > 0,
        isInvoiceDelivered: invoiceMap.get(c.id)?.some((i: any) => i.isDelivered) || false,
        agency: c.agency || 'daera',
        agencyStatus: c.agencyStatus || 'On process',
        allowVideo: allowVideoVal,
        quickVideoUrl: encryptPath(c.quickVideoUrl || null)
      };
    });

    res.json(candidates);
  } catch (error: any) {
    console.error('Failed to fetch candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
  }
});

// POST /api/candidates/promote-from-quick
router.post('/promote-from-quick', async (req: Request, res: Response) => {
  try {
    const { quickRegistrationId } = req.body;
    if (!quickRegistrationId) {
      return res.status(400).json({ error: 'quickRegistrationId is required' });
    }

    const [qrRows]: any = await pool.query('SELECT * FROM `QuickRegistration` WHERE `id` = ? LIMIT 1', [quickRegistrationId]);
    if (!qrRows || qrRows.length === 0) {
      return res.status(404).json({ error: 'Quick registration not found' });
    }
    const qr = qrRows[0];

    let videoUrl = qr.videoUrl || null;
    let allowVideo = qr.allowVideo === 1 || qr.allowVideo === true;

    const [cands]: any = await pool.query('SELECT * FROM `Candidate` WHERE LOWER(`passportNumber`) = LOWER(?) LIMIT 1', [qr.passportNumber]);
    if (!cands || cands.length === 0) {
      return res.status(404).json({ error: `No candidate found with passport number ${qr.passportNumber}. Please complete full registration first.` });
    }
    const candidate = cands[0];

    const setClauses: string[] = [];
    const params: any[] = [];

    if (qr.cocDocumentUrl) {
      setClauses.push('`cocDocumentUrl` = ?');
      params.push(qr.cocDocumentUrl);
    }
    if (qr.labourIdUrl) {
      setClauses.push('`labourIdUrl` = ?');
      params.push(qr.labourIdUrl);
    }
    if (qr.laborID) {
      setClauses.push('`laborID` = ?');
      params.push(qr.laborID);
    }
    if (qr.candidateIdImageUrl) {
      setClauses.push('`candidateIdImageUrl` = ?');
      params.push(qr.candidateIdImageUrl);
    }
    if (qr.relativeIdImageUrl) {
      setClauses.push('`relativeIdImageUrl` = ?');
      params.push(qr.relativeIdImageUrl);
    }
    let hasRemoteVideo = false;
    if (videoUrl) {
      if (videoUrl.startsWith('http')) {
        setClauses.push('`Youtube_URL` = ?');
        params.push(videoUrl);
        hasRemoteVideo = true;
      } else {
        setClauses.push('`quickVideoUrl` = ?');
        params.push(videoUrl);
      }
    }

    if (!hasRemoteVideo) {
      try {
        const pNum = (qr.passportNumber || '').trim().toUpperCase();
        if (pNum) {
          const [matchingVideos]: any = await pool.query('SELECT videoUrl FROM `PreRegisteredVideo` WHERE UPPER(`passportNumber`) = ? LIMIT 1', [pNum]);
          if (matchingVideos && matchingVideos.length > 0) {
            setClauses.push('`Youtube_URL` = ?');
            params.push(matchingVideos[0].videoUrl);
          }
        }
      } catch (err) {
        console.error('Failed to auto-match pre-registered video during promotion:', err);
      }
    }
    if (qr.agency) {
      setClauses.push('`agency` = ?');
      params.push(qr.agency);
    }
    setClauses.push('`allowVideo` = ?');
    params.push(allowVideo ? 1 : 0);

    if (setClauses.length > 0) {
      params.push(candidate.id);
      await pool.query(
        `UPDATE \`Candidate\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
        params
      );
    }

    await pool.query(
      `UPDATE \`QuickRegistration\` SET \`promotedAt\` = NOW(), \`promotedCandidateId\` = ?, \`verificationStatus\` = 'promoted' WHERE \`id\` = ?`,
      [candidate.id, quickRegistrationId]
    );

    res.json({
      success: true,
      candidateId: candidate.id,
      message: `Documents successfully pushed to candidate ${candidate.passportNumber}`,
    });
  } catch (error: any) {
    console.error('Failed to promote quick registration:', error);
    res.status(500).json({ error: error?.message || 'Failed to promote quick registration' });
  }
});

// POST /api/candidates
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    let registeredById = body.registeredById || null;
    let userRole = null;

    try {
      const session = await getSession(req);
      if (session?.user?.id) {
        registeredById = session.user.id;
        userRole = (session?.user as any)?.role;
      }
    } catch (sessionError) {
      console.error('Failed to get session in POST candidate route:', sessionError);
    }

    const [
      passportImageUrl,
      facePhotoUrl,
      fullBodyPhotoUrl,
      cocDocumentUrl,
      medicalDocumentUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      labourIdUrl,
      videoUrl
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.facePhotoUrl, 'faces'),
      uploadToLocal(body.fullBodyPhotoUrl, 'fullbody'),
      uploadToLocal(body.personalInfo.cocDocumentUrl, 'coc'),
      uploadToLocal(body.personalInfo.medicalDocumentUrl, 'medical'),
      uploadToLocal(body.personalInfo.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.personalInfo.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.personalInfo.labourIdUrl, 'labour-id'),
      uploadToLocal(body.videoUrl, 'videos')
    ]);

    const fs = require('fs');
    const path = require('path');
    const counterFilePath = path.join(process.cwd(), 'shelf_counter.json');
    let currentCounter = 0;

    if (fs.existsSync(counterFilePath)) {
      try {
        const data = fs.readFileSync(counterFilePath, 'utf8');
        const parsed = JSON.parse(data);
        if (typeof parsed.counter === 'number') {
          currentCounter = parsed.counter;
        }
      } catch (e) {}
    }

    if (currentCounter === 0) {
      const [lastCand]: any = await pool.query('SELECT `shelfId` FROM `Candidate` WHERE `shelfId` IS NOT NULL ORDER BY `shelfId` DESC LIMIT 1');
      if (lastCand && lastCand.length > 0 && lastCand[0].shelfId) {
        const parsed = parseInt(lastCand[0].shelfId, 10);
        if (!isNaN(parsed)) currentCounter = parsed;
      }
    }

    const nextNum = currentCounter + 1;
    try {
      fs.writeFileSync(counterFilePath, JSON.stringify({ counter: nextNum }), 'utf8');
    } catch (e) {}

    const nextShelfId = body.shelfId || String(nextNum).padStart(3, '0');

    let matchedPreRegisteredVideoUrl: string | null = null;
    try {
      const pNum = (body.passportData.passportNumber || '').trim().toUpperCase();
      if (pNum) {
        const [matchingVideos]: any = await pool.query('SELECT videoUrl FROM `PreRegisteredVideo` WHERE UPPER(`passportNumber`) = ? LIMIT 1', [pNum]);
        if (matchingVideos && matchingVideos.length > 0) {
          matchedPreRegisteredVideoUrl = matchingVideos[0].videoUrl;
        }
      }
    } catch (err) {}

    let finalBrokerId = body.personalInfo?.brokerId;
    if (userRole === 'calling' || body.personalInfo?.brokerId === 'calling-broker' || body.isCalling) {
      try {
        const [callingBrokers]: any = await pool.query("SELECT id FROM Broker WHERE name = 'Calling' LIMIT 1");
        if (callingBrokers && callingBrokers.length > 0) {
          finalBrokerId = callingBrokers[0].id;
        } else {
          const brokerId = 'cb' + generateId().slice(0, 23);
          await pool.query(
            'INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, NULL, NOW(3), 0)',
            [brokerId, 'Calling']
          );
          finalBrokerId = brokerId;
        }
      } catch (brokerErr) {
        console.error('Failed to resolve or create Calling broker:', brokerErr);
      }
    }

    const candidateId = generateId();

    const candidateValues = {
      id: candidateId,
      shelfId: nextShelfId,
      passportNumber: body.passportData.passportNumber,
      surname: body.passportData.surname,
      givenNames: body.passportData.givenNames,
      dateOfBirth: body.passportData.dateOfBirth ? new Date(body.passportData.dateOfBirth) : new Date(),
      gender: body.passportData.gender,
      nationality: body.passportData.nationality,
      issuingCountry: body.passportData.issuingCountry,
      dateOfIssue: body.passportData.dateOfIssue ? new Date(body.passportData.dateOfIssue) : new Date(),
      dateOfExpiry: body.passportData.dateOfExpiry ? new Date(body.passportData.dateOfExpiry) : new Date(),
      placeOfBirth: body.passportData.placeOfBirth,
      maritalStatus: body.personalInfo.maritalStatus,
      numberOfChildren: body.personalInfo.numberOfChildren || 0,
      religion: body.personalInfo.religion,
      bloodType: body.personalInfo.bloodType,
      height: body.personalInfo.height || null,
      weight: body.personalInfo.weight || null,
      phone: body.personalInfo.phone || null,
      additionalPhones: body.personalInfo.additionalPhones || [],
      email: body.personalInfo.email || null,
      address: body.personalInfo.address || null,
      city: body.personalInfo.city || null,
      state: body.personalInfo.state || null,
      country: body.personalInfo.country || null,
      idNumber: body.personalInfo.idNumber || null,
      job: body.personalInfo.job || null,
      educationLevel: body.personalInfo.educationLevel || null,
      languages: body.personalInfo.languages || [],
      workExperience: body.personalInfo.workExperience || [],
      skills: body.personalInfo.skills || [],
      medicalStatus: body.personalInfo.medicalStatus || 'Pending',
      biometricStatus: body.personalInfo.biometricStatus || 'Pending',
      medicalDate: body.personalInfo.medicalDate ? new Date(body.personalInfo.medicalDate) : null,
      biometricDate: body.personalInfo.biometricDate ? new Date(body.personalInfo.biometricDate) : null,
      knownConditions: body.personalInfo.knownConditions || null,
      emergencyContactName: body.personalInfo.emergencyContactName || null,
      emergencyContactRelation: body.personalInfo.emergencyContactRelation || null,
      emergencyContactPhone: body.personalInfo.emergencyContactPhone || null,
      emergencyContactAddress: body.personalInfo.emergencyContactAddress || null,
      passportImageUrl: passportImageUrl || null,
      facePhotoUrl: facePhotoUrl || null,
      fullBodyPhotoUrl: fullBodyPhotoUrl || null,
      cocDocumentUrl: cocDocumentUrl || null,
      medicalDocumentUrl: medicalDocumentUrl || null,
      candidateIdImageUrl: candidateIdImageUrl || null,
      relativeIdImageUrl: relativeIdImageUrl || null,
      labourIdUrl: labourIdUrl || null,
      status: body.status || 'pending',
      salary: body.personalInfo?.salary || '1000SR',
      agency: body.agency || 'daera',
      brokerId: finalBrokerId || null,
      registeredById: registeredById || null,
      allowVideo: body.allowVideo ?? false,
      videoUrl: matchedPreRegisteredVideoUrl || (videoUrl && videoUrl.startsWith('http') ? videoUrl : null),
      quickVideoUrl: videoUrl && !videoUrl.startsWith('http') ? videoUrl : null,
    };

    await db.insert(candidateTable).values(candidateValues);

    if (userRole === 'calling' || body.personalInfo?.brokerId === 'calling-broker' || body.isCalling) {
      const templateId = body.office || body.templateId || body.agency || '';
      const validTemplates = ['ussus', 'al-shablan', 'alm', 'almala', 'ka7', 'ku2', 'ma', 'ra', 'vision'];
      if (validTemplates.includes(templateId.toLowerCase())) {
        try {
          await db.insert(generatedCvTable).values({
            candidateId: candidateId,
            templateId: templateId.toLowerCase(),
            facePhotoUrl: facePhotoUrl || null,
            fullBodyPhotoUrl: null,
          });

          const deadline = new Date();
          deadline.setDate(deadline.getDate() + 30);
          await db.update(candidateTable).set({ cvDeadline: deadline }).where(eq(candidateTable.id, candidateId));
        } catch (cvErr) {
          console.error('[AUTO-CV] Failed to create initial GeneratedCV:', cvErr);
        }
      }
    }

    if (body.quickRegistrationId) {
      try {
        const [qrRows]: any = await pool.query(
          `SELECT \`allowVideo\` FROM \`QuickRegistration\` WHERE \`id\` = ?`,
          [body.quickRegistrationId]
        );
        if (qrRows && qrRows.length > 0) {
          const qrAllowVideo = qrRows[0].allowVideo === 1 || qrRows[0].allowVideo === true;
          await db.update(candidateTable).set({ allowVideo: qrAllowVideo }).where(eq(candidateTable.id, candidateId));
        }

        await pool.query(
          `UPDATE \`QuickRegistration\` SET \`promotedAt\` = NOW(), \`promotedCandidateId\` = ?, \`verificationStatus\` = 'promoted' WHERE \`id\` = ?`,
          [candidateId, body.quickRegistrationId]
        );
      } catch (promotionError) {
        console.error(`Failed to update QuickRegistration promotion:`, promotionError);
      }
    }

    const [createdCand]: any = await pool.query('SELECT * FROM `Candidate` WHERE `id` = ? LIMIT 1', [candidateId]);
    res.status(201).json(createdCand[0]);
  } catch (error: any) {
    console.error('Failed to create candidate:', error);
    if (error?.code === 'ER_DUP_ENTRY' || error?.message?.includes('Duplicate entry')) {
      return res.status(400).json({ error: 'A candidate with this Passport Number already exists in the system.' });
    }
    res.status(500).json({ error: formatDbError(error) });
  }
});

// GET /api/candidates/by-passport/:passportNumber
router.get('/by-passport/:passportNumber', async (req: Request, res: Response) => {
  try {
    const { passportNumber } = req.params;
    const [rows]: any = await pool.query(
      'SELECT givenNames, surname FROM `Candidate` WHERE LOWER(`passportNumber`) = LOWER(?) LIMIT 1',
      [passportNumber]
    );

    if (!rows || rows.length === 0) {
      return res.json({ found: false });
    }

    const c = rows[0];
    res.json({
      found: true,
      fullName: `${c.surname} ${c.givenNames}`.trim()
    });
  } catch (err: any) {
    console.error('Failed to lookup candidate by passport:', err);
    res.status(500).json({ error: 'Failed to look up candidate: ' + err.message });
  }
});

// GET /api/candidates/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const role = (session?.user as any)?.role;
    const isSuperAdmin = role === 'super_admin';
    const { id } = req.params;

    const [rows]: any = await pool.query('SELECT * FROM `Candidate` WHERE `id` = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const c = rows[0];

    let broker = null;
    if (c.brokerId) {
      const [brokerRows]: any = await pool.query('SELECT `id`, `name`, `isLocked` FROM `Broker` WHERE `id` = ? LIMIT 1', [c.brokerId]);
      if (brokerRows && brokerRows.length > 0) {
        broker = {
          id: brokerRows[0].id,
          name: brokerRows[0].name,
          isLocked: brokerRows[0].isLocked === 1 || brokerRows[0].isLocked === true
        };
      }
    }

    const [generatedCVs]: any = await pool.query('SELECT `id`, `templateId` FROM `GeneratedCV` WHERE `candidateId` = ? ORDER BY `createdAt` DESC LIMIT 1', [id]);

    let registeredByName = 'Admin';
    if (c.registeredById) {
      try {
        const [userRows]: any = await pool.query('SELECT `name` FROM `User` WHERE `id` = ? LIMIT 1', [c.registeredById]);
        if (userRows && userRows.length > 0) {
          registeredByName = userRows[0].name || 'Admin';
        }
      } catch (_) {}
    }

    const youtubeUrl = c.Youtube_URL || null;
    const candidateDeployedDate = c.deployedDate ? new Date(c.deployedDate).toISOString() : null;
    const candidateIsLocked = c.isLocked === 1 || c.isLocked === true;
    const candidateCvDownloaded = c.cvDownloaded === 1 || c.cvDownloaded === true;
    const candidatePrice = c.price || null;

    if (role === 'agency') {
      const isLocked = (broker?.isLocked) || candidateIsLocked;
      if (c.isFlagged || isLocked) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this candidate' });
      }
    }

    let uploadedFacePhotoUrl: string | null = null;
    let uploadedFullBodyPhotoUrl: string | null = null;
    let uploadedVideoUrl: string | null = null;
    if (c.passportNumber) {
      try {
        const pNum = c.passportNumber.trim().toUpperCase();
        const [profileRows]: any = await pool.query(
          `SELECT facePhotoUrl, fullBodyPhotoUrl, videoUrl FROM \`UploadedVideoProfile\` WHERE UPPER(\`passportNumber\`) = ? LIMIT 1`,
          [pNum]
        );
        if (profileRows && profileRows.length > 0) {
          uploadedFacePhotoUrl = profileRows[0].facePhotoUrl || null;
          uploadedFullBodyPhotoUrl = profileRows[0].fullBodyPhotoUrl || null;
          uploadedVideoUrl = profileRows[0].videoUrl || null;
        }
      } catch (_) {}
    }

    const parseJsonField = (field: any) => {
      if (!field) return [];
      if (typeof field === 'object') return field;
      try {
        return JSON.parse(field);
      } catch (_) {
        return [];
      }
    };

    const formatDate = (date: any) => {
      if (!date) return null;
      try {
        return new Date(date).toISOString().split('T')[0];
      } catch (_) {
        return null;
      }
    };

    let laborIdText = c.laborID;
    let actualLabourIdUrl = c.labourIdUrl || null;

    const candidate = {
      id: c.id,
      shelfId: c.shelfId || null,
      cvDeadline: formatDate(c.cvDeadline),
      passportData: {
        passportNumber: c.passportNumber || '',
        surname: c.surname || '',
        givenNames: c.givenNames || '',
        dateOfBirth: formatDate(c.dateOfBirth) || '',
        gender: c.gender || '',
        nationality: c.nationality || '',
        issuingCountry: c.issuingCountry || '',
        dateOfIssue: formatDate(c.dateOfIssue),
        dateOfExpiry: formatDate(c.dateOfExpiry),
        placeOfBirth: c.placeOfBirth || '',
      },
      personalInfo: {
        idNumber: c.idNumber || c.passportNumber || '',
        job: c.job || '',
        maritalStatus: c.maritalStatus || '',
        numberOfChildren: c.numberOfChildren || 0,
        religion: c.religion || '',
        bloodType: c.bloodType || 'O+',
        height: c.height || null,
        weight: c.weight || null,
        phone: c.phone || '',
        email: c.email || '',
        address: c.address || '',
        city: c.city || '',
        state: c.state || '',
        country: c.country || '',
        educationLevel: c.educationLevel || '',
        languages: parseJsonField(c.languages),
        workExperience: parseJsonField(c.workExperience),
        skills: parseJsonField(c.skills),
        medicalStatus: c.medicalStatus || 'Pending',
        biometricStatus: c.biometricStatus || 'Pending',
        medicalDate: formatDate(c.medicalDate),
        biometricDate: formatDate(c.biometricDate),
        knownConditions: c.knownConditions || null,
        emergencyContactName: c.emergencyContactName || null,
        emergencyContactRelation: c.emergencyContactRelation || null,
        emergencyContactPhone: c.emergencyContactPhone || null,
        emergencyContactAddress: c.emergencyContactAddress || null,
        additionalPhones: parseJsonField(c.additionalPhones),
        brokerId: c.brokerId || '',
        cocDocumentUrl: encryptPath(c.cocDocumentUrl),
        medicalDocumentUrl: encryptPath(c.medicalDocumentUrl),
        candidateIdImageUrl: encryptPath(c.candidateIdImageUrl),
        relativeIdImageUrl: encryptPath(c.relativeIdImageUrl),
        labourIdUrl: encryptPath(actualLabourIdUrl),
        salary: c.salary || '1000SR',
      },
      passportImageUrl: encryptPath(c.passportImageUrl),
      facePhotoUrl: encryptPath(uploadedFacePhotoUrl || c.facePhotoUrl),
      fullBodyPhotoUrl: encryptPath(uploadedFullBodyPhotoUrl || c.fullBodyPhotoUrl),
      cocDocumentUrl: encryptPath(c.cocDocumentUrl),
      medicalDocumentUrl: encryptPath(c.medicalDocumentUrl),
      candidateIdImageUrl: encryptPath(c.candidateIdImageUrl),
      relativeIdImageUrl: encryptPath(c.relativeIdImageUrl),
      labourIdUrl: encryptPath(actualLabourIdUrl),
      laborID: laborIdText || null,
      status: c.status || 'pending',
      isRequested: c.isRequested === 1 || c.isRequested === true,
      visaOrContractNumber: c.visaOrContractNumber || null,
      videoUrl: encryptPath(uploadedVideoUrl || youtubeUrl || c.videoUrl || null),
      Youtube_URL: uploadedVideoUrl || youtubeUrl || null,
      quickVideoUrl: encryptPath(c.quickVideoUrl || null),
      deployedDate: candidateDeployedDate,
      registeredAt: c.registeredAt ? new Date(c.registeredAt).toISOString() : new Date().toISOString(),
      broker: broker,
      visaSelected: c.visaSelected === 1 || c.visaSelected === true,
      visaDate: c.visaDate ? new Date(c.visaDate).toISOString() : null,
      salary: c.salary || '1000SR',
      isFlagged: c.isFlagged === 1 || c.isFlagged === true,
      isLocked: candidateIsLocked || (broker?.isLocked || false),
      cvDownloaded: candidateCvDownloaded,
      latestCVTemplate: generatedCVs?.[0]?.templateId || null,
      registeredBy: registeredByName,
      agency: c.agency || 'daera',
      allowVideo: uploadedVideoUrl ? true : (c.allowVideo === 1 || c.allowVideo === true),
      price: isSuperAdmin ? candidatePrice : null,
    };
    res.json(candidate);
  } catch (error) {
    console.error('Failed to fetch candidate details:', error);
    res.status(500).json({ error: 'Failed to fetch candidate details' });
  }
});

// PUT /api/candidates/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;
    
    const priceVal = body.price;
    delete body.price;
    if (body.personalInfo) delete body.personalInfo.price;

    const laborIdVal = body.laborID;
    delete body.laborID;
    if (body.personalInfo) delete body.personalInfo.laborID;

    let registeredById = body.registeredById || null;
    try {
      const session = await getSession(req);
      if (session?.user?.id) registeredById = session.user.id;
    } catch (_) {}

    const [
      passportImageUrl,
      facePhotoUrl,
      fullBodyPhotoUrl,
      cocDocumentUrl,
      medicalDocumentUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      labourIdUrl,
      videoUrl
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.facePhotoUrl, 'faces'),
      uploadToLocal(body.fullBodyPhotoUrl, 'fullbody'),
      uploadToLocal(body.personalInfo?.cocDocumentUrl, 'coc'),
      uploadToLocal(body.personalInfo?.medicalDocumentUrl, 'medical'),
      uploadToLocal(body.personalInfo?.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.personalInfo?.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.personalInfo?.labourIdUrl, 'labour-id'),
      uploadToLocal(body.videoUrl, 'videos')
    ]);

    const [existingRows]: any = await pool.query('SELECT visaDate, registeredById FROM Candidate WHERE id = ? LIMIT 1', [id]);
    const existingCandidate = existingRows?.[0];

    let visaDateVal = existingCandidate?.visaDate;
    if (body.visaSelected) {
      visaDateVal = existingCandidate?.visaDate || new Date();
    } else if (body.visaSelected === false) {
      visaDateVal = null;
    }

    const updateFields: any = {
      passportNumber: body.passportData.passportNumber,
      surname: body.passportData.surname,
      givenNames: body.passportData.givenNames,
      dateOfBirth: body.passportData.dateOfBirth ? new Date(body.passportData.dateOfBirth) : new Date(),
      gender: body.passportData.gender,
      nationality: body.passportData.nationality,
      issuingCountry: body.passportData.issuingCountry,
      dateOfIssue: body.passportData.dateOfIssue ? new Date(body.passportData.dateOfIssue) : new Date(),
      dateOfExpiry: body.passportData.dateOfExpiry ? new Date(body.passportData.dateOfExpiry) : new Date(),
      placeOfBirth: body.passportData.placeOfBirth,
      idNumber: body.personalInfo.idNumber,
      job: body.personalInfo.job,
      maritalStatus: body.personalInfo.maritalStatus,
      numberOfChildren: body.personalInfo.numberOfChildren,
      religion: body.personalInfo.religion,
      bloodType: body.personalInfo.bloodType,
      height: body.personalInfo.height,
      weight: body.personalInfo.weight,
      phone: body.personalInfo.phone,
      email: body.personalInfo.email,
      address: body.personalInfo.address,
      city: body.personalInfo.city,
      state: body.personalInfo.state,
      country: body.personalInfo.country,
      educationLevel: body.personalInfo.educationLevel,
      languages: body.personalInfo.languages,
      workExperience: body.personalInfo.workExperience,
      skills: body.personalInfo.skills,
      medicalStatus: body.personalInfo.medicalStatus,
      biometricStatus: body.personalInfo.biometricStatus,
      medicalDate: body.personalInfo.medicalDate ? new Date(body.personalInfo.medicalDate) : null,
      biometricDate: body.personalInfo.biometricDate ? new Date(body.personalInfo.biometricDate) : null,
      knownConditions: body.personalInfo.knownConditions,
      emergencyContactName: body.personalInfo.emergencyContactName,
      emergencyContactRelation: body.personalInfo.emergencyContactRelation,
      emergencyContactPhone: body.personalInfo.emergencyContactPhone,
      emergencyContactAddress: body.personalInfo.emergencyContactAddress,
      additionalPhones: body.personalInfo.additionalPhones || [],
      brokerId: body.personalInfo.brokerId || null,
      status: body.status,
      isRequested: body.isRequested,
      visaSelected: body.visaSelected,
      agency: body.agency || 'daera',
      salary: body.personalInfo?.salary || '1000SR',
      allowVideo: body.allowVideo ?? false,
      visaDate: visaDateVal,
    };

    if (passportImageUrl) updateFields.passportImageUrl = passportImageUrl;
    if (facePhotoUrl) updateFields.facePhotoUrl = facePhotoUrl;
    if (fullBodyPhotoUrl) updateFields.fullBodyPhotoUrl = fullBodyPhotoUrl;
    if (cocDocumentUrl) updateFields.cocDocumentUrl = cocDocumentUrl;
    if (medicalDocumentUrl) updateFields.medicalDocumentUrl = medicalDocumentUrl;
    if (candidateIdImageUrl) updateFields.candidateIdImageUrl = candidateIdImageUrl;
    if (relativeIdImageUrl) updateFields.relativeIdImageUrl = relativeIdImageUrl;
    if (labourIdUrl) updateFields.labourIdUrl = labourIdUrl;
    if (priceVal !== undefined) updateFields.price = priceVal;
    if (laborIdVal !== undefined) updateFields.laborID = laborIdVal || null;
    if (!existingCandidate?.registeredById && registeredById) updateFields.registeredById = registeredById;

    if (videoUrl && videoUrl.startsWith('http')) {
      updateFields.videoUrl = videoUrl;
    } else if (videoUrl) {
      updateFields.quickVideoUrl = videoUrl;
    }

    if (body.isFlagged !== undefined) {
      updateFields.isFlagged = Boolean(body.isFlagged);
      updateFields.flaggedAt = body.isFlagged ? new Date() : null;
    }

    await db.update(candidateTable).set(updateFields).where(eq(candidateTable.id, id));

    if (facePhotoUrl || fullBodyPhotoUrl) {
      try {
        const cvUpdate: any = {};
        if (facePhotoUrl) cvUpdate.facePhotoUrl = facePhotoUrl;
        if (fullBodyPhotoUrl) cvUpdate.fullBodyPhotoUrl = fullBodyPhotoUrl;
        await db.update(generatedCvTable).set(cvUpdate).where(eq(generatedCvTable.candidateId, id));
      } catch (_) {}
    }

    const [updatedRows]: any = await pool.query('SELECT * FROM Candidate WHERE id = ? LIMIT 1', [id]);
    res.json(updatedRows[0]);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    if (error?.code === 'ER_DUP_ENTRY' || error?.message?.includes('Duplicate entry')) {
      return res.status(400).json({ error: 'A candidate with this Passport Number already exists.' });
    }
    res.status(500).json({ error: formatDbError(error) });
  }
});

// PATCH /api/candidates/bulk-cv-downloaded
router.patch('/bulk-cv-downloaded', async (req: Request, res: Response) => {
  try {
    const { candidateIds, cvDownloaded } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'candidateIds must be a non-empty array' });
    }
    
    await db
      .update(candidateTable)
      .set({ cvDownloaded: Boolean(cvDownloaded) })
      .where(inArray(candidateTable.id, candidateIds));

    if (cvDownloaded) {
      for (const id of candidateIds) {
        try {
          const existingCVs = await db.select().from(generatedCvTable).where(eq(generatedCvTable.candidateId, id));
          if (existingCVs.length === 0) {
            const [cands]: any = await pool.query('SELECT facePhotoUrl, fullBodyPhotoUrl FROM Candidate WHERE id = ? LIMIT 1', [id]);
            if (cands && cands.length > 0) {
              await db.insert(generatedCvTable).values({
                candidateId: id,
                templateId: 'alm',
                facePhotoUrl: cands[0].facePhotoUrl || '',
                fullBodyPhotoUrl: cands[0].fullBodyPhotoUrl || ''
              });
            }
          }
        } catch (_) {}
      }
    }
    
    res.json({ success: true, updatedCount: candidateIds.length });
  } catch (error: any) {
    console.error('Failed to bulk update cvDownloaded:', error);
    res.status(500).json({ error: error?.message || 'Failed to bulk update cvDownloaded' });
  }
});

// PATCH /api/candidates/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    if (body.medicalStatus === 'Unfit') {
      body.isRequested = true;
      await db.delete(generatedCvTable).where(eq(generatedCvTable.candidateId, id));
    }

    let isFlaggedVal = body.isFlagged !== undefined ? Boolean(body.isFlagged) : undefined;
    let isLockedVal = body.isLocked !== undefined ? Boolean(body.isLocked) : undefined;
    let cvDownloadedVal = body.cvDownloaded !== undefined ? Boolean(body.cvDownloaded) : undefined;
    let priceVal = body.price;
    let laborIdVal = body.laborID;
    let videoUrlVal = body.videoUrl;
    let allowVideoVal = body.allowVideo;
    let deployedDateVal = body.deployedDate;
    let quickVideoUrlVal = body.quickVideoUrl;

    delete body.isFlagged;
    delete body.isLocked;
    delete body.cvDownloaded;
    delete body.price;
    delete body.laborID;
    delete body.videoUrl;
    delete body.allowVideo;
    delete body.deployedDate;
    delete body.quickVideoUrl;
    delete body.Youtube_URL;
    delete body.visaDate;
    if (body.personalInfo) {
      delete body.personalInfo.price;
      delete body.personalInfo.laborID;
    }

    const updateFields: any = { ...body };

    if (isFlaggedVal !== undefined) {
      updateFields.isFlagged = isFlaggedVal;
      updateFields.flaggedAt = isFlaggedVal ? new Date() : null;
    }
    if (isLockedVal !== undefined) updateFields.isLocked = isLockedVal;
    if (cvDownloadedVal !== undefined) updateFields.cvDownloaded = cvDownloadedVal;
    if (priceVal !== undefined) updateFields.price = priceVal;
    if (laborIdVal !== undefined) updateFields.laborID = laborIdVal || null;
    if (allowVideoVal !== undefined) updateFields.allowVideo = Boolean(allowVideoVal);
    if (deployedDateVal !== undefined) updateFields.deployedDate = deployedDateVal ? new Date(deployedDateVal) : null;

    if (videoUrlVal !== undefined) {
      const sanitizedVideoUrl = sanitizeIncomingPath(videoUrlVal);
      if (sanitizedVideoUrl && sanitizedVideoUrl.startsWith('http')) {
        updateFields.videoUrl = sanitizedVideoUrl;
      }
    }

    if (quickVideoUrlVal !== undefined) {
      updateFields.quickVideoUrl = sanitizeIncomingPath(quickVideoUrlVal) || null;
    }

    if (Object.keys(updateFields).length > 0) {
      await db.update(candidateTable).set(updateFields).where(eq(candidateTable.id, id));
    }

    if (cvDownloadedVal === true) {
      const existingCVs = await db.select().from(generatedCvTable).where(eq(generatedCvTable.candidateId, id));
      if (existingCVs.length === 0) {
        const [cands]: any = await pool.query('SELECT facePhotoUrl, fullBodyPhotoUrl FROM Candidate WHERE id = ? LIMIT 1', [id]);
        if (cands && cands.length > 0) {
          await db.insert(generatedCvTable).values({
            candidateId: id,
            templateId: 'alm',
            facePhotoUrl: cands[0].facePhotoUrl || '',
            fullBodyPhotoUrl: cands[0].fullBodyPhotoUrl || ''
          });
        }
      }
    }

    const [updatedRows]: any = await pool.query('SELECT * FROM Candidate WHERE id = ? LIMIT 1', [id]);
    res.json(updatedRows[0]);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    res.status(500).json({ error: formatDbError(error) });
  }
});

// DELETE /api/candidates/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(generatedCvTable).where(eq(generatedCvTable.candidateId, id)).catch(() => {});
    await db.delete(invoiceTable).where(eq(invoiceTable.candidateId, id)).catch(() => {});
    await db.delete(notificationTable).where(eq(notificationTable.candidateId, id)).catch(() => {});

    await pool.query(
      `UPDATE \`QuickRegistration\` SET \`promotedCandidateId\` = NULL, \`verificationStatus\` = 'pending' WHERE \`promotedCandidateId\` = ?`,
      [id]
    ).catch(() => {});

    await db.delete(candidateTable).where(eq(candidateTable.id, id));
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete candidate:', error);
    res.status(500).json({ error: error?.message || 'Failed to delete candidate' });
  }
});

export default router;
