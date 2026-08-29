import { Router, Request, Response } from 'express';
import { pool } from '../db';

const router = Router();

// GET /api/settings/prices
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const [rawRows]: any = await pool.query(
      `SELECT templateId, price, updatedAt FROM \`TemplatePrice\``
    );
    res.json(rawRows || []);
  } catch (error) {
    res.json([]);
  }
});

// POST /api/settings/prices
router.post('/prices', async (req: Request, res: Response) => {
  try {
    const { prices } = req.body;

    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ error: 'Invalid prices payload' });
    }

    for (const [templateId, price] of Object.entries(prices)) {
      if (typeof price !== 'string' && typeof price !== 'number') continue;
      const formattedPrice = String(price).trim();
      
      await pool.query(
        `INSERT INTO \`TemplatePrice\` (templateId, price, updatedAt) 
         VALUES (?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE price = VALUES(price), updatedAt = NOW()`,
        [templateId, formattedPrice]
      );
    }

    res.json({ success: true, message: 'Prices updated successfully' });
  } catch (error: any) {
    console.error('Failed to update template prices:', error);
    res.status(500).json({ error: error.message || 'Failed to update prices' });
  }
});

export default router;
