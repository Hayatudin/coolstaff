import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/settings/prices
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const rawRows = await prisma.$queryRawUnsafe<any[]>(
      `SELECT templateId, price, updatedAt FROM \`TemplatePrice\``
    );
    res.json(rawRows);
  } catch (error) {
    // If table doesn't exist yet, return empty array
    res.json([]);
  }
});

// POST /api/settings/prices
router.post('/prices', async (req: Request, res: Response) => {
  try {
    const { prices } = req.body; // Expecting { prices: { templateId: 'price', ... } }

    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ error: 'Invalid prices payload' });
    }

    for (const [templateId, price] of Object.entries(prices)) {
      if (typeof price !== 'string' && typeof price !== 'number') continue;
      const formattedPrice = String(price).trim();
      
      // Upsert logic using raw SQL
      await prisma.$executeRawUnsafe(
        `INSERT INTO \`TemplatePrice\` (templateId, price, updatedAt) 
         VALUES (?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE price = ?, updatedAt = NOW()`,
        templateId,
        formattedPrice,
        formattedPrice
      );
    }

    res.json({ success: true, message: 'Prices updated successfully' });
  } catch (error: any) {
    console.error('Failed to update template prices:', error);
    res.status(500).json({ error: error.message || 'Failed to update prices' });
  }
});

export default router;
