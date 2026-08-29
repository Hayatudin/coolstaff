import { Router, Request, Response } from 'express';
import {
  db,
  pool,
  candidate as candidateTable,
  quickRegistration as quickRegistrationTable,
  preRegisteredVideo as preRegisteredVideoTable,
} from '../db';
import { eq, like, or } from 'drizzle-orm';
import { uploadFileFromDisk } from '../lib/upload';
import { encryptPath, sanitizeIncomingPath } from '../lib/crypto';
import multer from 'multer';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    let folder = 'videos';
    if (file.fieldname === 'facePhoto') folder = 'faces';
    else if (file.fieldname === 'fullBodyPhoto') folder = 'fullbody';

    const dir = path.join(process.cwd(), 'public', 'uploads', folder);
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || (file.fieldname === 'video' ? '.mp4' : '.jpg');
    const uniqueSuffix = crypto.randomBytes(16).toString('hex');
    cb(null, `${uniqueSuffix}${ext}`);
  }
});
const upload = multer({ storage });

const router = Router();

function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .trim();
}

// 1. GET /api/video-uploads/search-candidates?q=...
router.get('/search-candidates', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) return res.json([]);

    const pattern = `%${query}%`;

    const candidates = await db
      .select({
        id: candidateTable.id,
        givenNames: candidateTable.givenNames,
        surname: candidateTable.surname,
        passportNumber: candidateTable.passportNumber,
        nationality: candidateTable.nationality,
        passportImageUrl: candidateTable.passportImageUrl,
      })
      .from(candidateTable)
      .where(
        or(
          like(candidateTable.givenNames, pattern),
          like(candidateTable.surname, pattern),
          like(candidateTable.passportNumber, pattern)
        )
      )
      .limit(10);

    const quickRegistrations = await db
      .select({
        id: quickRegistrationTable.id,
        givenNames: quickRegistrationTable.givenNames,
        surname: quickRegistrationTable.surname,
        passportNumber: quickRegistrationTable.passportNumber,
        nationality: quickRegistrationTable.nationality,
        passportImageUrl: quickRegistrationTable.passportImageUrl,
      })
      .from(quickRegistrationTable)
      .where(
        or(
          like(quickRegistrationTable.givenNames, pattern),
          like(quickRegistrationTable.surname, pattern),
          like(quickRegistrationTable.passportNumber, pattern)
        )
      )
      .limit(10);

    const combined = [
      ...candidates.map(c => ({
        ...c,
        source: 'candidate',
        fullName: `${c.givenNames} ${c.surname}`.trim().toUpperCase(),
      })),
      ...quickRegistrations.map(q => ({
        ...q,
        source: 'quickRegistration',
        fullName: `${q.givenNames} ${q.surname}`.trim().toUpperCase(),
      })),
    ];

    res.json(combined.slice(0, 15));
  } catch (error: any) {
    console.error('Error searching candidates for video uploads:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

// 2. POST /api/video-uploads/save
router.post('/save', upload.fields([
  { name: 'video', maxCount: 1 },
  { name: 'facePhoto', maxCount: 1 },
  { name: 'fullBodyPhoto', maxCount: 1 }
]), async (req: Request, res: Response) => {
  try {
    const { id, source, passportNumber } = req.body;

    const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;
    const videoFile = files?.['video']?.[0];
    const facePhotoFile = files?.['facePhoto']?.[0];
    const fullBodyPhotoFile = files?.['fullBodyPhoto']?.[0];

    if (!videoFile) {
      return res.status(400).json({ error: 'Video file is required' });
    }

    const [finalVideoUrl, facePhoto, fullBodyPhoto] = await Promise.all([
      uploadFileFromDisk(videoFile.path, 'videos'),
      facePhotoFile ? uploadFileFromDisk(facePhotoFile.path, 'faces') : Promise.resolve(null),
      fullBodyPhotoFile ? uploadFileFromDisk(fullBodyPhotoFile.path, 'fullbody') : Promise.resolve(null)
    ]);

    if (!finalVideoUrl) {
      return res.status(400).json({ error: 'Failed to process video file' });
    }

    let resolvedPassportNumber = passportNumber ? passportNumber.trim().toUpperCase() : '';
    let resolvedFullName = '';

    if (id && source) {
      if (source === 'candidate') {
        const cands = await db.select({
          passportNumber: candidateTable.passportNumber,
          givenNames: candidateTable.givenNames,
          surname: candidateTable.surname,
        }).from(candidateTable).where(eq(candidateTable.id, id));

        if (cands.length > 0) {
          const cand = cands[0];
          resolvedPassportNumber = cand.passportNumber.trim().toUpperCase();
          resolvedFullName = `${cand.givenNames} ${cand.surname}`.trim().toUpperCase();
        }
      } else if (source === 'quickRegistration') {
        const qrs = await db.select({
          passportNumber: quickRegistrationTable.passportNumber,
          givenNames: quickRegistrationTable.givenNames,
          surname: quickRegistrationTable.surname,
        }).from(quickRegistrationTable).where(eq(quickRegistrationTable.id, id));

        if (qrs.length > 0) {
          const qr = qrs[0];
          resolvedPassportNumber = qr.passportNumber.trim().toUpperCase();
          resolvedFullName = `${qr.givenNames || ''} ${qr.surname || ''}`.trim().toUpperCase();
        }
      }
    }

    if (!resolvedPassportNumber && passportNumber) {
      resolvedPassportNumber = passportNumber.trim().toUpperCase();
    }

    if (!resolvedPassportNumber) {
      return res.status(400).json({ error: 'Passport number is required' });
    }

    if (!resolvedFullName) {
      const [cands]: any = await pool.query(
        'SELECT givenNames, surname FROM Candidate WHERE UPPER(passportNumber) = ? LIMIT 1',
        [resolvedPassportNumber]
      );
      if (cands && cands.length > 0) {
        resolvedFullName = `${cands[0].givenNames} ${cands[0].surname}`.trim().toUpperCase();
      } else {
        resolvedFullName = `PASSPORT: ${resolvedPassportNumber}`;
      }
    }

    const generatedId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    await pool.query(
      `INSERT INTO \`UploadedVideoProfile\` (\`id\`, \`passportNumber\`, \`fullName\`, \`videoUrl\`, \`facePhotoUrl\`, \`fullBodyPhotoUrl\`) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         \`fullName\` = VALUES(\`fullName\`),
         \`videoUrl\` = VALUES(\`videoUrl\`), 
         \`facePhotoUrl\` = VALUES(\`facePhotoUrl\`), 
         \`fullBodyPhotoUrl\` = VALUES(\`fullBodyPhotoUrl\`)`,
      [
        generatedId,
        resolvedPassportNumber,
        resolvedFullName,
        finalVideoUrl,
        facePhoto || null,
        fullBodyPhoto || null
      ]
    );

    try {
      await pool.query(
        `UPDATE \`Candidate\` 
         SET \`Youtube_URL\` = ?, \`facePhotoUrl\` = ?, \`fullBodyPhotoUrl\` = ?, \`allowVideo\` = 1 
         WHERE UPPER(\`passportNumber\`) = ?`,
        [finalVideoUrl, facePhoto || null, fullBodyPhoto || null, resolvedPassportNumber]
      );
    } catch (_) {}

    try {
      await pool.query(
        `UPDATE \`QuickRegistration\` 
         SET \`videoUrl\` = ?, \`allowVideo\` = 1 
         WHERE UPPER(\`passportNumber\`) = ?`,
        [finalVideoUrl, resolvedPassportNumber]
      );
    } catch (_) {}

    const [rawRows]: any = await pool.query(
      `SELECT * FROM \`UploadedVideoProfile\` WHERE \`passportNumber\` = ? LIMIT 1`,
      [resolvedPassportNumber]
    );
    const result = rawRows[0];

    res.json({ 
      success: true, 
      message: 'Video & photos registered successfully', 
      data: {
        ...result,
        videoUrl: encryptPath(result.videoUrl),
        facePhotoUrl: encryptPath(result.facePhotoUrl),
        fullBodyPhotoUrl: encryptPath(result.fullBodyPhotoUrl)
      } 
    });
  } catch (error: any) {
    console.error('Error saving video upload record:', error);
    res.status(500).json({ error: error.message || 'Failed to save video record' });
  }
});

// 3. GET /api/video-uploads/match?passportNumber=...
router.get('/match', async (req: Request, res: Response) => {
  try {
    const passportNumber = (req.query.passportNumber as string || '').trim().toUpperCase();
    const givenNames = (req.query.givenNames as string || '').trim().toUpperCase();
    const surname = (req.query.surname as string || '').trim().toUpperCase();

    if (passportNumber) {
      const videos = await db.select().from(preRegisteredVideoTable).where(eq(preRegisteredVideoTable.passportNumber, passportNumber));
      if (videos.length > 0) {
        const matchingVideo = videos[0];
        return res.json({
          matchFound: true,
          videoUrl: encryptPath(matchingVideo.videoUrl),
          facePhotoUrl: encryptPath(matchingVideo.facePhotoUrl),
          fullBodyPhotoUrl: encryptPath(matchingVideo.fullBodyPhotoUrl),
          matchedName: `PASSPORT: ${matchingVideo.passportNumber}`,
        });
      }
    }

    if (givenNames || surname) {
      const fullCombined = `${givenNames} ${surname}`.trim();
      const normalizedTarget = normalizeName(fullCombined);

      const preRegistered = await db.select().from(preRegisteredVideoTable);

      const matchingVideo = preRegistered.find(item => {
        const normalizedItemName = normalizeName(item.passportNumber);
        return (
          normalizedItemName === normalizedTarget ||
          normalizedItemName.includes(normalizedTarget) ||
          normalizedTarget.includes(normalizedItemName)
        );
      });

      if (matchingVideo) {
        return res.json({
          matchFound: true,
          videoUrl: encryptPath(matchingVideo.videoUrl),
          facePhotoUrl: encryptPath(matchingVideo.facePhotoUrl),
          fullBodyPhotoUrl: encryptPath(matchingVideo.fullBodyPhotoUrl),
          matchedName: `PASSPORT: ${matchingVideo.passportNumber}`,
        });
      }
    }

    res.json({ matchFound: false });
  } catch (error: any) {
    console.error('Error checking video match:', error);
    res.status(500).json({ error: 'Match check failed' });
  }
});

// 4. GET /api/video-uploads/uploaded
router.get('/uploaded', async (req: Request, res: Response) => {
  try {
    const q = ((req.query.q as string) || '').trim().toUpperCase();

    let queryStr = 'SELECT * FROM `UploadedVideoProfile`';
    const queryParams: any[] = [];

    if (q) {
      queryStr += ' WHERE UPPER(`passportNumber`) LIKE ? OR UPPER(`fullName`) LIKE ?';
      queryParams.push(`%${q}%`, `%${q}%`);
    }
    queryStr += ' ORDER BY `createdAt` DESC';

    const [rows]: any = await pool.query(queryStr, queryParams);

    const results = (rows || []).map((r: any) => ({
      id: r.id,
      fullName: r.fullName ? r.fullName.trim().toUpperCase() : `PASSPORT: ${r.passportNumber}`,
      passportNumber: r.passportNumber || '',
      nationality: '',
      videoUrl: encryptPath(r.videoUrl),
      facePhotoUrl: encryptPath(r.facePhotoUrl),
      fullBodyPhotoUrl: encryptPath(r.fullBodyPhotoUrl),
      date: r.createdAt ? new Date(r.createdAt).toISOString() : '',
      source: 'candidate' as const,
    }));

    res.json(results);
  } catch (error: any) {
    console.error('Error fetching uploaded videos:', error);
    res.status(500).json({ error: 'Failed to fetch uploaded videos' });
  }
});

// 5. PUT /api/video-uploads/:source/:id
router.put('/:source/:id', async (req: Request, res: Response) => {
  try {
    const { source, id } = req.params;
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const sanitizedVideoUrl = sanitizeIncomingPath(videoUrl);

    let profileUpdated = false;
    try {
      const [profiles]: any = await pool.query(
        'SELECT `passportNumber` FROM `UploadedVideoProfile` WHERE `id` = ? LIMIT 1',
        [id]
      );
      if (profiles && profiles.length > 0) {
        const pNum = profiles[0].passportNumber.trim().toUpperCase();

        await pool.query('UPDATE `UploadedVideoProfile` SET `videoUrl` = ? WHERE `id` = ?', [sanitizedVideoUrl, id]);

        try {
          await pool.query('UPDATE `Candidate` SET `Youtube_URL` = ?, `allowVideo` = 1 WHERE UPPER(`passportNumber`) = ?', [sanitizedVideoUrl, pNum]);
        } catch (_) {}

        try {
          await pool.query('UPDATE `QuickRegistration` SET `videoUrl` = ?, `allowVideo` = 1 WHERE UPPER(`passportNumber`) = ?', [sanitizedVideoUrl, pNum]);
        } catch (_) {}
        
        profileUpdated = true;
      }
    } catch (err) {
      console.warn('Failed to update UploadedVideoProfile in PUT:', err);
    }

    if (profileUpdated) {
      return res.json({ success: true, message: 'Uploaded video profile updated successfully' });
    }

    if (source === 'candidate') {
      await db.update(candidateTable).set({ videoUrl: sanitizedVideoUrl }).where(eq(candidateTable.id, id));
      return res.json({ success: true, message: 'Candidate video updated successfully' });
    } else if (source === 'quickRegistration') {
      await pool.query('UPDATE `QuickRegistration` SET `videoUrl` = ? WHERE `id` = ?', [sanitizedVideoUrl, id]);
      return res.json({ success: true, message: 'Quick registration video updated successfully' });
    } else if (source === 'preRegistered') {
      await db.update(preRegisteredVideoTable).set({ videoUrl: sanitizedVideoUrl }).where(eq(preRegisteredVideoTable.id, id));
      return res.json({ success: true, message: 'Pre-registered video updated successfully' });
    }

    res.status(400).json({ error: 'Invalid source type' });
  } catch (error: any) {
    console.error('Error updating video upload:', error);
    res.status(500).json({ error: error.message || 'Failed to update video' });
  }
});

// 6. DELETE /api/video-uploads/:source/:id
router.delete('/:source/:id', async (req: Request, res: Response) => {
  try {
    const { source, id } = req.params;

    let profileDeleted = false;
    try {
      const [profiles]: any = await pool.query(
        'SELECT `passportNumber` FROM `UploadedVideoProfile` WHERE `id` = ? LIMIT 1',
        [id]
      );
      if (profiles && profiles.length > 0) {
        const pNum = profiles[0].passportNumber.trim().toUpperCase();

        await pool.query('DELETE FROM `UploadedVideoProfile` WHERE `id` = ?', [id]);

        try {
          await pool.query('UPDATE `Candidate` SET `Youtube_URL` = NULL, `allowVideo` = 0 WHERE UPPER(`passportNumber`) = ?', [pNum]);
        } catch (_) {}

        try {
          await pool.query('UPDATE `QuickRegistration` SET `videoUrl` = NULL, `allowVideo` = 0 WHERE UPPER(`passportNumber`) = ?', [pNum]);
        } catch (_) {}

        profileDeleted = true;
      }
    } catch (err) {
      console.warn('Failed to delete UploadedVideoProfile in DELETE:', err);
    }

    if (profileDeleted) {
      return res.json({ success: true, message: 'Uploaded video profile deleted successfully' });
    }

    if (source === 'candidate') {
      await db.update(candidateTable).set({ videoUrl: null }).where(eq(candidateTable.id, id));
      return res.json({ success: true, message: 'Candidate video removed successfully' });
    } else if (source === 'quickRegistration') {
      await pool.query('UPDATE `QuickRegistration` SET `videoUrl` = NULL WHERE `id` = ?', [id]);
      return res.json({ success: true, message: 'Quick registration video removed successfully' });
    } else if (source === 'preRegistered') {
      await db.delete(preRegisteredVideoTable).where(eq(preRegisteredVideoTable.id, id));
      return res.json({ success: true, message: 'Pre-registered video record deleted successfully' });
    }

    res.status(400).json({ error: 'Invalid source type' });
  } catch (error: any) {
    console.error('Error deleting video upload:', error);
    res.status(500).json({ error: error.message || 'Failed to delete video' });
  }
});

export default router;
