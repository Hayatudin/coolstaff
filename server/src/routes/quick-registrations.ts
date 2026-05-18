import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

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
    res.status(500).json({ error: 'Failed to fetch quick registrations' });
  }
});

// POST /api/quick-registrations
router.post('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const registration = await prisma.quickRegistration.create({
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
        passportImageUrl: body.passportImageUrl || null,
        religion: body.religion || null,
        brokerId: body.brokerId || null,
        relativePhones: body.relativePhones || null,
        cocDocumentUrl: body.cocDocumentUrl || null,
        labourIdUrl: body.labourIdUrl || null,
        candidateIdImageUrl: body.candidateIdImageUrl || null,
        relativeIdImageUrl: body.relativeIdImageUrl || null,
      },
      include: {
        broker: { select: { id: true, name: true } },
      },
    });
    res.status(201).json(registration);
  } catch (error: any) {
    res.status(500).json({ error: error?.message || 'Failed to create quick registration' });
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
    res.status(500).json({ error: 'Failed to fetch quick registration' });
  }
});

export default router;
