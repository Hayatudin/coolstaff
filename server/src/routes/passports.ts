import { Router, Request, Response } from 'express';
import { db, pool, passport as passportTable, generateId } from '../db';
import { eq, desc } from 'drizzle-orm';
import { uploadToLocal } from '../lib/upload';
import fs from 'fs';
import path from 'path';

const router = Router();

const getNextShelfNo = async (): Promise<string> => {
  const counterFilePath = path.join(process.cwd(), 'passport_shelf_counter.json');
  let currentCounter = 0;

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

  try {
    const [rows]: any = await pool.query(
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
    const passports = await db
      .select()
      .from(passportTable)
      .orderBy(desc(passportTable.createdAt));
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

    const savedImageUrl = await uploadToLocal(passportImageUrl, 'passports');
    const shelfNo = await getNextShelfNo();
    const id = 'pp' + generateId().slice(0, 23);

    try {
      await db.insert(passportTable).values({
        id,
        shelfNo,
        fullName: cleanFullName,
        passportNumber: cleanPassportNumber,
        passportImageUrl: savedImageUrl,
        status: 'Available',
      });
    } catch (dbErr: any) {
      if (dbErr.code === 'ER_DUP_ENTRY' || dbErr.message?.includes('Duplicate entry')) {
        return res.status(400).json({ error: 'A passport with this Passport Number is already registered.' });
      }
      throw dbErr;
    }

    const [createdPassport] = await db.select().from(passportTable).where(eq(passportTable.id, id));
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

    await db.update(passportTable).set({
      status: 'PassportTaken',
      takenReason,
      takenByName: cleanTakerName,
      takenByPhone: cleanTakerPhone,
    }).where(eq(passportTable.id, id));

    res.json({ success: true, message: 'Passport marked as taken successfully' });
  } catch (error: any) {
    console.error('Failed to mark passport as taken:', error);
    res.status(500).json({ error: 'Failed to update passport: ' + error.message });
  }
});

// PATCH /api/passports/:id/return
router.patch('/:id/return', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.update(passportTable).set({
      status: 'Available',
      takenReason: null,
      takenByName: null,
      takenByPhone: null,
    }).where(eq(passportTable.id, id));

    res.json({ success: true, message: 'Passport returned to available successfully' });
  } catch (error: any) {
    console.error('Failed to return passport:', error);
    res.status(500).json({ error: 'Failed to return passport: ' + error.message });
  }
});

// DELETE /api/passports/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    await db.delete(passportTable).where(eq(passportTable.id, id));

    res.json({ success: true, message: 'Passport deleted successfully' });
  } catch (error: any) {
    console.error('Failed to delete passport:', error);
    res.status(500).json({ error: 'Failed to delete passport: ' + error.message });
  }
});

export default router;
