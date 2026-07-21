import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';
import { getSession } from '../lib/auth-helper';
import { encryptPath, sanitizeIncomingPath } from '../lib/crypto';
import crypto from 'crypto';

function formatPrismaError(error: any): string {
  if (!error) return 'Unknown error';
  
  let msg = error.message || String(error);
  let codeStr = error.code ? `[Prisma Error ${error.code}]: ` : '';
  
  // Clean up any Prisma validation/invocation errors by extracting the reason after the query block
  if (msg.includes('invocation:')) {
    const lastBraceIdx = msg.lastIndexOf('}');
    if (lastBraceIdx !== -1) {
      const reason = msg.substring(lastBraceIdx + 1).trim();
      if (reason) {
        return codeStr + reason.split('\n').map((l: string) => l.trim()).filter(Boolean).join(' | ');
      }
    }
  }
  
  // Fallback: If there are newlines, try to get the last lines that aren't query structure
  if (msg.includes('\n')) {
    const lines = msg.split('\n').map((l: string) => l.trim()).filter(Boolean);
    const actualReasonLines = [];
    for (let i = lines.length - 1; i >= 0; i--) {
      const line = lines[i];
      if (
        line.includes('prisma.') || 
        line.includes('invocation:') || 
        line.startsWith('{') || 
        line.startsWith('}') || 
        line.startsWith('where:') || 
        line.startsWith('data:')
      ) {
        break;
      }
      actualReasonLines.unshift(line);
    }
    if (actualReasonLines.length > 0) {
      return codeStr + actualReasonLines.join(' | ');
    }
  }
  
  return codeStr + msg;
}

const router = Router();


async function getBrokerLockMap(): Promise<Record<string, boolean>> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; isLocked: number | boolean }[]>(
      'SELECT id, isLocked FROM Broker'
    );
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      map[row.id] = row.isLocked === 1 || row.isLocked === true;
    }
    return map;
  } catch (e) {
    console.warn('[CANDIDATES] Could not fetch isLocked column via raw SQL:', e);
    return {};
  }
}

// GET /api/candidates
router.get('/', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    const role = (session?.user as any)?.role;
    const isSuperAdmin = role === 'super_admin';

    // 1. Dynamic Column Discovery
    let dbCols = new Set<string>();
    try {
      const columnsInfo = await prisma.$queryRawUnsafe<any[]>('SHOW COLUMNS FROM `Candidate`');
      for (const col of columnsInfo) {
        dbCols.add(col.Field);
      }
    } catch (e) {
      console.warn('[DB] Could not dynamically check Candidate columns, falling back:', e);
    }

    const defaultCols = [
      'id', 'shelfId', 'passportNumber', 'surname', 'givenNames', 'dateOfBirth', 'gender',
      'nationality', 'issuingCountry', 'dateOfIssue', 'dateOfExpiry', 'placeOfBirth',
      'maritalStatus', 'numberOfChildren', 'religion', 'bloodType', 'height', 'weight',
      'phone', 'additionalPhones', 'email', 'address', 'city', 'state', 'country',
      'idNumber', 'job', 'educationLevel', 'languages', 'workExperience', 'skills',
      'medicalStatus', 'biometricStatus', 'medicalDate', 'biometricDate', 'knownConditions',
      'cvDeadline', 'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
      'emergencyContactAddress', 'facePhotoUrl',
      'isRequested', 'visaOrContractNumber', 'isFlagged', 'flaggedAt', 'Youtube_URL',
      'registeredAt', 'status', 'brokerId', 'visaSelected', 'registeredById', 'salary',
      'visaDate', 'agency', 'deployedDate', 'isLocked', 'allowVideo', 'price',
      'laborID', 'agencyStatus'
    ];

    // Filter down select list to columns that actually exist in the DB
    const selectCols = defaultCols.filter(col => dbCols.size === 0 || dbCols.has(col));
    const selectStr = selectCols.map(col => `\`${col}\``).join(', ');

    // 2. Fetch Candidate Rows
    const dbCandidates = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ${selectStr} FROM \`Candidate\` ORDER BY \`registeredAt\` DESC`
    );

    // 3. Fetch Relations Safely
    const users = await prisma.$queryRawUnsafe<any[]>('SELECT `id`, `name` FROM `User`').catch(() => []);
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const brokers = await prisma.$queryRawUnsafe<any[]>('SELECT `id`, `name`, `isLocked` FROM `Broker`').catch(() => []);
    const brokerMap = new Map(brokers.map(b => [b.id, { id: b.id, name: b.name, isLocked: b.isLocked === 1 || b.isLocked === true }]));

    const invoices = await prisma.$queryRawUnsafe<any[]>('SELECT `candidateId`, `isDelivered` FROM `Invoice`').catch(() => []);
    const invoiceMap = new Map<string, any[]>();
    for (const inv of invoices) {
      const list = invoiceMap.get(inv.candidateId) || [];
      list.push({ isDelivered: inv.isDelivered === 1 || inv.isDelivered === true });
      invoiceMap.set(inv.candidateId, list);
    }

    const cvs = await prisma.$queryRawUnsafe<any[]>('SELECT `id`, `candidateId`, `templateId` FROM `GeneratedCV` ORDER BY `createdAt` DESC').catch(() => []);
    const cvMap = new Map<string, any[]>();
    for (const cv of cvs) {
      const list = cvMap.get(cv.candidateId) || [];
      list.push({ id: cv.id, templateId: cv.templateId });
      cvMap.set(cv.candidateId, list);
    }

    // Video profiles
    let videoProfileMap = new Map<string, any>();
    try {
      const profiles: any[] = await prisma.$queryRawUnsafe(
        'SELECT passportNumber, videoUrl, facePhotoUrl, fullBodyPhotoUrl FROM `UploadedVideoProfile` WHERE `videoUrl` IS NOT NULL AND `videoUrl` != \'\''
      );
      for (const p of profiles) {
        videoProfileMap.set(p.passportNumber.trim().toUpperCase(), p);
      }
    } catch (_) {}

    // 4. Map candidate records
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

    const candidates = dbCandidates.map((c: any) => {
      const pNum = (c.passportNumber || '').trim().toUpperCase();
      const profile = videoProfileMap.get(pNum);

      let facePhotoUrlVal = profile ? (profile.facePhotoUrl || c.facePhotoUrl) : c.facePhotoUrl;
      // CRITICAL: Prevent massive base64 strings from crashing the response via NGINX truncation
      if (facePhotoUrlVal && facePhotoUrlVal.startsWith('data:') && facePhotoUrlVal.length > 50000) {
        facePhotoUrlVal = ''; 
      }
      
      let fullBodyPhotoUrlVal = profile ? (profile.fullBodyPhotoUrl || c.fullBodyPhotoUrl) : c.fullBodyPhotoUrl;
      let videoUrlVal = profile ? profile.videoUrl : (c.videoUrl || (c as any).Youtube_URL);
      
      let laborIdText = c.laborID;
      let actualLabourIdUrl = null;
      if (c.labourIdUrl) {
        if (c.labourIdUrl.includes('/') || c.labourIdUrl.includes('.')) {
          actualLabourIdUrl = c.labourIdUrl;
        } else if (!laborIdText) {
          laborIdText = c.labourIdUrl;
        }
      }
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
        isLocked: c.isLocked === 1 || c.isLocked === true || (brokerMap.get(c.brokerId)?.isLocked || false),
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
// Pushes documents from a verified QuickRegistration into the matching Candidate record
router.post('/promote-from-quick', async (req: Request, res: Response) => {
  try {
    const { quickRegistrationId } = req.body;
    if (!quickRegistrationId) {
      return res.status(400).json({ error: 'quickRegistrationId is required' });
    }

    // 1. Fetch the QuickRegistration record (including raw videoUrl)
    const qr: any = await prisma.quickRegistration.findUnique({
      where: { id: quickRegistrationId },
    });
    if (!qr) {
      return res.status(404).json({ error: 'Quick registration not found' });
    }


    // Also fetch raw videoUrl and allowVideo which may not be in Prisma Client cache
    let videoUrl = qr.videoUrl || null;
    let allowVideo = qr.allowVideo ?? false;
    try {
      const rawRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT \`videoUrl\`, \`allowVideo\`, \`laborID\` FROM \`QuickRegistration\` WHERE \`id\` = ?`,
        quickRegistrationId
      );
      if (rawRows.length > 0) {
        if (rawRows[0].videoUrl) videoUrl = rawRows[0].videoUrl;
        allowVideo = rawRows[0].allowVideo === 1 || rawRows[0].allowVideo === true;
        if (rawRows[0].laborID) qr.laborID = rawRows[0].laborID;
      }
    } catch (_) { /* column may not exist yet */ }

    // 2. Find the matching Candidate by passport number
    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { passportNumber: qr.passportNumber },
          { passportNumber: qr.passportNumber?.toUpperCase() },
          { passportNumber: qr.passportNumber?.toLowerCase() },
        ]
      }
    });

    if (!candidate) {
      return res.status(404).json({ error: `No candidate found with passport number ${qr.passportNumber}. Please complete full registration first.` });
    }

    // 3. Push documents from QR into Candidate via raw SQL (safe for stale Prisma cache)
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

    // Auto-match pre-registered YouTube video if no YouTube link is yet assigned
    if (!hasRemoteVideo) {
      try {
        const pNum = (qr.passportNumber || '').trim().toUpperCase();
        if (pNum) {
          const matchingVideo = await prisma.preRegisteredVideo.findUnique({
            where: { passportNumber: pNum }
          });

          if (matchingVideo) {
            setClauses.push('`videoUrl` = ?');
            params.push(matchingVideo.videoUrl);
            console.log(`[AUTO-MATCH-PROMOTE] Linked pre-registered YouTube video: ${matchingVideo.videoUrl}`);
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
      await prisma.$executeRawUnsafe(
        `UPDATE \`Candidate\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
        ...params
      );
      console.log(`[PROMOTE] Pushed ${setClauses.length} document fields from QR ${quickRegistrationId} to Candidate ${candidate.id}`);
    }

    // 4. Mark QR as promoted
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE \`QuickRegistration\` SET \`promotedAt\` = NOW(), \`promotedCandidateId\` = ?, \`verificationStatus\` = 'promoted' WHERE \`id\` = ?`,
        candidate.id,
        quickRegistrationId
      );
    } catch (e) {
      console.error(`Failed to update QuickRegistration promotion via raw SQL:`, e);
    }

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

    // Ensure allowVideo columns exist in database (self-healing fallback)
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`Candidate\` ADD COLUMN \`allowVideo\` TINYINT(1) NOT NULL DEFAULT 0`);
    } catch (_) {}
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`QuickRegistration\` ADD COLUMN \`allowVideo\` TINYINT(1) NOT NULL DEFAULT 0`);
    } catch (_) {}


    // Resolve logged in user from session to populate registeredById
    let registeredById = body.registeredById || null;
    let userRole = null;
    console.log('[DEBUG] POST /candidates - body.registeredById:', body.registeredById);

    try {
      // Build proper Web Request for Better Auth
      const session = await getSession(req);

      if (session?.user?.id) {
        registeredById = session.user.id;
        userRole = (session?.user as any)?.role;
        console.log('[DEBUG] Resolved registeredById from server session:', registeredById, 'User Name:', session.user.name);
      } else {
        console.log('[DEBUG] Server session returned null or no user ID.');
      }
    } catch (sessionError) {
      console.error('[DEBUG] Failed to get session in POST candidate route:', sessionError);
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

    // Separate file counter for shelfId to prevent reuse when candidate is deleted
    const fs = require('fs');
    const path = require('path');
    const counterFilePath = path.join(process.cwd(), 'shelf_counter.json');
    let currentCounter = 0;

    // 1. Try reading from file
    if (fs.existsSync(counterFilePath)) {
      try {
        const data = fs.readFileSync(counterFilePath, 'utf8');
        const parsed = JSON.parse(data);
        if (typeof parsed.counter === 'number') {
          currentCounter = parsed.counter;
        }
      } catch (e) {
        console.error("Error reading shelf_counter.json:", e);
      }
    }

    // 2. Fallback to DB if file counter is 0
    if (currentCounter === 0) {
      const lastCand = await prisma.candidate.findFirst({
        where: { shelfId: { not: null } },
        orderBy: { shelfId: 'desc' }
      });
      if (lastCand && lastCand.shelfId) {
        const parsed = parseInt(lastCand.shelfId, 10);
        if (!isNaN(parsed)) {
          currentCounter = parsed;
        }
      }
    }

    const nextNum = currentCounter + 1;

    // 3. Write back to file
    try {
      fs.writeFileSync(counterFilePath, JSON.stringify({ counter: nextNum }), 'utf8');
    } catch (e) {
      console.error("Error writing shelf_counter.json:", e);
    }

    const nextShelfId = body.shelfId || String(nextNum).padStart(3, '0');

    // Check if there is a pre-registered video matching this candidate's passport number
    let matchedPreRegisteredVideoUrl: string | null = null;
    try {
      const pNum = (body.passportData.passportNumber || '').trim().toUpperCase();
      if (pNum) {
        const matchingVideo = await prisma.preRegisteredVideo.findUnique({
          where: { passportNumber: pNum }
        });

        if (matchingVideo) {
          matchedPreRegisteredVideoUrl = matchingVideo.videoUrl;
          console.log(`[AUTO-MATCH] Linked pre-registered video to Candidate: ${matchedPreRegisteredVideoUrl}`);
        }
      }
    } catch (err) {
      console.error('Failed to auto-match pre-registered video:', err);
    }

    let finalBrokerId = body.personalInfo?.brokerId;
    if (userRole === 'calling' || body.personalInfo?.brokerId === 'calling-broker' || body.isCalling) {
      try {
        let callingBroker = await prisma.broker.findUnique({
          where: { name: 'Calling' }
        });
        if (!callingBroker) {
          const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
          let randomPart = '';
          for (let i = 0; i < 23; i++) {
            randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
          }
          const brokerId = 'cb' + randomPart;

          await prisma.$executeRawUnsafe(
            'INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, NULL, NOW(3), 0)',
            brokerId,
            'Calling'
          );

          callingBroker = {
            id: brokerId,
            name: 'Calling',
            leaderId: null,
            createdAt: new Date(),
            isLocked: false
          };
        }
        finalBrokerId = callingBroker.id;
      } catch (brokerErr) {
        console.error('Failed to resolve or create Calling broker:', brokerErr);
      }
    }

    const candidateData: any = {
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
        ...(finalBrokerId ? {
          broker: { connect: { id: finalBrokerId } }
        } : {}),

        passportImageUrl,
        facePhotoUrl,
        fullBodyPhotoUrl,
        cocDocumentUrl,
        medicalDocumentUrl,
        candidateIdImageUrl,
        relativeIdImageUrl,
        labourIdUrl,
        videoUrl: null, // YouTube URL saved separately via raw SQL
        status: body.status || 'pending',
        agency: body.agency || 'daera',
    };

    let candidate;
    try {
      candidate = await prisma.candidate.create({
        data: { ...candidateData, registeredById: registeredById }
      });
    } catch (createError: any) {
      console.error('[DEBUG] Prisma Create Error:', createError);
      if (createError.message && (createError.message.includes('registeredById') || createError.message.includes('Unknown arg'))) {
        console.warn('[DEBUG] Prisma schema out of sync (registeredById missing). Falling back to basic create.');
        candidate = await prisma.candidate.create({
          data: candidateData
        });
      } else {
        throw new Error(`Database Error: ${createError.message}`);
      }
    }

    // Save pre-registered video URL (from video uploads portal) if matched
    if (matchedPreRegisteredVideoUrl) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`Youtube_URL\` = ? WHERE \`id\` = ?`,
          matchedPreRegisteredVideoUrl,
          candidate.id
        );
      } catch (err) {
        console.error('Failed to save Youtube_URL via raw SQL:', err);
      }
    }

    // Save salary separately with graceful fallback (in case column doesn't exist in DB yet)
    try {
      const salaryValue = body.personalInfo?.salary || '1000SR';
      await prisma.$executeRawUnsafe(
        `UPDATE \`Candidate\` SET \`salary\` = ? WHERE \`id\` = ?`,
        salaryValue,
        candidate.id
      );
    } catch (_) { /* salary column may not exist yet, ignore */ }

    // Save agency separately with graceful fallback
    try {
      const agencyValue = body.agency || 'daera';
      await prisma.$executeRawUnsafe(
        `UPDATE \`Candidate\` SET \`agency\` = ? WHERE \`id\` = ?`,
        agencyValue,
        candidate.id
      );
    } catch (_) { /* agency column may not exist yet, ignore */ }

    // Automatically create a GeneratedCV record for Calling candidates with the selected Office (template ID)
    if (userRole === 'calling' || body.personalInfo?.brokerId === 'calling-broker' || body.isCalling) {
      const templateId = body.office || body.templateId || body.agency || '';
      const validTemplates = ['ussus', 'al-shablan', 'alm', 'almala', 'ka7', 'ku2', 'ma', 'ra', 'vision'];
      if (validTemplates.includes(templateId.toLowerCase())) {
        try {
          const existingCV = await prisma.generatedCV.findFirst({
            where: {
              candidateId: candidate.id,
              templateId: templateId.toLowerCase()
            }
          });
          if (!existingCV) {
            await prisma.generatedCV.create({
              data: {
                candidateId: candidate.id,
                templateId: templateId.toLowerCase(),
                facePhotoUrl: facePhotoUrl || null,
                fullBodyPhotoUrl: null
              }
            });
            // Also update cvDeadline
            const deadline = new Date();
            deadline.setDate(deadline.getDate() + 30);
            await prisma.$executeRawUnsafe(
              `UPDATE \`Candidate\` SET \`cvDeadline\` = ? WHERE \`id\` = ?`,
              deadline,
              candidate.id
            );
            console.log(`[AUTO-CV] Created initial GeneratedCV for Calling candidate ${candidate.id} using template: ${templateId}`);
          }
        } catch (cvErr) {
          console.error('[AUTO-CV] Failed to create initial GeneratedCV for calling candidate:', cvErr);
        }
      }
    }

    // Save allowVideo separately with graceful fallback (to prevent schema validation errors on stale cPanel instances)
    try {
      const allowVideoVal = body.allowVideo ?? false;
      await prisma.$executeRawUnsafe(
        `UPDATE \`Candidate\` SET \`allowVideo\` = ? WHERE \`id\` = ?`,
        allowVideoVal ? 1 : 0,
        candidate.id
      );
      console.log(`[DEBUG] Saved allowVideo (${allowVideoVal}) via raw SQL in POST`);
    } catch (e) {
      console.error('Failed to save allowVideo via raw SQL in POST:', e);
    }

    // Save registeredById separately with graceful fallback (to prevent schema validation errors on stale cPanel instances)
    if (registeredById) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`registeredById\` = ? WHERE \`id\` = ?`,
          registeredById,
          candidate.id
        );
        console.log(`[DEBUG] Saved registeredById (${registeredById}) via raw SQL in POST`);
      } catch (e) {
        console.error('Failed to save registeredById via raw SQL in POST:', e);
      }
    }

    // Save entry page video URL (local or remote) to quickVideoUrl
    if (videoUrl) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`quickVideoUrl\` = ? WHERE \`id\` = ?`,
          videoUrl,
          candidate.id
        );
      } catch (err) {
        console.error('Failed to save quickVideoUrl via raw SQL:', err);
      }
    }

    // If quickRegistrationId is provided, mark it as promoted
    if (body.quickRegistrationId) {
      try {
        // Query allowVideo from QuickRegistration
        const qrRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT \`allowVideo\` FROM \`QuickRegistration\` WHERE \`id\` = ?`,
          body.quickRegistrationId
        );
        let qrAllowVideo = false;
        if (qrRows && qrRows.length > 0) {
          qrAllowVideo = qrRows[0].allowVideo === 1 || qrRows[0].allowVideo === true;
          // Update the newly created Candidate's allowVideo field
          await prisma.$executeRawUnsafe(
            `UPDATE \`Candidate\` SET \`allowVideo\` = ? WHERE \`id\` = ?`,
            qrAllowVideo ? 1 : 0,
            candidate.id
          );
          console.log(`[DEBUG] Copied allowVideo (${qrAllowVideo}) from QuickRegistration to Candidate ${candidate.id}`);
        }

        await prisma.$executeRawUnsafe(
          `UPDATE \`QuickRegistration\` SET \`promotedAt\` = NOW(), \`promotedCandidateId\` = ?, \`verificationStatus\` = 'promoted' WHERE \`id\` = ?`,
          candidate.id,
          body.quickRegistrationId
        );
        console.log(`[DEBUG] Successfully promoted QuickRegistration ID ${body.quickRegistrationId} to Candidate ID ${candidate.id}`);
      } catch (promotionError) {
        console.error(`[DEBUG] Failed to update QuickRegistration promotion:`, promotionError);
      }
    }

    res.status(201).json(candidate);
  } catch (error: any) {
    console.error('Failed to create candidate:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'A candidate with this Passport Number already exists in the system.' });
    }
    res.status(500).json({ error: formatPrismaError(error) });
  }
});

// GET /api/candidates/by-passport/:passportNumber
router.get('/by-passport/:passportNumber', async (req: Request, res: Response) => {
  try {
    const { passportNumber } = req.params;
    const candidate = await prisma.candidate.findFirst({
      where: {
        OR: [
          { passportNumber: passportNumber },
          { passportNumber: passportNumber.toUpperCase() },
          { passportNumber: passportNumber.toLowerCase() },
        ]
      },
      select: {
        givenNames: true,
        surname: true
      }
    });

    if (!candidate) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      fullName: `${candidate.surname} ${candidate.givenNames}`.trim()
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

    // 1. Dynamic Column Discovery
    let dbCols = new Set<string>();
    try {
      const columnsInfo = await prisma.$queryRawUnsafe<any[]>('SHOW COLUMNS FROM `Candidate`');
      for (const col of columnsInfo) {
        dbCols.add(col.Field);
      }
    } catch (e) {
      console.warn('[DB] Could not dynamically check Candidate columns, falling back:', e);
    }

    const defaultCols = [
      'id', 'shelfId', 'passportNumber', 'surname', 'givenNames', 'dateOfBirth', 'gender',
      'nationality', 'issuingCountry', 'dateOfIssue', 'dateOfExpiry', 'placeOfBirth',
      'maritalStatus', 'numberOfChildren', 'religion', 'bloodType', 'height', 'weight',
      'phone', 'additionalPhones', 'email', 'address', 'city', 'state', 'country',
      'idNumber', 'job', 'educationLevel', 'languages', 'workExperience', 'skills',
      'medicalStatus', 'biometricStatus', 'medicalDate', 'biometricDate', 'knownConditions',
      'cvDeadline', 'emergencyContactName', 'emergencyContactRelation', 'emergencyContactPhone',
      'emergencyContactAddress', 'passportImageUrl', 'facePhotoUrl', 'fullBodyPhotoUrl',
      'cocDocumentUrl', 'medicalDocumentUrl', 'candidateIdImageUrl', 'relativeIdImageUrl',
      'labourIdUrl', 'isRequested', 'visaOrContractNumber', 'isFlagged', 'Youtube_URL',
      'registeredAt', 'status', 'brokerId', 'visaSelected', 'registeredById', 'salary',
      'visaDate', 'agency', 'quickVideoUrl', 'deployedDate', 'isLocked', 'allowVideo', 'price',
      'laborID', 'agencyStatus'
    ];

    const selectCols = defaultCols.filter(col => dbCols.size === 0 || dbCols.has(col));
    const selectStr = selectCols.map(col => `\`${col}\``).join(', ');

    const rows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT ${selectStr} FROM \`Candidate\` WHERE \`id\` = ? LIMIT 1`, id
    );
    if (rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const c = rows[0];

    // 2. Fetch Relations Safely
    let broker = null;
    if (c.brokerId) {
      const brokerRows = await prisma.$queryRawUnsafe<any[]>(
        'SELECT `id`, `name`, `isLocked` FROM `Broker` WHERE `id` = ? LIMIT 1', c.brokerId
      ).catch(() => []);
      if (brokerRows.length > 0) {
        broker = {
          id: brokerRows[0].id,
          name: brokerRows[0].name,
          isLocked: brokerRows[0].isLocked === 1 || brokerRows[0].isLocked === true
        };
      }
    }

    let generatedCVs: any[] = [];
    try {
      generatedCVs = await prisma.$queryRawUnsafe<any[]>(
        'SELECT `id`, `templateId` FROM `GeneratedCV` WHERE `candidateId` = ? ORDER BY `createdAt` DESC LIMIT 1', id
      );
    } catch (_) {}

    let registeredByName = 'Admin';
    if (c.registeredById) {
      try {
        const userRows = await prisma.$queryRawUnsafe<any[]>(
          'SELECT `name` FROM `User` WHERE `id` = ? LIMIT 1', c.registeredById
        );
        if (userRows.length > 0) {
          registeredByName = userRows[0].name || 'Admin';
        }
      } catch (_) {}
    }

    // Read Youtube_URL, deployedDate, isLocked, price and laborID via raw SQL
    const youtubeUrl = c.Youtube_URL || null;
    const candidateDeployedDate = c.deployedDate ? new Date(c.deployedDate).toISOString() : null;
    const candidateIsLocked = c.isLocked === 1 || c.isLocked === true;
    const candidateCvDownloaded = c.cvDownloaded === 1 || c.cvDownloaded === true;
    const candidatePrice = c.price || null;
    const candidateLaborID = c.laborID || null;

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
        const profileRows: any[] = await prisma.$queryRawUnsafe(
          `SELECT facePhotoUrl, fullBodyPhotoUrl, videoUrl FROM \`UploadedVideoProfile\` WHERE UPPER(\`passportNumber\`) = ? LIMIT 1`,
          pNum
        );
        if (profileRows.length > 0) {
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
    let actualLabourIdUrl = null;
    if (c.labourIdUrl) {
      if (c.labourIdUrl.includes('/') || c.labourIdUrl.includes('.')) {
        actualLabourIdUrl = c.labourIdUrl;
      } else if (!laborIdText) {
        laborIdText = c.labourIdUrl;
      }
    }

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
    
    // Extract and strip price field to bypass stale Prisma client static schema errors
    const priceVal = body.price;
    delete body.price;
    if (body.personalInfo) {
      delete body.personalInfo.price;
    }

    // Extract and strip laborID field to bypass stale Prisma client static schema errors
    const laborIdVal = body.laborID;
    delete body.laborID;
    if (body.personalInfo) {
      delete body.personalInfo.laborID;
    }

    // Ensure allowVideo columns exist in database (self-healing fallback)
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`Candidate\` ADD COLUMN \`allowVideo\` TINYINT(1) NOT NULL DEFAULT 0`);
    } catch (_) {}
    try {
      await prisma.$executeRawUnsafe(`ALTER TABLE \`QuickRegistration\` ADD COLUMN \`allowVideo\` TINYINT(1) NOT NULL DEFAULT 0`);
    } catch (_) {}

    // Resolve logged in user from session to populate registeredById
    let registeredById = body.registeredById || null;
    console.log('[DEBUG] PUT /candidates/:id - body.registeredById:', body.registeredById);

    try {
      const session = await getSession(req);

      if (session?.user?.id) {
        registeredById = session.user.id;
        console.log('[DEBUG] Resolved registeredById from server session in PUT:', registeredById);
      } else {
        console.log('[DEBUG] Server session returned null or no user ID in PUT.');
      }
    } catch (sessionError) {
      console.error('[DEBUG] Failed to get session in PUT candidate route:', sessionError);
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

    const existingCandidate = await prisma.candidate.findUnique({ where: { id } });
    let visaDateVal = existingCandidate?.visaDate;
    if (body.visaSelected) {
      visaDateVal = existingCandidate?.visaDate || new Date();
    } else if (body.visaSelected === false) {
      visaDateVal = null;
    }

    const candidate = await prisma.candidate.update({
      where: { id },
      data: {
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
        ...(body.personalInfo.brokerId ? {
          broker: { connect: { id: body.personalInfo.brokerId } }
        } : {
          broker: { disconnect: true }
        }),

        ...(passportImageUrl && { passportImageUrl }),
        ...(facePhotoUrl && { facePhotoUrl }),
        ...(fullBodyPhotoUrl && { fullBodyPhotoUrl }),
        ...(cocDocumentUrl && { cocDocumentUrl }),
        ...(medicalDocumentUrl && { medicalDocumentUrl }),
        ...(candidateIdImageUrl && { candidateIdImageUrl }),
        ...(relativeIdImageUrl && { relativeIdImageUrl }),
        ...(labourIdUrl && { labourIdUrl }),
        ...(videoUrl && videoUrl.startsWith('http') ? {} : (videoUrl ? { videoUrl } : {})),
        status: body.status,
        isRequested: body.isRequested,
        visaSelected: body.visaSelected,
        agency: body.agency,
        // isFlagged is handled via raw SQL below
      },
    });

    // Save allowVideo separately with graceful fallback (to prevent schema validation errors on stale cPanel instances)
    try {
      const allowVideoVal = body.allowVideo ?? false;
      await prisma.$executeRawUnsafe(
        `UPDATE \`Candidate\` SET \`allowVideo\` = ? WHERE \`id\` = ?`,
        allowVideoVal ? 1 : 0,
        candidate.id
      );
      console.log(`[DEBUG] Saved allowVideo (${allowVideoVal}) via raw SQL in PUT`);
    } catch (e) {
      console.error('Failed to save allowVideo via raw SQL in PUT:', e);
    }

    // Save isFlagged and flaggedAt separately via raw SQL to bypass stale Prisma client static schema errors
    try {
      if (body.isFlagged !== undefined) {
        const isFlaggedVal = Boolean(body.isFlagged);
        const flaggedAtVal = isFlaggedVal ? new Date() : null;
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`isFlagged\` = ?, \`flaggedAt\` = ? WHERE \`id\` = ?`,
          isFlaggedVal ? 1 : 0,
          flaggedAtVal,
          candidate.id
        );
      }
    } catch (e) {
      console.warn('Failed to save isFlagged/flaggedAt:', e);
    }

    // Save YouTube URL separately via raw SQL
    if (videoUrl && videoUrl.startsWith('http')) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`Youtube_URL\` = ? WHERE \`id\` = ?`,
          videoUrl,
          candidate.id
        );
      } catch (err) {
        console.warn('[DEBUG] Failed to save Youtube_URL via raw SQL:', err);
      }
    }

    // Save registeredById separately with graceful fallback (to prevent schema validation errors on stale cPanel instances)
    if (!existingCandidate?.registeredById && registeredById) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`registeredById\` = ? WHERE \`id\` = ?`,
          registeredById,
          candidate.id
        );
      } catch (e) {
        console.warn('[DEBUG] Failed to save registeredById via raw SQL (schema may be out of sync):', e);
      }
    }

    // Save agency separately with graceful fallback
    if (body.agency) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`agency\` = ? WHERE \`id\` = ?`,
          body.agency,
          candidate.id
        );
      } catch (err) {
        console.warn('[DEBUG] Failed to save agency via raw SQL in PUT:', err);
      }
    }

    // Save visaDate separately with graceful fallback (to prevent schema validation errors on stale cPanel instances)
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE \`Candidate\` SET \`visaDate\` = ? WHERE \`id\` = ?`,
        visaDateVal,
        candidate.id
      );
    } catch (e) {
      console.error('Failed to save visaDate via raw SQL:', e);
    }

    // Save salary separately with graceful fallback (in case column doesn't exist in DB yet)
    try {
      const salaryValue = body.personalInfo?.salary || '1000SR';
      await prisma.$executeRawUnsafe(
        `UPDATE \`Candidate\` SET \`salary\` = ? WHERE \`id\` = ?`,
        salaryValue,
        candidate.id
      );
    } catch (_) { /* salary column may not exist yet, ignore */ }

    // Save price separately with graceful fallback (to prevent schema validation errors on stale cPanel instances)
    if (priceVal !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`price\` = ? WHERE \`id\` = ?`,
          priceVal,
          candidate.id
        );
      } catch (e) {
        console.error('Failed to save price via raw SQL in PUT:', e);
      }
    }

    // Save laborID separately with graceful fallback (to prevent schema validation errors on stale cPanel instances)
    if (laborIdVal !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`laborID\` = ? WHERE \`id\` = ?`,
          laborIdVal || null,
          candidate.id
        );
      } catch (e) {
        console.error('Failed to save laborID via raw SQL in PUT:', e);
      }
    }

    res.json(candidate);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'A candidate with this Passport Number already exists.' });
    }
    res.status(500).json({ error: formatPrismaError(error) });
  }
});

// PATCH /api/candidates/bulk-cv-downloaded
router.patch('/bulk-cv-downloaded', async (req: Request, res: Response) => {
  try {
    const { candidateIds, cvDownloaded } = req.body;
    if (!Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'candidateIds must be a non-empty array' });
    }
    
    // Perform bulk update using raw SQL to be safe
    const placeholders = candidateIds.map(() => '?').join(', ');
    await prisma.$executeRawUnsafe(
      `UPDATE \`Candidate\` SET \`cvDownloaded\` = ? WHERE \`id\` IN (${placeholders})`,
      cvDownloaded ? 1 : 0,
      ...candidateIds
    );

    // If marked as downloaded, make sure GeneratedCV entries exist so they appear in CV downloaded list
    if (cvDownloaded) {
      for (const id of candidateIds) {
        try {
          const existing = await prisma.generatedCV.findFirst({
            where: { candidateId: id }
          });
          if (!existing) {
            const candidate = await prisma.candidate.findUnique({
              where: { id }
            });
            if (candidate) {
              await prisma.generatedCV.create({
                data: {
                  candidateId: id,
                  templateId: 'alm',
                  facePhotoUrl: candidate.facePhotoUrl || '',
                  fullBodyPhotoUrl: candidate.fullBodyPhotoUrl || ''
                }
              });
            }
          }
        } catch (cvErr) {
          console.warn(`[BULK-CV] Failed to auto-create GeneratedCV for candidate ${id}:`, cvErr);
        }
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

    console.log(`[PATCH] /api/candidates/${id}`, body);

    if (body.medicalStatus === 'Unfit') {
      body.isRequested = true;
      // Only delete CVs if they are UNFIT
      await prisma.generatedCV.deleteMany({
        where: { candidateId: id }
      });
    }

    // Ensure isFlagged is handled correctly via raw SQL
    let isFlaggedVal: boolean | undefined = undefined;
    if (body.isFlagged !== undefined) {
      isFlaggedVal = Boolean(body.isFlagged);
      delete body.isFlagged;
    }

    // Handle isLocked via raw SQL to bypass stale Prisma Client
    const isLockedVal = body.isLocked;
    delete body.isLocked;

    // Handle cvDownloaded via raw SQL to bypass stale Prisma Client
    const cvDownloadedVal = body.cvDownloaded;
    delete body.cvDownloaded;

    // Extract and strip price field to bypass stale Prisma client static schema errors
    const priceVal = body.price;
    delete body.price;
    if (body.personalInfo) {
      delete body.personalInfo.price;
    }

    // Handle laborID via raw SQL to bypass stale Prisma Client
    const laborIdVal = body.laborID;
    delete body.laborID;
    if (body.personalInfo) {
      delete body.personalInfo.laborID;
    }

    const videoUrlVal = body.videoUrl;
    const allowVideoVal = body.allowVideo;

    let visaDateVal: any = undefined;
    if (body.visaSelected) {
      const existing = await prisma.candidate.findUnique({ where: { id } });
      visaDateVal = existing?.visaDate || new Date();
    } else if (body.visaSelected === false) {
      visaDateVal = null;
    }

    // Strip videoUrl and deployedDate from the payload to prevent Prisma Client validation error on stale client builds
    delete body.visaDate;
    delete body.videoUrl;
    delete body.allowVideo;
    const deployedDateVal = body.deployedDate;
    delete body.deployedDate;
    delete body.Youtube_URL;

    // Process base64 file uploads if any are passed
    const docFields = [
      { key: 'passportImageUrl', dir: 'passports' },
      { key: 'facePhotoUrl', dir: 'faces' },
      { key: 'fullBodyPhotoUrl', dir: 'fullbody' },
      { key: 'cocDocumentUrl', dir: 'coc' },
      { key: 'medicalDocumentUrl', dir: 'medical' },
      { key: 'candidateIdImageUrl', dir: 'candidate-id' },
      { key: 'relativeIdImageUrl', dir: 'relative-id' },
      { key: 'labourIdUrl', dir: 'labour-id' }
    ];

    for (const field of docFields) {
      if (body[field.key]) {
        body[field.key] = sanitizeIncomingPath(body[field.key]);
        if (body[field.key].startsWith('data:')) {
          try {
            body[field.key] = await uploadToLocal(body[field.key], field.dir);
          } catch (uploadErr) {
            console.error(`Failed to upload ${field.key} in PATCH:`, uploadErr);
          }
        }
      }
    }

    let quickVideoUrlVal = body.quickVideoUrl;
    delete body.quickVideoUrl;

    if (quickVideoUrlVal) {
      quickVideoUrlVal = sanitizeIncomingPath(quickVideoUrlVal);
      if (quickVideoUrlVal.startsWith('data:')) {
        try {
          quickVideoUrlVal = await uploadToLocal(quickVideoUrlVal, 'videos');
        } catch (uploadErr) {
          console.error(`Failed to upload quickVideoUrl in PATCH:`, uploadErr);
        }
      }
    }

    let updated: any = null;
    if (Object.keys(body).length > 0) {
      updated = await prisma.candidate.update({
        where: { id },
        data: body,
      });
    } else {
      updated = await prisma.candidate.findUnique({ where: { id } });
    }

    // Save quickVideoUrl separately via raw SQL to bypass stale Prisma client static schema check
    if (quickVideoUrlVal !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`quickVideoUrl\` = ? WHERE \`id\` = ?`,
          quickVideoUrlVal || null,
          id
        );
        (updated as any).quickVideoUrl = quickVideoUrlVal;
      } catch (err) {
        console.error('Failed to save quickVideoUrl via raw SQL in PATCH:', err);
      }
    }

    // Save isFlagged and flaggedAt separately via raw SQL
    if (isFlaggedVal !== undefined) {
      try {
        const flaggedAtVal = isFlaggedVal ? new Date() : null;
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`isFlagged\` = ?, \`flaggedAt\` = ? WHERE \`id\` = ?`,
          isFlaggedVal ? 1 : 0,
          flaggedAtVal,
          id
        );
        (updated as any).isFlagged = isFlaggedVal;
        (updated as any).flaggedAt = flaggedAtVal;
      } catch (err) {
        console.error('Failed to save isFlagged/flaggedAt via raw SQL in PATCH:', err);
      }
    }

    // Save videoUrl separately if passed (updates Youtube_URL database column)
    if (videoUrlVal !== undefined) {
      try {
        const sanitizedVideoUrl = sanitizeIncomingPath(videoUrlVal);
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`Youtube_URL\` = ? WHERE \`id\` = ?`,
          sanitizedVideoUrl || null,
          id
        );
        (updated as any).videoUrl = sanitizedVideoUrl;

        // Sync with UploadedVideoProfile
        const cand = await prisma.candidate.findUnique({
          where: { id },
          select: { passportNumber: true, givenNames: true, surname: true, facePhotoUrl: true, fullBodyPhotoUrl: true }
        });
        if (cand) {
          const pNum = cand.passportNumber.trim().toUpperCase();
          if (videoUrlVal === null || videoUrlVal === '') {
            await prisma.$executeRawUnsafe(
              'DELETE FROM `UploadedVideoProfile` WHERE UPPER(`passportNumber`) = ?',
              pNum
            );
          } else {
            const generatedId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
            const fullName = `${cand.givenNames} ${cand.surname}`.trim().toUpperCase();
            await prisma.$executeRawUnsafe(
              `INSERT INTO \`UploadedVideoProfile\` (\`id\`, \`passportNumber\`, \`fullName\`, \`videoUrl\`, \`facePhotoUrl\`, \`fullBodyPhotoUrl\`) 
               VALUES (?, ?, ?, ?, ?, ?) 
               ON DUPLICATE KEY UPDATE 
                 \`fullName\` = VALUES(\`fullName\`),
                 \`videoUrl\` = VALUES(\`videoUrl\`)`,
              generatedId,
              pNum,
              fullName,
              sanitizedVideoUrl,
              cand.facePhotoUrl || null,
              cand.fullBodyPhotoUrl || null
            );
          }
        }
      } catch (e) {
        console.error('Failed to save Youtube_URL via raw SQL in PATCH:', e);
      }
    }

    // Save allowVideo if passed
    if (allowVideoVal !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`allowVideo\` = ? WHERE \`id\` = ?`,
          allowVideoVal ? 1 : 0,
          id
        );
        (updated as any).allowVideo = Boolean(allowVideoVal);
      } catch (e) {
        console.error('Failed to save allowVideo via raw SQL in PATCH:', e);
      }
    }

    if (visaDateVal !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`visaDate\` = ? WHERE \`id\` = ?`,
          visaDateVal,
          id
        );
        updated.visaDate = visaDateVal;
      } catch (e) {
        console.error('Failed to save visaDate via raw SQL:', e);
      }
    }

    // Save deployedDate if passed
    if (deployedDateVal !== undefined) {
      try {
        const depDateParsed = deployedDateVal ? new Date(deployedDateVal) : null;
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`deployedDate\` = ? WHERE \`id\` = ?`,
          depDateParsed,
          id
        );
        (updated as any).deployedDate = depDateParsed;
      } catch (e) {
        console.error('Failed to save deployedDate via raw SQL:', e);
      }
    }

    // Save isLocked if passed
    if (isLockedVal !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`isLocked\` = ? WHERE \`id\` = ?`,
          isLockedVal ? 1 : 0,
          id
        );
        (updated as any).isLocked = Boolean(isLockedVal);
      } catch (e) {
        console.error('Failed to save isLocked via raw SQL:', e);
      }
    }

    // Save cvDownloaded if passed
    if (cvDownloadedVal !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`cvDownloaded\` = ? WHERE \`id\` = ?`,
          cvDownloadedVal ? 1 : 0,
          id
        );
        (updated as any).cvDownloaded = Boolean(cvDownloadedVal);

        // If marked as downloaded, make sure GeneratedCV entry exists so they appear in CV downloaded list
        if (cvDownloadedVal === true || cvDownloadedVal === 1) {
          const existing = await prisma.generatedCV.findFirst({
            where: { candidateId: id }
          });
          if (!existing) {
            const candidateObj = await prisma.candidate.findUnique({
              where: { id }
            });
            if (candidateObj) {
              await prisma.generatedCV.create({
                data: {
                  candidateId: id,
                  templateId: 'alm',
                  facePhotoUrl: candidateObj.facePhotoUrl || '',
                  fullBodyPhotoUrl: candidateObj.fullBodyPhotoUrl || ''
                }
              });
            }
          }
        }
      } catch (e) {
        console.error('Failed to save cvDownloaded / auto-create GeneratedCV via raw SQL:', e);
      }
    }

    // Save price if passed
    if (priceVal !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`price\` = ? WHERE \`id\` = ?`,
          priceVal,
          id
        );
        (updated as any).price = priceVal;
      } catch (e) {
        console.error('Failed to save price via raw SQL in PATCH:', e);
      }
    }

    // Save laborID if passed
    if (laborIdVal !== undefined) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`laborID\` = ? WHERE \`id\` = ?`,
          laborIdVal || null,
          id
        );
        (updated as any).laborID = laborIdVal || null;
      } catch (e) {
        console.error('Failed to save laborID via raw SQL in PATCH:', e);
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    res.status(500).json({ error: formatPrismaError(error) });
  }
});

// DELETE /api/candidates/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;


    // 1. Delete all generated CVs
    try {
      await prisma.generatedCV.deleteMany({
        where: { candidateId: id }
      });
    } catch (e) {
      console.warn(`Failed to delete related GeneratedCVs for candidate ${id}:`, e);
    }

    // 2. Delete all related invoices
    try {
      await prisma.invoice.deleteMany({
        where: { candidateId: id }
      });
    } catch (e) {
      console.warn(`Failed to delete related Invoices for candidate ${id}:`, e);
    }

    // 3. Delete related notifications
    try {
      await prisma.notification.deleteMany({
        where: { candidateId: id }
      });
    } catch (e) {
      console.warn(`Failed to delete related Notifications for candidate ${id}:`, e);
    }

    // 4. Update QuickRegistration entries to null out promotedCandidateId
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE \`QuickRegistration\` SET \`promotedCandidateId\` = NULL, \`verificationStatus\` = 'pending' WHERE \`promotedCandidateId\` = ?`,
        id
      );
    } catch (e) {
      console.warn(`Failed to null out related QuickRegistration entries for candidate ${id}:`, e);
    }

    // 5. Delete the candidate itself
    await prisma.candidate.delete({ where: { id } });
    
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete candidate:', error);
    res.status(500).json({ error: error?.message || 'Failed to delete candidate' });
  }
});

export default router;
