import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal, uploadFileFromDisk } from '../lib/upload';
import { encryptPath, decryptPath, sanitizeIncomingPath } from '../lib/crypto';
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

// Helper to strip all non-alphanumeric characters and collapse spaces/convert to uppercase
function normalizeName(name: string): string {
  return name
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '') // remove spaces, punctuation, special chars
    .trim();
}

// 1. GET /api/video-uploads/search-candidates?q=...
router.get('/search-candidates', async (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) return res.json([]);

    // Search Candidate model
    const candidates = await prisma.candidate.findMany({
      where: {
        OR: [
          { givenNames: { contains: query } },
          { surname: { contains: query } },
          { passportNumber: { contains: query } },
        ],
      },
      select: {
        id: true,
        givenNames: true,
        surname: true,
        passportNumber: true,
        nationality: true,
        passportImageUrl: true,
      },
      take: 10,
    });

    // Search QuickRegistration model
    const quickRegistrations = await prisma.quickRegistration.findMany({
      where: {
        OR: [
          { givenNames: { contains: query } },
          { surname: { contains: query } },
          { passportNumber: { contains: query } },
        ],
      },
      select: {
        id: true,
        givenNames: true,
        surname: true,
        passportNumber: true,
        nationality: true,
        passportImageUrl: true,
      },
      take: 10,
    });

    // Format and combine results
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

    // Resolve passportNumber and fullName for UploadedVideoProfile entry
    let resolvedPassportNumber = passportNumber ? passportNumber.trim().toUpperCase() : '';
    let resolvedFullName = '';

    if (id && source) {
      if (source === 'candidate') {
        const cand = await prisma.candidate.findUnique({
          where: { id },
          select: { passportNumber: true, givenNames: true, surname: true }
        });
        if (cand) {
          resolvedPassportNumber = cand.passportNumber.trim().toUpperCase();
          resolvedFullName = `${cand.givenNames} ${cand.surname}`.trim().toUpperCase();
        }
      } else if (source === 'quickRegistration') {
        const qr: any = await prisma.quickRegistration.findUnique({
          where: { id },
          select: { passportNumber: true, givenNames: true, surname: true }
        });
        if (qr) {
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
      const cand = await prisma.candidate.findFirst({
        where: { passportNumber: resolvedPassportNumber },
        select: { givenNames: true, surname: true }
      });
      if (cand) {
        resolvedFullName = `${cand.givenNames} ${cand.surname}`.trim().toUpperCase();
      } else {
        resolvedFullName = `PASSPORT: ${resolvedPassportNumber}`;
      }
    }

    // Insert or update UploadedVideoProfile record
    const generatedId = crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex');
    await prisma.$executeRawUnsafe(
      `INSERT INTO \`UploadedVideoProfile\` (\`id\`, \`passportNumber\`, \`fullName\`, \`videoUrl\`, \`facePhotoUrl\`, \`fullBodyPhotoUrl\`) 
       VALUES (?, ?, ?, ?, ?, ?) 
       ON DUPLICATE KEY UPDATE 
         \`fullName\` = VALUES(\`fullName\`),
         \`videoUrl\` = VALUES(\`videoUrl\`), 
         \`facePhotoUrl\` = VALUES(\`facePhotoUrl\`), 
         \`fullBodyPhotoUrl\` = VALUES(\`fullBodyPhotoUrl\`)`,
      generatedId,
      resolvedPassportNumber,
      resolvedFullName,
      finalVideoUrl,
      facePhoto || null,
      fullBodyPhoto || null
    );

    // Sync to Candidate table for backward compatibility
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE \`Candidate\` 
         SET \`Youtube_URL\` = ?, \`facePhotoUrl\` = ?, \`fullBodyPhotoUrl\` = ?, \`allowVideo\` = 1 
         WHERE UPPER(\`passportNumber\`) = ?`,
        finalVideoUrl,
        facePhoto || null,
        fullBodyPhoto || null,
        resolvedPassportNumber
      );
    } catch (_) {}

    // Sync to QuickRegistration table for backward compatibility
    try {
      await prisma.$executeRawUnsafe(
        `UPDATE \`QuickRegistration\` 
         SET \`videoUrl\` = ?, \`allowVideo\` = 1 
         WHERE UPPER(\`passportNumber\`) = ?`,
        finalVideoUrl,
        resolvedPassportNumber
      );
    } catch (_) {}

    const rawRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT * FROM \`UploadedVideoProfile\` WHERE \`passportNumber\` = ? LIMIT 1`,
      resolvedPassportNumber
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

    // A. Priority matching by Passport Number
    if (passportNumber) {
      const matchingVideo = await prisma.preRegisteredVideo.findUnique({
        where: { passportNumber },
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

    // B. Fallback matching by Fuzzy Name if passportNumber not supplied
    if (givenNames || surname) {
      const fullCombined = `${givenNames} ${surname}`.trim();
      const normalizedTarget = normalizeName(fullCombined);

      // Fetch all buffered videos from database
      const preRegistered = await prisma.preRegisteredVideo.findMany();

      const matchingVideo = preRegistered.find(item => {
        // Fallback: check passportNumber or name if stored there
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

// 4. GET /api/video-uploads/uploaded — List all records that have a video URL
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

    const rows = await prisma.$queryRawUnsafe<any[]>(queryStr, ...queryParams);

    const results = rows.map((r: any) => ({
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

// 5. PUT /api/video-uploads/:source/:id — Update video link for a record
router.put('/:source/:id', async (req: Request, res: Response) => {
  try {
    const { source, id } = req.params;
    const { videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    const sanitizedVideoUrl = sanitizeIncomingPath(videoUrl);

    // Try updating UploadedVideoProfile if it exists by ID
    let profileUpdated = false;
    try {
      const profiles = await prisma.$queryRawUnsafe<{ passportNumber: string }[]>(
        'SELECT `passportNumber` FROM `UploadedVideoProfile` WHERE `id` = ? LIMIT 1',
        id
      );
      if (profiles.length > 0) {
        const pNum = profiles[0].passportNumber.trim().toUpperCase();

        await prisma.$executeRawUnsafe(
          'UPDATE `UploadedVideoProfile` SET `videoUrl` = ? WHERE `id` = ?',
          sanitizedVideoUrl,
          id
        );

        // Sync to Candidate table
        try {
          await prisma.$executeRawUnsafe(
            'UPDATE `Candidate` SET `Youtube_URL` = ?, `allowVideo` = 1 WHERE UPPER(`passportNumber`) = ?',
            sanitizedVideoUrl,
            pNum
          );
        } catch (_) {}

        // Sync to QuickRegistration table
        try {
          await prisma.$executeRawUnsafe(
            'UPDATE `QuickRegistration` SET `videoUrl` = ?, `allowVideo` = 1 WHERE UPPER(`passportNumber`) = ?',
            sanitizedVideoUrl,
            pNum
          );
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
      await prisma.candidate.update({
        where: { id },
        data: { videoUrl: sanitizedVideoUrl },
      });
      return res.json({ success: true, message: 'Candidate video updated successfully' });
    } else if (source === 'quickRegistration') {
      await prisma.$executeRawUnsafe(
        'UPDATE `QuickRegistration` SET `videoUrl` = ? WHERE `id` = ?',
        sanitizedVideoUrl,
        id
      );
      return res.json({ success: true, message: 'Quick registration video updated successfully' });
    } else if (source === 'preRegistered') {
      await prisma.preRegisteredVideo.update({
        where: { id },
        data: { videoUrl: sanitizedVideoUrl },
      });
      return res.json({ success: true, message: 'Pre-registered video updated successfully' });
    }

    res.status(400).json({ error: 'Invalid source type' });
  } catch (error: any) {
    console.error('Error updating video upload:', error);
    res.status(500).json({ error: error.message || 'Failed to update video' });
  }
});

// 6. DELETE /api/video-uploads/:source/:id — Remove video link/delete pre-registered record
router.delete('/:source/:id', async (req: Request, res: Response) => {
  try {
    const { source, id } = req.params;

    // Try deleting from UploadedVideoProfile if it exists by ID
    let profileDeleted = false;
    try {
      const profiles = await prisma.$queryRawUnsafe<{ passportNumber: string }[]>(
        'SELECT `passportNumber` FROM `UploadedVideoProfile` WHERE `id` = ? LIMIT 1',
        id
      );
      if (profiles.length > 0) {
        const pNum = profiles[0].passportNumber.trim().toUpperCase();

        await prisma.$executeRawUnsafe(
          'DELETE FROM `UploadedVideoProfile` WHERE `id` = ?',
          id
        );

        // Sync to Candidate table
        try {
          await prisma.$executeRawUnsafe(
            'UPDATE `Candidate` SET `Youtube_URL` = NULL, `allowVideo` = 0 WHERE UPPER(`passportNumber`) = ?',
            pNum
          );
        } catch (_) {}

        // Sync to QuickRegistration table
        try {
          await prisma.$executeRawUnsafe(
            'UPDATE `QuickRegistration` SET `videoUrl` = NULL, `allowVideo` = 0 WHERE UPPER(`passportNumber`) = ?',
            pNum
          );
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
      await prisma.candidate.update({
        where: { id },
        data: { videoUrl: null },
      });
      return res.json({ success: true, message: 'Candidate video removed successfully' });
    } else if (source === 'quickRegistration') {
      await prisma.$executeRawUnsafe(
        'UPDATE `QuickRegistration` SET `videoUrl` = NULL WHERE `id` = ?',
        id
      );
      return res.json({ success: true, message: 'Quick registration video removed successfully' });
    } else if (source === 'preRegistered') {
      await prisma.preRegisteredVideo.delete({
        where: { id },
      });
      return res.json({ success: true, message: 'Pre-registered video record deleted successfully' });
    }

    res.status(400).json({ error: 'Invalid source type' });
  } catch (error: any) {
    console.error('Error deleting video upload:', error);
    res.status(500).json({ error: error.message || 'Failed to delete video' });
  }
});

export default router;
