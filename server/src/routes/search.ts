import { Router, Request, Response } from 'express';
import { db, candidate as candidateTable } from '../db';
import { like, or } from 'drizzle-orm';

const router = Router();

// GET /api/search
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;
    if (!query) return res.json([]);

    const pattern = `%${query}%`;
    const candidates = await db
      .select()
      .from(candidateTable)
      .where(
        or(
          like(candidateTable.givenNames, pattern),
          like(candidateTable.surname, pattern),
          like(candidateTable.passportNumber, pattern),
          like(candidateTable.idNumber, pattern)
        )
      )
      .limit(10);

    res.json(candidates);
  } catch (error) {
    console.error('Search failed:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
