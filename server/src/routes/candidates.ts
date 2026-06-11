import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';
import { getSession } from '../lib/auth-helper';

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
    // Fetch all brokers and their lock status safely
    const lockMap = await getBrokerLockMap();
    const brokerMap = new Map<string, any>();
    try {
      const dbBrokers = await prisma.broker.findMany({
        select: { id: true, name: true }
      });
      for (const b of dbBrokers) {
        brokerMap.set(b.id, {
          id: b.id,
          name: b.name,
          isLocked: lockMap[b.id] ?? false
        });
      }
    } catch (err) {
      console.warn('Could not fetch brokers for candidates mapping:', err);
    }

    let dbCandidates;
    try {
      dbCandidates = await prisma.candidate.findMany({
        orderBy: { registeredAt: 'desc' },
        include: {
          generatedCVs: { select: { id: true, templateId: true } },
          registeredBy: { select: { name: true } },
          invoices: { select: { isDelivered: true } }
        }
      });
    } catch (schemaError: any) {
      console.warn('Prisma schema out of sync. Falling back to basic fetch.');
      dbCandidates = await prisma.candidate.findMany({
        orderBy: { registeredAt: 'desc' },
        include: {
          generatedCVs: { select: { id: true, templateId: true } }
        }
      });
      
      // Fetch invoices safely
      try {
        const invoices = await prisma.$queryRawUnsafe<any[]>(`SELECT candidateId, isDelivered FROM \`Invoice\``);
        const invoiceMap = new Map<string, any[]>();
        for (const inv of invoices) {
          const existing = invoiceMap.get(inv.candidateId) || [];
          existing.push({ isDelivered: Boolean(inv.isDelivered) });
          invoiceMap.set(inv.candidateId, existing);
        }
        for (const cand of dbCandidates) {
          (cand as any).invoices = invoiceMap.get(cand.id) || [];
        }
      } catch (invErr) {
        console.warn('Could not fetch invoices for candidates:', invErr);
      }
    }

    // Read Youtube_URL, deployedDate and isLocked via raw SQL (before synchronous map)
    let youtubeUrlMap: Record<string, string | null> = {};
    let deployedDateMap: Record<string, string | null> = {};
    let candidateLockMap: Record<string, boolean> = {};
    let candidateCvDownloadedMap: Record<string, boolean> = {};
    try {
      const rawRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT id, Youtube_URL, deployedDate, isLocked, cvDownloaded FROM \`Candidate\``
      );
      for (const row of rawRows) {
        youtubeUrlMap[row.id] = row.Youtube_URL || null;
        deployedDateMap[row.id] = row.deployedDate ? new Date(row.deployedDate).toISOString() : null;
        candidateLockMap[row.id] = row.isLocked === 1 || row.isLocked === true;
        candidateCvDownloadedMap[row.id] = row.cvDownloaded === 1 || row.cvDownloaded === true;
      }
    } catch (_) { /* columns may not exist yet */ }

    const candidates = dbCandidates.map((c: any) => {
      const formatDate = (date: Date | null | undefined) => date?.toISOString().split('T')[0] || '';

      return {
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
        broker: c.brokerId ? (brokerMap.get(c.brokerId) || null) : null,
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
        isLocked: candidateLockMap[c.id] ?? false,
        cvDownloaded: candidateCvDownloadedMap[c.id] ?? false,
        videoUrl: youtubeUrlMap[c.id] ?? (c as any).videoUrl ?? null,
        Youtube_URL: youtubeUrlMap[c.id] ?? null,
        deployedDate: deployedDateMap[c.id] ?? null,
        registeredAt: c.registeredAt.toISOString(),
        status: c.status,
        visaSelected: c.visaSelected,
        visaDate: c.visaDate ? c.visaDate.toISOString() : null,
        salary: c.salary || '1000SR',
        generatedCVs: c.generatedCVs?.map((cv: any) => ({ id: cv.id, templateId: cv.templateId })) || [],
        registeredBy: c.registeredBy?.name || 'Admin',
        hasInvoice: c.invoices && c.invoices.length > 0,
        isInvoiceDelivered: c.invoices?.some((i: any) => i.isDelivered) || false,
      };
    });

    res.json(candidates);
  } catch (error: any) {
    console.error('Failed to fetch candidates:', error);
    res.status(500).json({ 
      error: 'Failed to fetch candidates', 
      message: error?.message || String(error),
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack
    });
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


    // Also fetch raw videoUrl which may not be in Prisma Client cache
    let videoUrl = qr.videoUrl || null;
    try {
      const rawRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT \`videoUrl\` FROM \`QuickRegistration\` WHERE \`id\` = ?`,
        quickRegistrationId
      );
      if (rawRows.length > 0 && rawRows[0].videoUrl) {
        videoUrl = rawRows[0].videoUrl;
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
        setClauses.push('`videoUrl` = ?');
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


    // Resolve logged in user from session to populate registeredById
    let registeredById = body.registeredById || null;
    console.log('[DEBUG] POST /candidates - body.registeredById:', body.registeredById);

    try {
      // Build proper Web Request for Better Auth
      const session = await getSession(req);

      if (session?.user?.id) {
        registeredById = session.user.id;
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

    // Separate local video upload and remote YouTube URL
    const isLocalVideo = videoUrl && videoUrl.startsWith('/uploads');
    const isRemoteVideo = videoUrl && videoUrl.startsWith('http');

    let finalVideoUrl = isRemoteVideo ? videoUrl : null;

    // Check if there is a pre-registered YouTube video matching this candidate's passport number
    if (!finalVideoUrl) {
      try {
        const pNum = (body.passportData.passportNumber || '').trim().toUpperCase();
        if (pNum) {
          const matchingVideo = await prisma.preRegisteredVideo.findUnique({
            where: { passportNumber: pNum }
          });

          if (matchingVideo) {
            finalVideoUrl = matchingVideo.videoUrl;
            console.log(`[AUTO-MATCH] Linked pre-registered YouTube video to Candidate: ${finalVideoUrl}`);
          }
        }
      } catch (err) {
        console.error('Failed to auto-match pre-registered video:', err);
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
        brokerId: body.personalInfo.brokerId || null,

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

    // Save YouTube URL separately via raw SQL to bypass stale Prisma Client
    if (finalVideoUrl) {
      try {
        await prisma.$executeRawUnsafe(
          `UPDATE \`Candidate\` SET \`Youtube_URL\` = ? WHERE \`id\` = ?`,
          finalVideoUrl,
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

    // Save quickVideoUrl separately with graceful fallback (local uploaded video)
    if (isLocalVideo) {
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
    res.status(500).json({ error: error?.message || 'Failed to create candidate' });
  }
});

// GET /api/candidates/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    let c;
    try {
      c = await prisma.candidate.findUnique({ 
        where: { id },
        include: { 
          broker: true,
          generatedCVs: { orderBy: { createdAt: 'desc' }, take: 1 },
          registeredBy: { select: { name: true } }
        }
      });
    } catch (schemaError) {
      console.warn('Prisma schema out of sync (registeredBy missing) in GET /:id. Falling back.');
      c = await prisma.candidate.findUnique({ 
        where: { id },
        include: { 
          broker: true,
          generatedCVs: { orderBy: { createdAt: 'desc' }, take: 1 }
        }
      });
    }
    if (!c) return res.status(404).json({ error: 'Not found' });

    // Read Youtube_URL, deployedDate and isLocked via raw SQL
    let youtubeUrl: string | null = null;
    let candidateDeployedDate: string | null = null;
    let candidateIsLocked = false;
    let candidateCvDownloaded = false;
    try {
      const rawRows: any[] = await prisma.$queryRawUnsafe(
        `SELECT Youtube_URL, deployedDate, isLocked, cvDownloaded FROM \`Candidate\` WHERE id = ?`, id
      );
      if (rawRows.length > 0) {
        youtubeUrl = rawRows[0].Youtube_URL || null;
        candidateDeployedDate = rawRows[0].deployedDate ? new Date(rawRows[0].deployedDate).toISOString() : null;
        candidateIsLocked = rawRows[0].isLocked === 1 || rawRows[0].isLocked === true;
        candidateCvDownloaded = rawRows[0].cvDownloaded === 1 || rawRows[0].cvDownloaded === true;
      }
    } catch (_) { /* columns may not exist yet */ }

    const candidate = {
      id: c.id,
      shelfId: c.shelfId,
      cvDeadline: c.cvDeadline?.toISOString().split('T')[0],
      passportData: {
        passportNumber: c.passportNumber,
        surname: c.surname,
        givenNames: c.givenNames,
        dateOfBirth: c.dateOfBirth.toISOString().split('T')[0],
        gender: c.gender,
        nationality: c.nationality,
        issuingCountry: c.issuingCountry,
        dateOfIssue: c.dateOfIssue.toISOString().split('T')[0],
        dateOfExpiry: c.dateOfExpiry.toISOString().split('T')[0],
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
        workExperience: c.workExperience ? (c.workExperience as any) : [],
        skills: c.skills,
        medicalStatus: c.medicalStatus,
        biometricStatus: c.biometricStatus,
        medicalDate: c.medicalDate?.toISOString().split('T')[0],
        biometricDate: c.biometricDate?.toISOString().split('T')[0],
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
      passportImageUrl: c.passportImageUrl || '',
      facePhotoUrl: c.facePhotoUrl || '',
      fullBodyPhotoUrl: c.fullBodyPhotoUrl || '',
      cocDocumentUrl: c.cocDocumentUrl || '',
      medicalDocumentUrl: c.medicalDocumentUrl || '',
      candidateIdImageUrl: c.candidateIdImageUrl || '',
      relativeIdImageUrl: c.relativeIdImageUrl || '',
      labourIdUrl: c.labourIdUrl || '',
      status: c.status,
      isRequested: c.isRequested,
      visaOrContractNumber: c.visaOrContractNumber || null,
      videoUrl: youtubeUrl ?? (c as any).videoUrl ?? null,
      Youtube_URL: youtubeUrl,
      quickVideoUrl: (c as any).quickVideoUrl || null,
      deployedDate: candidateDeployedDate,
      registeredAt: c.registeredAt.toISOString(),
      broker: c.broker,
      visaSelected: c.visaSelected,
      visaDate: c.visaDate ? c.visaDate.toISOString() : null,
      salary: c.salary || '1000SR',
      isLocked: candidateIsLocked,
      cvDownloaded: candidateCvDownloaded,
      latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
      registeredBy: (c as any).registeredBy?.name || 'Admin',
    };
    res.json(candidate);
  } catch (error) {
    res.status(500).json({ error: 'Failed' });
  }
});

// PUT /api/candidates/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const body = req.body;

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
        brokerId: body.personalInfo.brokerId || null,

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
      },
    });

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

    res.json(candidate);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    if (error?.code === 'P2002') {
      return res.status(400).json({ error: 'A candidate with this Passport Number already exists.' });
    }
    res.status(500).json({ error: error?.message || 'Failed to update candidate' });
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

    // Ensure isFlagged is handled correctly if passed
    if (body.isFlagged !== undefined) {
      body.isFlagged = Boolean(body.isFlagged);
    }

    // Handle isLocked via raw SQL to bypass stale Prisma Client
    const isLockedVal = body.isLocked;
    delete body.isLocked;

    // Handle cvDownloaded via raw SQL to bypass stale Prisma Client
    const cvDownloadedVal = body.cvDownloaded;
    delete body.cvDownloaded;

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
      { key: 'labourIdUrl', dir: 'labour-id' },
      { key: 'quickVideoUrl', dir: 'videos' }
    ];

    for (const field of docFields) {
      if (body[field.key] && body[field.key].startsWith('data:')) {
        try {
          body[field.key] = await uploadToLocal(body[field.key], field.dir);
        } catch (uploadErr) {
          console.error(`Failed to upload ${field.key} in PATCH:`, uploadErr);
        }
      }
    }

    const updated = await prisma.candidate.update({
      where: { id },
      data: body,
    });

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
      } catch (e) {
        console.error('Failed to save cvDownloaded via raw SQL:', e);
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to update candidate:', error);
    res.status(500).json({ error: error?.message || 'Failed to update candidate' });
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
        `UPDATE \`QuickRegistration\` SET \`promotedCandidateId\` = NULL, \`verificationStatus\` = 'verified' WHERE \`promotedCandidateId\` = ?`,
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
