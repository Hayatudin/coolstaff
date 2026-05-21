import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

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
    const { id, source, fullName, videoUrl } = req.body;

    if (!videoUrl) {
      return res.status(400).json({ error: 'Video URL is required' });
    }

    // A. Attach to an existing registered candidate directly
    if (id && source) {
      if (source === 'candidate') {
        const updated = await prisma.candidate.update({
          where: { id },
          data: { videoUrl },
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

    // B. Pre-registration mode: save by Full Name
    if (!fullName || !fullName.trim()) {
      return res.status(400).json({ error: 'Full name is required for pre-registration' });
    }

    const cleanedFullName = fullName.trim().toUpperCase();

    // Use upsert to create or update the video mapping by unique full name
    const result = await prisma.preRegisteredVideo.upsert({
      where: { fullName: cleanedFullName },
      update: { videoUrl },
      create: { fullName: cleanedFullName, videoUrl },
    });

    res.json({ success: true, message: 'Pre-registration video link saved successfully', data: result });
  } catch (error: any) {
    console.error('Error saving video upload record:', error);
    res.status(500).json({ error: error.message || 'Failed to save video record' });
  }
});

// 3. GET /api/video-uploads/match?givenNames=...&surname=...
router.get('/match', async (req: Request, res: Response) => {
  try {
    const givenNames = (req.query.givenNames as string || '').trim().toUpperCase();
    const surname = (req.query.surname as string || '').trim().toUpperCase();

    if (!givenNames && !surname) {
      return res.json({ matchFound: false });
    }

    const fullCombined = `${givenNames} ${surname}`.trim();
    const normalizedTarget = normalizeName(fullCombined);

    // Fetch all buffered videos from database to do dynamic fuzzy/normalized space-collapsed name-matching
    const preRegistered = await prisma.preRegisteredVideo.findMany();

    // Find a match where the normalized forms (ignoring all spaces/special chars) match
    const matchingVideo = preRegistered.find(item => {
      const normalizedItemName = normalizeName(item.fullName);
      
      // Exact match after normalization or if one contains the other
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
        matchedName: matchingVideo.fullName,
      });
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
        preRegs = preRegs.filter((p: any) => p.fullName.includes(qUp));
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
          date: r.createdAt ? new Date(r.createdAt).toISOString() : '',
          source: 'quickRegistration' as const,
        })),
      ...preRegs
        .filter((p: any) => isYouTube(p.videoUrl))
        .map((p: any) => ({
          id: p.id,
          fullName: p.fullName || '',
          passportNumber: '',
          nationality: '',
          videoUrl: p.videoUrl,
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
