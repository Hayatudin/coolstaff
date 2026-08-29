import { Router, Request, Response } from 'express';
import { db, pool, leader as leaderTable, broker as brokerTable, generateId } from '../db';
import { eq } from 'drizzle-orm';

const router = Router();

// GET /api/leaders
router.get('/', async (req: Request, res: Response) => {
  try {
    const [leaders]: any = await pool.query('SELECT id, name, createdAt FROM Leader ORDER BY name ASC');
    const [brokers]: any = await pool.query('SELECT id, name, leaderId, createdAt FROM Broker ORDER BY name ASC');
    const [lockRows]: any = await pool.query('SELECT id, isLocked FROM Broker');

    const lockMap: Record<string, boolean> = {};
    (lockRows || []).forEach((row: any) => {
      lockMap[row.id] = row.isLocked === 1 || row.isLocked === true;
    });

    const [countRows]: any = await pool.query(
      'SELECT brokerId, COUNT(*) as count FROM Candidate WHERE brokerId IS NOT NULL GROUP BY brokerId'
    );
    const countMap: Record<string, number> = {};
    (countRows || []).forEach((row: any) => {
      if (row.brokerId) {
        countMap[row.brokerId] = Number(row.count);
      }
    });

    const augmented = (leaders || []).map((leader: any) => {
      const leaderBrokers = (brokers || [])
        .filter((b: any) => b.leaderId === leader.id)
        .map((b: any) => ({
          id: b.id,
          name: b.name,
          leaderId: b.leaderId,
          isLocked: lockMap[b.id] ?? false,
          createdAt: typeof b.createdAt === 'string' ? b.createdAt : b.createdAt.toISOString(),
          _count: {
            candidates: countMap[b.id] || 0
          }
        }));

      const totalCandidates = leaderBrokers.reduce(
        (sum: number, b: any) => sum + b._count.candidates,
        0
      );

      return {
        id: leader.id,
        name: leader.name,
        createdAt: typeof leader.createdAt === 'string' ? leader.createdAt : leader.createdAt.toISOString(),
        brokers: leaderBrokers,
        _count: {
          brokers: leaderBrokers.length
        },
        totalCandidates
      };
    });

    res.json(augmented);
  } catch (error: any) {
    console.error('Error fetching leaders:', error);
    res.status(500).json({
      error: 'Failed to fetch leaders',
      message: error?.message || String(error)
    });
  }
});

// POST /api/leaders
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Leader name is required' });
    }

    const id = 'cl' + generateId().slice(0, 23);

    await pool.query(
      'INSERT INTO Leader (id, name, createdAt) VALUES (?, ?, NOW(3))',
      [id, name.trim()]
    );

    const [rows]: any = await pool.query('SELECT id, name, createdAt FROM Leader WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      throw new Error('Failed to retrieve newly created leader');
    }

    const createdLeader = rows[0];

    res.json({
      id: createdLeader.id,
      name: createdLeader.name,
      createdAt: typeof createdLeader.createdAt === 'string' ? createdLeader.createdAt : createdLeader.createdAt.toISOString(),
      brokers: [],
      _count: { brokers: 0 },
      totalCandidates: 0
    });
  } catch (error: any) {
    console.error('Error creating leader:', error);
    if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
      return res.status(400).json({ error: 'A leader with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create leader' });
  }
});

// PATCH /api/leaders/:id
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { name } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Leader name is required' });
    }

    const [rows]: any = await pool.query('SELECT id FROM Leader WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Leader not found' });
    }

    await db.update(leaderTable).set({ name: name.trim() }).where(eq(leaderTable.id, id));

    res.json({ success: true, message: 'Leader name updated successfully' });
  } catch (error: any) {
    console.error('Failed to update leader name:', error);
    if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
      return res.status(400).json({ error: 'A leader with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update leader' });
  }
});

// DELETE /api/leaders/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const [rows]: any = await pool.query('SELECT id, name FROM Leader WHERE id = ?', [id]);
    if (!rows || rows.length === 0) {
      return res.status(404).json({ error: 'Leader not found' });
    }

    const leaderName = rows[0].name;

    await db.update(brokerTable).set({ leaderId: null }).where(eq(brokerTable.leaderId, id));
    await db.delete(leaderTable).where(eq(leaderTable.id, id));

    res.json({ success: true, message: `Leader "${leaderName}" deleted successfully` });
  } catch (error: any) {
    console.error('Failed to delete leader:', error);
    res.status(500).json({ error: error.message || 'Failed to delete leader' });
  }
});

export default router;
