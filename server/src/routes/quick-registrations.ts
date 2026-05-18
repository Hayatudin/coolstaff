import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';
import { exec } from 'child_process';
import path from 'path';

const router = Router();

// GET /api/quick-registrations/generate-client
router.get('/generate-client', (req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/plain');
  res.write('Starting Prisma Client regeneration on server...\n\n');
  
  exec('npx prisma generate', { cwd: path.join(process.cwd()) }, (err, stdout, stderr) => {
    if (err) {
      res.write(`❌ Error: ${err.message}\n\n`);
      res.write(`Stderr: ${stderr}\n`);
      return res.end();
    }
    res.write(`✅ Success!\n\nStdout:\n${stdout}\n`);
    res.end();
  });
});

// GET /api/quick-registrations
router.get('/', async (req: Request, res: Response) => {
  try {
    const registrations = await prisma.quickRegistration.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        broker: { select: { id: true, name: true } },
      },
    });
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

    const [
      passportImageUrl,
      cocDocumentUrl,
      labourIdUrl,
      candidateIdImageUrl,
      relativeIdImageUrl
    ] = await Promise.all([
      uploadToLocal(body.passportImageUrl, 'passports'),
      uploadToLocal(body.cocDocumentUrl, 'coc'),
      uploadToLocal(body.labourIdUrl, 'labour-id'),
      uploadToLocal(body.candidateIdImageUrl, 'candidate-id'),
      uploadToLocal(body.relativeIdImageUrl, 'relative-id'),
    ]);

    const registration: any = await prisma.quickRegistration.create({
      data: {
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
        broker: body.brokerId ? { connect: { id: body.brokerId } } : undefined,
      },
      include: {
        broker: { select: { id: true, name: true } },
      },
    });

    // Safe Raw SQL Update for new columns (bypasses out-of-sync Prisma Client cache completely)
    try {
      const relPhonesString = body.relativePhones ? JSON.stringify(body.relativePhones) : null;
      await prisma.$executeRawUnsafe(
        `UPDATE \`QuickRegistration\` 
         SET \`cocDocumentUrl\` = ?, \`labourIdUrl\` = ?, \`candidateIdImageUrl\` = ?, \`relativeIdImageUrl\` = ?, \`relativePhones\` = ?
         WHERE \`id\` = ?`,
        cocDocumentUrl || null,
        labourIdUrl || null,
        candidateIdImageUrl || null,
        relativeIdImageUrl || null,
        relPhonesString,
        registration.id
      );

      // Attach new fields to the returned object
      registration.cocDocumentUrl = cocDocumentUrl || null;
      registration.labourIdUrl = labourIdUrl || null;
      registration.candidateIdImageUrl = candidateIdImageUrl || null;
      registration.relativeIdImageUrl = relativeIdImageUrl || null;
      registration.relativePhones = body.relativePhones || null;
    } catch (rawError) {
      console.error('Failed to run raw SQL update for QuickRegistration new fields:', rawError);
    }

    res.status(201).json(registration);
  } catch (error: any) {
    console.error('Error creating quick registration:', error);
    res.status(500).json({ error: error?.message || 'Failed to create quick registration' });
  }
});

// PUT /api/quick-registrations/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const body = req.body;

    const existing = await prisma.quickRegistration.findUnique({
      where: { id },
    });
    if (!existing) {
      return res.status(404).json({ error: 'Quick registration not found' });
    }

    const [
      passportImageUrl,
      cocDocumentUrl,
      labourIdUrl,
      candidateIdImageUrl,
      relativeIdImageUrl
    ] = await Promise.all([
      body.passportImageUrl !== undefined ? uploadToLocal(body.passportImageUrl, 'passports') : undefined,
      body.cocDocumentUrl !== undefined ? uploadToLocal(body.cocDocumentUrl, 'coc') : undefined,
      body.labourIdUrl !== undefined ? uploadToLocal(body.labourIdUrl, 'labour-id') : undefined,
      body.candidateIdImageUrl !== undefined ? uploadToLocal(body.candidateIdImageUrl, 'candidate-id') : undefined,
      body.relativeIdImageUrl !== undefined ? uploadToLocal(body.relativeIdImageUrl, 'relative-id') : undefined,
    ]);

    const updateData: any = {};
    if (body.passportNumber !== undefined) updateData.passportNumber = body.passportNumber;
    if (body.surname !== undefined) updateData.surname = body.surname;
    if (body.givenNames !== undefined) updateData.givenNames = body.givenNames;
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth;
    if (body.gender !== undefined) updateData.gender = body.gender;
    if (body.nationality !== undefined) updateData.nationality = body.nationality;
    if (body.dateOfExpiry !== undefined) updateData.dateOfExpiry = body.dateOfExpiry;
    if (body.issuingCountry !== undefined) updateData.issuingCountry = body.issuingCountry;
    if (body.placeOfBirth !== undefined) updateData.placeOfBirth = body.placeOfBirth;
    if (body.educationLevel !== undefined) updateData.educationLevel = body.educationLevel;
    if (body.jobExperience !== undefined) updateData.jobExperience = body.jobExperience;
    if (body.maritalStatus !== undefined) updateData.maritalStatus = body.maritalStatus;
    if (body.numberOfChildren !== undefined) updateData.numberOfChildren = parseInt(body.numberOfChildren) || 0;
    if (passportImageUrl !== undefined) updateData.passportImageUrl = passportImageUrl;
    if (body.religion !== undefined) updateData.religion = body.religion;
    if (body.brokerId !== undefined) {
      if (body.brokerId === null || body.brokerId === '') {
        updateData.broker = { disconnect: true };
      } else {
        updateData.broker = { connect: { id: body.brokerId } };
      }
    }
    const updated: any = await prisma.quickRegistration.update({
      where: { id },
      data: updateData,
      include: {
        broker: { select: { id: true, name: true } },
      },
    });

    // Safe Raw SQL Update for new columns (bypasses out-of-sync Prisma Client cache completely)
    if (
      cocDocumentUrl !== undefined ||
      labourIdUrl !== undefined ||
      candidateIdImageUrl !== undefined ||
      relativeIdImageUrl !== undefined ||
      body.relativePhones !== undefined
    ) {
      try {
        const setClauses: string[] = [];
        const queryParams: any[] = [];

        if (cocDocumentUrl !== undefined) {
          setClauses.push('`cocDocumentUrl` = ?');
          queryParams.push(cocDocumentUrl);
          updated.cocDocumentUrl = cocDocumentUrl;
        }
        if (labourIdUrl !== undefined) {
          setClauses.push('`labourIdUrl` = ?');
          queryParams.push(labourIdUrl);
          updated.labourIdUrl = labourIdUrl;
        }
        if (candidateIdImageUrl !== undefined) {
          setClauses.push('`candidateIdImageUrl` = ?');
          queryParams.push(candidateIdImageUrl);
          updated.candidateIdImageUrl = candidateIdImageUrl;
        }
        if (relativeIdImageUrl !== undefined) {
          setClauses.push('`relativeIdImageUrl` = ?');
          queryParams.push(relativeIdImageUrl);
          updated.relativeIdImageUrl = relativeIdImageUrl;
        }
        if (body.relativePhones !== undefined) {
          setClauses.push('`relativePhones` = ?');
          queryParams.push(body.relativePhones ? JSON.stringify(body.relativePhones) : null);
          updated.relativePhones = body.relativePhones;
        }

        if (setClauses.length > 0) {
          queryParams.push(id);
          await prisma.$executeRawUnsafe(
            `UPDATE \`QuickRegistration\` SET ${setClauses.join(', ')} WHERE \`id\` = ?`,
            ...queryParams
          );
        }
      } catch (rawError) {
        console.error('Failed to run raw SQL update for QuickRegistration PUT new fields:', rawError);
      }
    }

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating quick registration:', error);
    res.status(500).json({ error: error?.message || 'Failed to update quick registration' });
  }
});

// GET /api/quick-registrations/by-passport/:passportNumber
router.get('/by-passport/:passportNumber', async (req: Request, res: Response) => {
  try {
    const { passportNumber } = req.params;
    const registration = await prisma.quickRegistration.findFirst({
      where: { passportNumber },
      include: {
        broker: { select: { id: true, name: true } },
      },
    });
    if (!registration) return res.status(404).json({ error: 'Not found' });
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
    const registration = await prisma.quickRegistration.findUnique({
      where: { id },
      include: {
        broker: { select: { id: true, name: true } },
      },
    });
    if (!registration) return res.status(404).json({ error: 'Not found' });
    res.json(registration);
  } catch (error) {
    console.error('Failed to fetch quick registration:', error);
    res.status(500).json({ error: 'Failed to fetch quick registration' });
  }
});

export default router;
