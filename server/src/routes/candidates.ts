import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';
import { auth } from '../lib/auth';

const router = Router();

// GET /api/candidates
router.get('/', async (req: Request, res: Response) => {
  try {
    let dbCandidates;
    try {
      dbCandidates = await prisma.candidate.findMany({
        orderBy: { registeredAt: 'desc' },
        include: {
          generatedCVs: { select: { templateId: true } },
          registeredBy: { select: { name: true } },
          invoices: { select: { isDelivered: true } }
        }
      });
    } catch (schemaError: any) {
      console.warn('Prisma schema out of sync. Falling back to basic fetch.');
      dbCandidates = await prisma.candidate.findMany({
        orderBy: { registeredAt: 'desc' },
        include: {
          generatedCVs: { select: { templateId: true } }
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
        videoUrl: c.videoUrl || null,
        registeredAt: c.registeredAt.toISOString(),
        status: c.status,
        visaSelected: c.visaSelected,
        visaDate: c.visaDate ? c.visaDate.toISOString() : null,
        salary: c.salary || '1000SR',
        generatedCVs: c.generatedCVs?.map((cv: any) => cv.templateId) || [],
        registeredBy: c.registeredBy?.name || 'Admin',
        hasInvoice: c.invoices && c.invoices.length > 0,
        isInvoiceDelivered: c.invoices?.some((i: any) => i.isDelivered) || false,
      };
    });

    res.json(candidates);
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
    res.status(500).json({ error: 'Failed to fetch candidates' });
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
      const webHeaders = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) value.forEach(v => webHeaders.append(key, v));
        else if (value) webHeaders.set(key, value);
      }
      
      const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
        method: req.method,
        headers: webHeaders,
      });

      const session = await auth.api.getSession({
        headers: webHeaders,
        request: request
      } as any);

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
      count
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.facePhotoUrl, 'faces'),
      uploadToLocal(body.fullBodyPhotoUrl, 'fullbody'),
      uploadToLocal(body.personalInfo.cocDocumentUrl, 'coc'),
      uploadToLocal(body.personalInfo.medicalDocumentUrl, 'medical'),
      uploadToLocal(body.personalInfo.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.personalInfo.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.personalInfo.labourIdUrl, 'labour-id'),
      prisma.candidate.count()
    ]);

    const nextShelfId = body.shelfId || String(count + 1).padStart(3, '0');

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
        videoUrl: body.videoUrl || null,
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

    // Save salary separately with graceful fallback (in case column doesn't exist in DB yet)
    try {
      const salaryValue = body.personalInfo?.salary || '1000SR';
      await prisma.$executeRawUnsafe(
        `UPDATE \`Candidate\` SET \`salary\` = ? WHERE \`id\` = ?`,
        salaryValue,
        candidate.id
      );
    } catch (_) { /* salary column may not exist yet, ignore */ }

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
      videoUrl: c.videoUrl || null,
      registeredAt: c.registeredAt.toISOString(),
      broker: c.broker,
      visaSelected: c.visaSelected,
      visaDate: c.visaDate ? c.visaDate.toISOString() : null,
      salary: c.salary || '1000SR',
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
      const webHeaders = new Headers();
      for (const [key, value] of Object.entries(req.headers)) {
        if (Array.isArray(value)) value.forEach(v => webHeaders.append(key, v));
        else if (value) webHeaders.set(key, value);
      }
      
      const request = new Request(`http://${req.headers.host || 'localhost'}${req.url}`, {
        method: req.method,
        headers: webHeaders,
      });

      const session = await auth.api.getSession({
        headers: webHeaders,
        request: request
      } as any);

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
      labourIdUrl
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.facePhotoUrl, 'faces'),
      uploadToLocal(body.fullBodyPhotoUrl, 'fullbody'),
      uploadToLocal(body.personalInfo.cocDocumentUrl, 'coc'),
      uploadToLocal(body.personalInfo.medicalDocumentUrl, 'medical'),
      uploadToLocal(body.personalInfo.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.personalInfo.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.personalInfo.labourIdUrl, 'labour-id')
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
        status: body.status,
        isRequested: body.isRequested,
        visaSelected: body.visaSelected,
      },
    });

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

    let visaDateVal: any = undefined;
    if (body.visaSelected) {
      const existing = await prisma.candidate.findUnique({ where: { id } });
      visaDateVal = existing?.visaDate || new Date();
    } else if (body.visaSelected === false) {
      visaDateVal = null;
    }

    // Strip visaDate from the payload to prevent Prisma Client validation error on stale client builds
    delete body.visaDate;

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
    await prisma.candidate.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete candidate:', error);
    res.status(500).json({ error: error?.message || 'Failed to delete candidate' });
  }
});

export default router;
