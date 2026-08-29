import { Router, Request, Response } from 'express';
import {
  db,
  pool,
  candidate as candidateTable,
  generatedCv as generatedCvTable,
  broker as brokerTable,
  generateId,
} from '../db';
import { eq, inArray, and, ne } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';

const router = Router();

const formatCandidate = (c: any) => {
  if (!c) return null;
  const formatDate = (date: Date | null | undefined) => date ? new Date(date).toISOString().split('T')[0] : '';
  const parseJson = (val: any) => {
    if (!val) return [];
    if (typeof val === 'object') return val;
    try { return JSON.parse(val); } catch (_) { return []; }
  };
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
    broker: c.broker,
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
    registeredAt: c.registeredAt ? new Date(c.registeredAt).toISOString() : new Date().toISOString(),
    status: c.status,
    visaSelected: c.visaSelected,
    visaDate: c.visaDate ? new Date(c.visaDate).toISOString() : null,
    salary: c.salary || '1000SR',
    cvDownloaded: false as boolean,
  };
};

async function getBrokerLockMap(): Promise<Record<string, boolean>> {
  try {
    const [rows]: any = await pool.query('SELECT id, isLocked FROM Broker');
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      map[row.id] = row.isLocked === 1 || row.isLocked === true;
    }
    return map;
  } catch (e) {
    return {};
  }
}

// GET /api/generated-cvs
router.get('/', async (req: Request, res: Response) => {
  try {
    const cvRowsList = await db.select().from(generatedCvTable);
    const candidateIds = cvRowsList.map(cv => cv.candidateId);

    const candidatesList = candidateIds.length > 0
      ? await db.select().from(candidateTable).where(inArray(candidateTable.id, candidateIds))
      : [];

    const brokerIds = candidatesList.map(c => c.brokerId).filter(Boolean) as string[];
    const brokersList = brokerIds.length > 0
      ? await db.select().from(brokerTable).where(inArray(brokerTable.id, brokerIds))
      : [];

    const brokerMap = new Map(brokersList.map(b => [b.id, b]));
    const candMap = new Map(candidatesList.map(c => [c.id, { ...c, broker: c.brokerId ? brokerMap.get(c.brokerId) || null : null }]));

    const generatedCVs = cvRowsList.map(cv => ({
      ...cv,
      candidate: candMap.get(cv.candidateId) || null,
    }));

    try {
      const candidatesWithAgency = await db
        .select()
        .from(candidateTable)
        .where(inArray(candidateTable.agency, ['ussus', 'al-shablan', 'alm', 'almala', 'ka7', 'ku2', 'ma', 'ra', 'vision']));

      const existingCandidateIds = new Set(generatedCVs.map(cv => cv.candidateId));
      for (const cand of candidatesWithAgency) {
        if (!existingCandidateIds.has(cand.id)) {
          const brokerObj = cand.brokerId ? brokerMap.get(cand.brokerId) || null : null;
          generatedCVs.push({
            id: `dummy-${cand.id}`,
            candidateId: cand.id,
            templateId: cand.agency!.toLowerCase(),
            facePhotoUrl: cand.facePhotoUrl || cand.passportImageUrl || null,
            fullBodyPhotoUrl: cand.fullBodyPhotoUrl || null,
            createdAt: cand.registeredAt || new Date(),
            updatedAt: cand.registeredAt || new Date(),
            candidate: { ...cand, broker: brokerObj }
          } as any);
        }
      }
    } catch (err) {
      console.warn('[GENERATED-CVS] Could not fetch missing candidates dynamically:', err);
    }
    
    const lockMap = await getBrokerLockMap();
    let cvDownloadedMap: Record<string, boolean> = {};
    try {
      const [rawRows]: any = await pool.query('SELECT id, cvDownloaded FROM `Candidate`');
      for (const row of rawRows) {
        cvDownloadedMap[row.id] = row.cvDownloaded === 1 || row.cvDownloaded === true;
      }
    } catch (e) {}

    const mappedCVs = generatedCVs
      .filter((cv: any) => cv.candidate?.broker?.name !== 'Calling' && cv.candidate?.job !== 'Calling')
      .map((cv: any) => {
        const formattedCandidateObj = formatCandidate(cv.candidate);
        if (formattedCandidateObj) {
          formattedCandidateObj.cvDownloaded = cvDownloadedMap[formattedCandidateObj.id] ?? false;
          if (formattedCandidateObj.broker) {
            formattedCandidateObj.broker.isLocked = lockMap[formattedCandidateObj.broker.id] ?? false;
          }
        }
        return {
          ...cv,
          candidate: formattedCandidateObj
        };
      });
    
    res.json(mappedCVs);
  } catch (error) {
    console.error('Error fetching generated CVs:', error);
    res.status(500).json({ error: 'Failed to fetch generated CVs' });
  }
});

// POST /api/generated-cvs
router.post('/', async (req: Request, res: Response) => {
  try {
    const { candidateId, templateId, facePhotoUrl, fullBodyPhotoUrl } = req.body;
    
    if (!candidateId || !templateId) {
      return res.status(400).json({ error: 'Missing candidateId or templateId' });
    }
    
    const cands = await db.select().from(candidateTable).where(eq(candidateTable.id, candidateId));
    if (cands.length === 0) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const existingCvs = await db.select().from(generatedCvTable).where(eq(generatedCvTable.candidateId, candidateId));
    const duplicateCV = existingCvs[0];

    const deadline = new Date();
    deadline.setDate(deadline.getDate() + 30);
    const cleanTemplateId = templateId.replace('tmpl-', '').toLowerCase();

    if (duplicateCV) {
      await db.update(generatedCvTable).set({ templateId }).where(eq(generatedCvTable.id, duplicateCV.id));
      await db.update(candidateTable).set({ cvDeadline: deadline, agency: cleanTemplateId }).where(eq(candidateTable.id, candidateId));
      
      const [updatedCV] = await db.select().from(generatedCvTable).where(eq(generatedCvTable.id, duplicateCV.id));
      return res.json(updatedCV);
    }
    
    const [faceUrl, fullBodyUrl] = await Promise.all([
      uploadToLocal(facePhotoUrl, 'faces'),
      uploadToLocal(fullBodyPhotoUrl, 'fullbody')
    ]);

    const newCvId = generateId();
    await db.insert(generatedCvTable).values({
      id: newCvId,
      candidateId,
      templateId,
      facePhotoUrl: faceUrl,
      fullBodyPhotoUrl: fullBodyUrl
    });

    await db.update(candidateTable).set({ cvDeadline: deadline, agency: cleanTemplateId }).where(eq(candidateTable.id, candidateId));
    
    const [generatedCV] = await db.select().from(generatedCvTable).where(eq(generatedCvTable.id, newCvId));
    res.json(generatedCV);
  } catch (error) {
    console.error('Error saving generated CV:', error);
    res.status(500).json({ error: 'Failed to save generated CV' });
  }
});

// PATCH /api/generated-cvs/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { templateId } = req.body;
    
    if (!templateId) {
      return res.status(400).json({ error: 'Missing templateId' });
    }
    
    if (id.startsWith('dummy-')) {
      const candidateId = id.replace('dummy-', '');
      const cands = await db.select().from(candidateTable).where(eq(candidateTable.id, candidateId));
      if (cands.length === 0) {
        return res.status(404).json({ error: 'Candidate not found' });
      }
      const candidate = cands[0];

      const deadline = new Date();
      deadline.setDate(deadline.getDate() + 30);
      const cleanTemplateId = templateId.replace('tmpl-', '').toLowerCase();

      const newCvId = generateId();
      await db.insert(generatedCvTable).values({
        id: newCvId,
        candidateId,
        templateId,
        facePhotoUrl: candidate.facePhotoUrl || candidate.passportImageUrl || null,
        fullBodyPhotoUrl: candidate.fullBodyPhotoUrl || null
      });

      await db.update(candidateTable).set({ cvDeadline: deadline, agency: cleanTemplateId }).where(eq(candidateTable.id, candidateId));

      const [newCV] = await db.select().from(generatedCvTable).where(eq(generatedCvTable.id, newCvId));
      return res.json(newCV);
    }

    const existingCVs = await db.select().from(generatedCvTable).where(eq(generatedCvTable.id, id));
    if (existingCVs.length === 0) {
      return res.status(404).json({ error: 'Generated CV not found' });
    }
    const existingCV = existingCVs[0];

    const duplicateCVs = await db.select().from(generatedCvTable).where(
      and(
        eq(generatedCvTable.candidateId, existingCV.candidateId),
        eq(generatedCvTable.templateId, templateId),
        ne(generatedCvTable.id, id)
      )
    );

    if (duplicateCVs.length > 0) {
      return res.status(409).json({ error: 'Candidate already generated in that template' });
    }

    const cleanTemplateId = templateId.replace('tmpl-', '').toLowerCase();
    await db.update(generatedCvTable).set({ templateId }).where(eq(generatedCvTable.id, id));
    await pool.query('UPDATE `Candidate` SET `cvDownloaded` = 0, `agency` = ? WHERE `id` = ?', [cleanTemplateId, existingCV.candidateId]);
    
    const [updatedCV] = await db.select().from(generatedCvTable).where(eq(generatedCvTable.id, id));
    res.json(updatedCV);
  } catch (error) {
    console.error('Error updating generated CV:', error);
    res.status(500).json({ error: 'Failed to update generated CV' });
  }
});

// DELETE /api/generated-cvs/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    if (id.startsWith('dummy-')) {
      const candidateId = id.replace('dummy-', '');
      await db.update(candidateTable).set({ agency: 'daera' }).where(eq(candidateTable.id, candidateId));
      return res.json({ success: true });
    }

    const existingCVs = await db.select().from(generatedCvTable).where(eq(generatedCvTable.id, id));
    if (existingCVs.length === 0) {
      return res.status(404).json({ error: 'Generated CV not found' });
    }

    await db.delete(generatedCvTable).where(eq(generatedCvTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting generated CV:', error);
    res.status(500).json({ error: 'Failed to delete generated CV' });
  }
});

export default router;
