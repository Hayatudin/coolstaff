import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';
import fs from 'fs';
import path from 'path';

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

// Safe shelfNo generator
const getNextShelfNo = async (): Promise<string> => {
  const counterFilePath = path.join(process.cwd(), 'passport_shelf_counter.json');
  let currentCounter = 0;

  // 1. Try reading from the persisted file
  if (fs.existsSync(counterFilePath)) {
    try {
      const fileData = fs.readFileSync(counterFilePath, 'utf8');
      const parsed = JSON.parse(fileData);
      if (typeof parsed.counter === 'number') {
        currentCounter = parsed.counter;
      }
    } catch (e) {
      console.error('Error reading passport_shelf_counter.json:', e);
    }
  }

  // 2. Fallback / double-check against the max shelf number in the database
  try {
    const rows = await prisma.$queryRawUnsafe<{ maxShelf: string | number | null }[]>(
      'SELECT MAX(CAST(shelfNo AS UNSIGNED)) AS maxShelf FROM `Passport`'
    );
    const dbMax = rows[0]?.maxShelf ? Number(rows[0].maxShelf) : 0;
    if (dbMax > currentCounter) {
      currentCounter = dbMax;
    }
  } catch (dbErr) {
    console.warn('Could not query max shelfNo from Passport table:', dbErr);
  }

  const nextNum = currentCounter + 1;
  const shelfNoStr = String(nextNum).padStart(3, '0');

  // 3. Write the updated counter back to file
  try {
    fs.writeFileSync(counterFilePath, JSON.stringify({ counter: nextNum }), 'utf8');
  } catch (e) {
    console.error('Error writing passport_shelf_counter.json:', e);
  }

  return shelfNoStr;
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
    const { passportNumber, fullName, passportImageUrl } = req.body;

    if (!passportNumber || !passportNumber.trim()) {
      return res.status(400).json({ error: 'Passport number is required' });
    }
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required' });
    }

    const cleanPassportNumber = passportNumber.trim().toUpperCase();
    const cleanFullName = fullName.trim().toUpperCase();

    // Upload image to local disk / cloud
    const savedImageUrl = await uploadToLocal(passportImageUrl, 'passports');

    // Generate unique sequential shelfNo
    const shelfNo = await getNextShelfNo();
    const id = generateCuid('pp');

    let createdPassport;
    try {
      // Attempt using Prisma client
      createdPassport = await (prisma as any).passport.create({
        data: {
          id,
          shelfNo,
          fullName: cleanFullName,
          passportNumber: cleanPassportNumber,
          passportImageUrl: savedImageUrl,
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
          'INSERT INTO `Passport` (id, shelfNo, fullName, passportNumber, passportImageUrl, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, NOW(3), NOW(3))',
          id,
          shelfNo,
          cleanFullName,
          cleanPassportNumber,
          savedImageUrl,
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
    const { takenReason, takenByName, takenByPhone } = req.body;

    if (!takenReason || !['Medical', 'Terminate'].includes(takenReason)) {
      return res.status(400).json({ error: "Invalid or missing 'takenReason'. Must be 'Medical' or 'Terminate'." });
    }
    if (!takenByName || !takenByName.trim()) {
      return res.status(400).json({ error: "Person name who took the passport is required." });
    }
    if (takenReason === 'Terminate' && (!takenByPhone || !takenByPhone.trim())) {
      return res.status(400).json({ error: "Phone number is required for Terminate." });
    }

    const cleanTakerName = takenByName.trim().toUpperCase();
    const cleanTakerPhone = takenByPhone ? takenByPhone.trim() : null;

    try {
      // Attempt using Prisma client
      await (prisma as any).passport.update({
        where: { id },
        data: {
          status: 'PassportTaken',
          takenReason,
          takenByName: cleanTakerName,
          takenByPhone: cleanTakerPhone,
        },
      });
    } catch (prismaErr: any) {
      console.warn('[PASSPORTS] prisma.passport.update failed, trying raw SQL fallback:', prismaErr.message || prismaErr);
      
      await prisma.$executeRawUnsafe(
        "UPDATE `Passport` SET status = 'PassportTaken', takenReason = ?, takenByName = ?, takenByPhone = ?, updatedAt = NOW(3) WHERE id = ?",
        takenReason,
        cleanTakerName,
        cleanTakerPhone,
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
