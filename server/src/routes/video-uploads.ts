import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { uploadToLocal } from '../lib/upload';

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
router.post('/save', async (req: Request, res: Response) => {
  try {
    const { id, source, passportNumber, videoUrl, facePhotoUrl, fullBodyPhotoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // Process base64 photo uploads if present
    const [facePhoto, fullBodyPhoto] = await Promise.all([
      uploadToLocal(facePhotoUrl, 'faces'),
      uploadToLocal(fullBodyPhotoUrl, 'fullbody')
    ]);

    // A. Attach to an existing registered candidate directly
    if (id && source) {
      if (source === 'candidate') {
        const updated = await prisma.candidate.update({
          where: { id },
          data: { 
            videoUrl,
            facePhotoUrl: facePhoto || undefined,
            fullBodyPhotoUrl: fullBodyPhoto || undefined,
          },
        });
        return res.json({ success: true, message: 'Attached to Candidate profile', data: updated });
      } else if (source === 'quickRegistration') {
        // Safe database direct update
        await prisma.$executeRawUnsafe(
          'UPDATE `QuickRegistration` SET `videoUrl` = ? WHERE `id` = ?',
          videoUrl,
          id
        );
        return res.json({ success: true, message: 'Attached to QuickRegistration record' });
      }
    }

    // B. Pre-registration mode: save by Passport Number
    if (!passportNumber || !passportNumber.trim()) {
      return res.status(400).json({ error: 'Passport number is required for pre-registration' });
    }

    const cleanedPassportNumber = passportNumber.trim().toUpperCase();

    // Use upsert to create or update the video mapping by unique passport number
    const result = await prisma.preRegisteredVideo.upsert({
      where: { passportNumber: cleanedPassportNumber },
      update: { 
        videoUrl,
        facePhotoUrl: facePhoto || undefined,
        fullBodyPhotoUrl: fullBodyPhoto || undefined,
      },
      create: { 
        passportNumber: cleanedPassportNumber, 
        videoUrl,
        facePhotoUrl: facePhoto || null,
        fullBodyPhotoUrl: fullBodyPhoto || null,
      },
    });

    res.json({ success: true, message: 'Pre-registration video & photos saved successfully', data: result });
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
          videoUrl: matchingVideo.videoUrl,
          facePhotoUrl: matchingVideo.facePhotoUrl,
          fullBodyPhotoUrl: matchingVideo.fullBodyPhotoUrl,
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
          videoUrl: matchingVideo.videoUrl,
          facePhotoUrl: matchingVideo.facePhotoUrl,
          fullBodyPhotoUrl: matchingVideo.fullBodyPhotoUrl,
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
    const q = ((req.query.q as string) || '').trim();

    // Candidates with videoUrl
    const candidateWhere: any = { videoUrl: { not: null } };
    if (q) {
      candidateWhere.OR = [
        { givenNames: { contains: q } },
        { surname: { contains: q } },
        { passportNumber: { contains: q } },
      ];
    }
    const candidates = await prisma.candidate.findMany({
      where: candidateWhere,
      select: {
        id: true,
        givenNames: true,
        surname: true,
        passportNumber: true,
        nationality: true,
        videoUrl: true,
        facePhotoUrl: true,
        fullBodyPhotoUrl: true,
        registeredAt: true,
      },
      orderBy: { registeredAt: 'desc' },
    });

    // QuickRegistrations with videoUrl (fetched via raw SQL since videoUrl may not be in Prisma cache)
    let qrRows: any[] = [];
    try {
      if (q) {
        qrRows = await prisma.$queryRawUnsafe(
          `SELECT id, givenNames, surname, passportNumber, nationality, videoUrl, createdAt FROM \`QuickRegistration\` WHERE \`videoUrl\` IS NOT NULL AND \`videoUrl\` != '' AND (givenNames LIKE ? OR surname LIKE ? OR passportNumber LIKE ?) ORDER BY createdAt DESC`,
          `%${q}%`, `%${q}%`, `%${q}%`
        );
      } else {
        qrRows = await prisma.$queryRawUnsafe(
          `SELECT id, givenNames, surname, passportNumber, nationality, videoUrl, createdAt FROM \`QuickRegistration\` WHERE \`videoUrl\` IS NOT NULL AND \`videoUrl\` != '' ORDER BY createdAt DESC`
        );
      }
    } catch (_) { /* videoUrl column may not exist */ }

    // PreRegisteredVideo records (buffered)
    let preRegs: any[] = [];
    try {
      preRegs = await prisma.preRegisteredVideo.findMany({
        orderBy: { createdAt: 'desc' },
      });
      if (q) {
        const qUp = q.toUpperCase();
        preRegs = preRegs.filter((p: any) => (p.passportNumber || '').includes(qUp));
      }
    } catch (_) { /* table may not exist */ }

    const isYouTube = (url: string | null | undefined): boolean => {
      if (!url) return false;
      const lower = url.toLowerCase();
      return lower.includes('youtube.com') || lower.includes('youtu.be');
    };

    // Combine into a unified list, filtering only YouTube video urls
    const results = [
      ...candidates
        .filter((c: any) => isYouTube(c.videoUrl))
        .map((c: any) => ({
          id: c.id,
          fullName: `${c.givenNames} ${c.surname}`.trim().toUpperCase(),
          passportNumber: c.passportNumber || '',
          nationality: c.nationality || '',
          videoUrl: c.videoUrl,
          facePhotoUrl: c.facePhotoUrl || null,
          fullBodyPhotoUrl: c.fullBodyPhotoUrl || null,
          date: c.registeredAt?.toISOString() || '',
          source: 'candidate' as const,
        })),
      ...qrRows
        .filter((r: any) => isYouTube(r.videoUrl))
        .map((r: any) => ({
          id: r.id,
          fullName: `${r.givenNames || ''} ${r.surname || ''}`.trim().toUpperCase(),
          passportNumber: r.passportNumber || '',
          nationality: r.nationality || '',
          videoUrl: r.videoUrl,
          facePhotoUrl: null,
          fullBodyPhotoUrl: null,
          date: r.createdAt ? new Date(r.createdAt).toISOString() : '',
          source: 'quickRegistration' as const,
        })),
      ...preRegs
        .filter((p: any) => isYouTube(p.videoUrl))
        .map((p: any) => ({
          id: p.id,
          fullName: `PASSPORT: ${p.passportNumber || ''}`,
          passportNumber: p.passportNumber || '',
          nationality: '',
          videoUrl: p.videoUrl,
          facePhotoUrl: p.facePhotoUrl || null,
          fullBodyPhotoUrl: p.fullBodyPhotoUrl || null,
          date: p.createdAt ? new Date(p.createdAt).toISOString() : '',
          source: 'preRegistered' as const,
        })),
    ];

    // De-duplicate by videoUrl
    const seen = new Set<string>();
    const unique = results.filter(r => {
      if (seen.has(r.videoUrl)) return false;
      seen.add(r.videoUrl);
      return true;
    });

    res.json(unique);
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

    if (source === 'candidate') {
      await prisma.candidate.update({
        where: { id },
        data: { videoUrl },
      });
      return res.json({ success: true, message: 'Candidate video updated successfully' });
    } else if (source === 'quickRegistration') {
      await prisma.$executeRawUnsafe(
        'UPDATE `QuickRegistration` SET `videoUrl` = ? WHERE `id` = ?',
        videoUrl,
        id
      );
      return res.json({ success: true, message: 'Quick registration video updated successfully' });
    } else if (source === 'preRegistered') {
      await prisma.preRegisteredVideo.update({
        where: { id },
        data: { videoUrl },
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
