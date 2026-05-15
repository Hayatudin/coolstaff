import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/search
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.json([]);

    const candidates = await prisma.candidate.findMany({
      where: {
        OR: [
          { givenNames: { contains: query } },
          { surname: { contains: query } },
          { passportNumber: { contains: query } },
          { idNumber: { contains: query } },
        ],
      },
      take: 10,
    });

    res.json(candidates);
  } catch (error) {
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
