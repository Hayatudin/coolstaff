import { Router, Request, Response } from 'express';
import {
  db,
  pool,
  quickRegistration as quickRegistrationTable,
  candidate as candidateTable,
  broker as brokerTable,
  user as userTable,
  generateId,
} from '../db';
import { eq, or, desc } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';
import { exec } from 'child_process';
import path from 'path';
import { getSession } from '../lib/auth-helper';

function formatDbError(error: any): string {
  if (!error) return 'Unknown error';
  return error.message || String(error);
}

const router = Router();

// GET /api/quick-registrations/generate-client
router.get('/generate-client', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.write('Starting build check on server...\n\n');
  res.write('✅ Drizzle ORM active!\n');
  res.end();
});

// GET /api/quick-registrations
router.get('/', async (req: Request, res: Response) => {
  try {
    const [rows]: any = await pool.query(`
      SELECT qr.*, b.name as brokerName, u.name as registeredByName
      FROM QuickRegistration qr
      LEFT JOIN Broker b ON qr.brokerId = b.id
      LEFT JOIN User u ON qr.registeredById = u.id
      ORDER BY qr.createdAt DESC
    `);

    const parseJson = (val: any) => {
      if (!val) return null;
      if (typeof val === 'object') return val;
      try { return JSON.parse(val); } catch (_) { return null; }
    };

    const registrations = (rows || []).map((r: any) => ({
      id: r.id,
      passportNumber: r.passportNumber,
      surname: r.surname,
      givenNames: r.givenNames,
      dateOfBirth: r.dateOfBirth ? new Date(r.dateOfBirth).toISOString().split('T')[0] : null,
      gender: r.gender,
      nationality: r.nationality,
      dateOfExpiry: r.dateOfExpiry ? new Date(r.dateOfExpiry).toISOString().split('T')[0] : null,
      issuingCountry: r.issuingCountry,
      placeOfBirth: r.placeOfBirth,
      educationLevel: r.educationLevel,
      jobExperience: r.jobExperience,
      maritalStatus: r.maritalStatus,
      numberOfChildren: r.numberOfChildren,
      passportImageUrl: r.passportImageUrl,
      religion: r.religion,
      brokerId: r.brokerId,
      broker: r.brokerId ? { id: r.brokerId, name: r.brokerName } : null,
      cocDocumentUrl: r.cocDocumentUrl,
      labourIdUrl: r.labourIdUrl,
      laborID: r.laborID,
      candidateIdImageUrl: r.candidateIdImageUrl,
      relativeIdImageUrl: r.relativeIdImageUrl,
      videoUrl: r.videoUrl,
      relativePhones: parseJson(r.relativePhones),
      verificationStatus: r.verificationStatus,
      promotedCandidateId: r.promotedCandidateId,
      agency: r.agency || 'daera',
      passportType: r.passportType || 'original',
      languages: parseJson(r.languages),
      allowVideo: r.allowVideo === 1 || r.allowVideo === true,
      registeredById: r.registeredById,
      registeredBy: r.registeredByName || 'Walk-in',
      createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : new Date().toISOString(),
      updatedAt: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    }));

    res.json(registrations);
  } catch (error) {
    console.error('Failed to fetch quick registrations:', error);
    res.status(500).json({ error: 'Failed to fetch quick registrations' });
  }
});

// POST /api/quick-registrations
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;

    if (!body.passportNumber) {
      return res.status(400).json({ error: 'Passport number is required' });
    }

    const pNum = body.passportNumber.trim();
    const [existingQr]: any = await pool.query(
      'SELECT id FROM QuickRegistration WHERE LOWER(passportNumber) = LOWER(?) LIMIT 1',
      [pNum]
    );

    if (existingQr && existingQr.length > 0) {
      return res.status(400).json({ error: 'A quick registration with this passport number already exists.' });
    }

    const [existingCandidate]: any = await pool.query(
      'SELECT id FROM Candidate WHERE LOWER(passportNumber) = LOWER(?) LIMIT 1',
      [pNum]
    );

    if (existingCandidate && existingCandidate.length > 0) {
      return res.status(400).json({ error: 'A full candidate registration with this passport number already exists.' });
    }

    let registeredById = body.registeredById || null;
    try {
      const session = await getSession(req);
      if (session?.user?.id) {
        registeredById = session.user.id;
      }
    } catch (sessionError) {}

    const [
      passportImageUrl,
      cocDocumentUrl,
      labourIdUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      videoUrl
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.cocDocumentUrl, 'coc'),
      body.labourIdUrl && body.labourIdUrl.startsWith('data:') ? uploadToLocal(body.labourIdUrl, 'labour-id') : Promise.resolve(body.labourIdUrl || null),
      uploadToLocal(body.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.relativeIdImageUrl, 'relative-id'),
      uploadToLocal(body.videoUrl, 'videos'),
    ]);

    const qrId = generateId();

    await db.insert(quickRegistrationTable).values({
      id: qrId,
      passportNumber: body.passportNumber || '',
      surname: body.surname || '',
      givenNames: body.givenNames || '',
      dateOfBirth: body.dateOfBirth || null,
      gender: body.gender || null,
      nationality: body.nationality || null,
      dateOfExpiry: body.dateOfExpiry || null,
      issuingCountry: body.issuingCountry || null,
      placeOfBirth: body.placeOfBirth || null,
      educationLevel: body.educationLevel || null,
      jobExperience: body.jobExperience || null,
      maritalStatus: body.maritalStatus || null,
      numberOfChildren: parseInt(body.numberOfChildren) || 0,
      passportImageUrl,
      religion: body.religion || null,
      brokerId: body.brokerId || null,
      cocDocumentUrl: cocDocumentUrl || null,
      labourIdUrl: labourIdUrl || null,
      laborID: body.laborID || null,
      candidateIdImageUrl: candidateIdImageUrl || null,
      relativeIdImageUrl: relativeIdImageUrl || null,
      relativePhones: body.relativePhones ? JSON.stringify(body.relativePhones) : null,
      videoUrl: videoUrl || null,
      agency: body.agency || 'daera',
      passportType: body.passportType || 'original',
      languages: body.languages ? JSON.stringify(body.languages) : null,
      allowVideo: body.allowVideo ?? false,
      registeredById,
    });

    const [rows]: any = await pool.query(`
      SELECT qr.*, b.name as brokerName, u.name as registeredByName
      FROM QuickRegistration qr
      LEFT JOIN Broker b ON qr.brokerId = b.id
      LEFT JOIN User u ON qr.registeredById = u.id
      WHERE qr.id = ? LIMIT 1
    `, [qrId]);

    const registration = rows[0];
    registration.registeredBy = registration.registeredByName || 'Walk-in';
    res.status(201).json(registration);
  } catch (error: any) {
    console.error('Error creating quick registration:', error);
    res.status(500).json({ error: formatDbError(error) });
  }
});

// PUT /api/quick-registrations/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const [existingRows]: any = await pool.query('SELECT id FROM QuickRegistration WHERE id = ? LIMIT 1', [id]);
    if (!existingRows || existingRows.length === 0) {
      return res.status(404).json({ error: 'Quick registration not found' });
    }

    const [
      passportImageUrl,
      cocDocumentUrl,
      labourIdUrl,
      candidateIdImageUrl,
      relativeIdImageUrl,
      videoUrl
    ] = await Promise.all([
      body.passportImageUrl !== undefined ? uploadToLocal(body.passportImageUrl, 'passports') : undefined,
      body.cocDocumentUrl !== undefined ? uploadToLocal(body.cocDocumentUrl, 'coc') : undefined,
      body.labourIdUrl !== undefined ? uploadToLocal(body.labourIdUrl, 'labour-id') : undefined,
      body.candidateIdImageUrl !== undefined ? uploadToLocal(body.candidateIdImageUrl, 'candidate-id') : undefined,
      body.relativeIdImageUrl !== undefined ? uploadToLocal(body.relativeIdImageUrl, 'relative-id') : undefined,
      body.videoUrl !== undefined ? uploadToLocal(body.videoUrl, 'videos') : undefined,
    ]);

    const updateFields: any = {};
    if (body.passportNumber !== undefined) updateFields.passportNumber = body.passportNumber;
    if (body.surname !== undefined) updateFields.surname = body.surname;
    if (body.givenNames !== undefined) updateFields.givenNames = body.givenNames;
    if (body.dateOfBirth !== undefined) updateFields.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null;
    if (body.gender !== undefined) updateFields.gender = body.gender;
    if (body.nationality !== undefined) updateFields.nationality = body.nationality;
    if (body.dateOfExpiry !== undefined) updateFields.dateOfExpiry = body.dateOfExpiry ? new Date(body.dateOfExpiry) : null;
    if (body.issuingCountry !== undefined) updateFields.issuingCountry = body.issuingCountry;
    if (body.placeOfBirth !== undefined) updateFields.placeOfBirth = body.placeOfBirth;
    if (body.educationLevel !== undefined) updateFields.educationLevel = body.educationLevel;
    if (body.jobExperience !== undefined) updateFields.jobExperience = body.jobExperience;
    if (body.maritalStatus !== undefined) updateFields.maritalStatus = body.maritalStatus;
    if (body.numberOfChildren !== undefined) updateFields.numberOfChildren = parseInt(body.numberOfChildren) || 0;
    if (passportImageUrl !== undefined) updateFields.passportImageUrl = passportImageUrl;
    if (body.religion !== undefined) updateFields.religion = body.religion;
    if (body.brokerId !== undefined) updateFields.brokerId = body.brokerId || null;
    if (cocDocumentUrl !== undefined) updateFields.cocDocumentUrl = cocDocumentUrl;
    if (labourIdUrl !== undefined) updateFields.labourIdUrl = labourIdUrl;
    if (candidateIdImageUrl !== undefined) updateFields.candidateIdImageUrl = candidateIdImageUrl;
    if (relativeIdImageUrl !== undefined) updateFields.relativeIdImageUrl = relativeIdImageUrl;
    if (body.relativePhones !== undefined) updateFields.relativePhones = body.relativePhones ? JSON.stringify(body.relativePhones) : null;
    if (videoUrl !== undefined) updateFields.videoUrl = videoUrl;
    if (body.agency !== undefined) updateFields.agency = body.agency || 'daera';
    if (body.passportType !== undefined) updateFields.passportType = body.passportType || 'original';
    if (body.languages !== undefined) updateFields.languages = body.languages ? JSON.stringify(body.languages) : null;
    if (body.allowVideo !== undefined) updateFields.allowVideo = Boolean(body.allowVideo);
    if (body.laborID !== undefined) updateFields.laborID = body.laborID || null;

    if (Object.keys(updateFields).length > 0) {
      await db.update(quickRegistrationTable).set(updateFields).where(eq(quickRegistrationTable.id, id));
    }

    const [rows]: any = await pool.query(`
      SELECT qr.*, b.name as brokerName, u.name as registeredByName
      FROM QuickRegistration qr
      LEFT JOIN Broker b ON qr.brokerId = b.id
      LEFT JOIN User u ON qr.registeredById = u.id
      WHERE qr.id = ? LIMIT 1
    `, [id]);

    res.json(rows[0]);
  } catch (error: any) {
    console.error('Error updating quick registration:', error);
    res.status(500).json({ error: formatDbError(error) });
  }
});

// GET /api/quick-registrations/by-passport/:passportNumber
router.get('/by-passport/:passportNumber', async (req: Request, res: Response) => {
  try {
    const { passportNumber } = req.params;
    const [rows]: any = await pool.query(
      `SELECT qr.*, b.name as brokerName, u.name as registeredByName
       FROM QuickRegistration qr
       LEFT JOIN Broker b ON qr.brokerId = b.id
       LEFT JOIN User u ON qr.registeredById = u.id
       WHERE LOWER(qr.passportNumber) = LOWER(?) LIMIT 1`,
      [passportNumber]
    );

    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const registration = rows[0];
    registration.registeredBy = registration.registeredByName || 'Registrar';
    res.json(registration);
  } catch (error) {
    console.error('Failed to fetch quick registration by passport:', error);
    res.status(500).json({ error: 'Failed to fetch quick registration by passport' });
  }
});

// GET /api/quick-registrations/:id
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const [rows]: any = await pool.query(
      `SELECT qr.*, b.name as brokerName, u.name as registeredByName
       FROM QuickRegistration qr
       LEFT JOIN Broker b ON qr.brokerId = b.id
       LEFT JOIN User u ON qr.registeredById = u.id
       WHERE qr.id = ? LIMIT 1`,
      [id]
    );

    if (!rows || rows.length === 0) return res.status(404).json({ error: 'Not found' });
    const registration = rows[0];
    registration.registeredBy = registration.registeredByName || 'Registrar';
    res.json(registration);
  } catch (error) {
    console.error('Failed to fetch quick registration:', error);
    res.status(500).json({ error: 'Failed to fetch quick registration' });
  }
});

// DELETE /api/quick-registrations/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    
    const [rows]: any = await pool.query('SELECT id FROM QuickRegistration WHERE id = ? LIMIT 1', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Registration not found' });
    }

    await db.delete(quickRegistrationTable).where(eq(quickRegistrationTable.id, id));
    
    res.json({ success: true, message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete quick registration:', error);
    res.status(500).json({ error: error.message || 'Failed to delete registration' });
  }
});

export default router;
