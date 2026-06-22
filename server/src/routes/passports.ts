import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Helper to generate a unique random ID (CUID-like)
const generateCuid = (prefix = 'pp') => {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let randomPart = '';
  for (let i = 0; i < 23; i++) {
    randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return prefix + randomPart;
};

// GET /api/passports
router.get('/', async (req: Request, res: Response) => {
  try {
    let passports;
    try {
      // Attempt using Prisma client
      passports = await (prisma as any).passport.findMany({
        orderBy: { createdAt: 'desc' },
      });
    } catch (prismaErr: any) {
      console.warn('[PASSPORTS] prisma.passport.findMany failed, trying raw SQL fallback:', prismaErr.message || prismaErr);
      passports = await prisma.$queryRawUnsafe<any[]>(
        'SELECT * FROM `Passport` ORDER BY `createdAt` DESC'
      );
    }
    res.json(passports);
  } catch (error: any) {
    console.error('Failed to fetch passports:', error);
    res.status(500).json({ error: 'Failed to fetch passports: ' + error.message });
  }
});

// POST /api/passports
router.post('/', async (req: Request, res: Response) => {
  try {
    const { passportNumber, surname, givenNames, dateOfBirth, dateOfExpiry, nationality, gender } = req.body;

    if (!passportNumber || !passportNumber.trim()) {
      return res.status(400).json({ error: 'Passport number is required' });
    }
    if (!surname || !surname.trim()) {
      return res.status(400).json({ error: 'Surname is required' });
    }
    if (!givenNames || !givenNames.trim()) {
      return res.status(400).json({ error: 'Given names are required' });
    }

    const cleanPassportNumber = passportNumber.trim().toUpperCase();
    const cleanSurname = surname.trim().toUpperCase();
    const cleanGivenNames = givenNames.trim().toUpperCase();
    const dob = dateOfBirth ? new Date(dateOfBirth) : null;
    const doe = dateOfExpiry ? new Date(dateOfExpiry) : null;
    const cleanNationality = nationality ? nationality.trim() : null;
    const cleanGender = gender ? gender.trim() : null;

    const id = generateCuid('pp');

    let createdPassport;
    try {
      // Attempt using Prisma client
      createdPassport = await (prisma as any).passport.create({
        data: {
          id,
          passportNumber: cleanPassportNumber,
          surname: cleanSurname,
          givenNames: cleanGivenNames,
          dateOfBirth: dob,
          dateOfExpiry: doe,
          nationality: cleanNationality,
          gender: cleanGender,
          status: 'Available',
        },
      });
    } catch (prismaErr: any) {
      if (prismaErr.code === 'P2002' || prismaErr.message?.includes('Duplicate entry')) {
        return res.status(400).json({ error: 'A passport with this Passport Number is already registered.' });
      }
      console.warn('[PASSPORTS] prisma.passport.create failed, trying raw SQL fallback:', prismaErr.message || prismaErr);
      
      try {
        await prisma.$executeRawUnsafe(
          'INSERT INTO `Passport` (id, passportNumber, surname, givenNames, dateOfBirth, dateOfExpiry, nationality, gender, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, NOW(3), NOW(3))',
          id,
          cleanPassportNumber,
          cleanSurname,
          cleanGivenNames,
          dob,
          doe,
          cleanNationality,
          cleanGender,
          'Available'
        );

        const rows = await prisma.$queryRawUnsafe<any[]>(
          'SELECT * FROM `Passport` WHERE id = ? LIMIT 1',
          id
        );
        createdPassport = rows[0];
      } catch (rawErr: any) {
        if (rawErr.message?.includes('Duplicate entry') || rawErr.code === 'P2002') {
          return res.status(400).json({ error: 'A passport with this Passport Number is already registered.' });
        }
        throw rawErr;
      }
    }

    res.status(201).json(createdPassport);
  } catch (error: any) {
    console.error('Failed to create passport:', error);
    res.status(500).json({ error: 'Failed to create passport: ' + error.message });
  }
});

// PATCH /api/passports/:id/taken
router.patch('/:id/taken', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    try {
      // Attempt using Prisma client
      await (prisma as any).passport.update({
        where: { id },
        data: { status: 'PassportTaken' },
      });
    } catch (prismaErr: any) {
      console.warn('[PASSPORTS] prisma.passport.update failed, trying raw SQL fallback:', prismaErr.message || prismaErr);
      
      await prisma.$executeRawUnsafe(
        "UPDATE `Passport` SET status = 'PassportTaken', updatedAt = NOW(3) WHERE id = ?",
        id
      );
    }

    res.json({ success: true, message: 'Passport marked as taken successfully' });
  } catch (error: any) {
    console.error('Failed to mark passport as taken:', error);
    res.status(500).json({ error: 'Failed to update passport: ' + error.message });
  }
});

// DELETE /api/passports/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    try {
      // Attempt using Prisma client
      await (prisma as any).passport.delete({
        where: { id },
      });
    } catch (prismaErr: any) {
      console.warn('[PASSPORTS] prisma.passport.delete failed, trying raw SQL fallback:', prismaErr.message || prismaErr);
      
      await prisma.$executeRawUnsafe(
        'DELETE FROM `Passport` WHERE id = ?',
        id
      );
    }

    res.json({ success: true, message: 'Passport deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete passport:', error);
    res.status(500).json({ error: 'Failed to delete passport: ' + error.message });
  }
});

export default router;
