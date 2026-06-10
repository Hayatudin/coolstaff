import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/leaders
router.get('/', async (req: Request, res: Response) => {
  try {
    // 1. Fetch all leaders via raw SQL
    const leaders = await prisma.$queryRawUnsafe<{ id: string; name: string; createdAt: string | Date }[]>(
      'SELECT id, name, createdAt FROM Leader ORDER BY name ASC'
    );

    // 2. Fetch all brokers via raw SQL
    const brokers = await prisma.$queryRawUnsafe<{ id: string; name: string; leaderId: string | null; createdAt: string | Date }[]>(
      'SELECT id, name, leaderId, createdAt FROM Broker ORDER BY name ASC'
    );

    // 3. Fetch isLocked lock map via raw SQL
    const lockRows = await prisma.$queryRawUnsafe<{ id: string; isLocked: number | boolean }[]>(
      'SELECT id, isLocked FROM Broker'
    );
    const lockMap: Record<string, boolean> = {};
    lockRows.forEach(row => {
      lockMap[row.id] = row.isLocked === 1 || row.isLocked === true;
    });

    // 4. Fetch candidate counts per broker via raw SQL
    const countRows = await prisma.$queryRawUnsafe<{ brokerId: string; count: number }[]>(
      'SELECT brokerId, COUNT(*) as count FROM Candidate WHERE brokerId IS NOT NULL GROUP BY brokerId'
    );
    const countMap: Record<string, number> = {};
    countRows.forEach(row => {
      if (row.brokerId) {
        countMap[row.brokerId] = Number(row.count);
      }
    });

    // 5. Augment and group brokers in memory
    const augmented = leaders.map((leader: any) => {
      const leaderBrokers = brokers
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
    console.error('Error fetching leaders via raw SQL:', error);
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

    // Generate CUID-like ID manually: cl + 23 alphanumeric characters = 25 chars
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let randomPart = '';
    for (let i = 0; i < 23; i++) {
      randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    const id = 'cl' + randomPart;

    // Insert leader using raw SQL
    await prisma.$executeRawUnsafe(
      'INSERT INTO Leader (id, name, createdAt) VALUES (?, ?, NOW(3))',
      id,
      name.trim()
    );

    // Fetch back the created record
    const rows = await prisma.$queryRawUnsafe<{ id: string; name: string; createdAt: string | Date }[]>(
      'SELECT id, name, createdAt FROM Leader WHERE id = ?',
      id
    );

    if (rows.length === 0) {
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
    console.error('Error creating leader via raw SQL:', error);
    if (error.code === 'P2002' || error.message?.includes('Duplicate entry')) {
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

    // Check if leader exists via raw SQL
    const rows = await prisma.$queryRawUnsafe<{ id: string }[]>(
      'SELECT id FROM Leader WHERE id = ?',
      id
    );
    if (rows.length === 0) {
      return res.status(404).json({ error: 'Leader not found' });
    }

    // Update name using raw SQL to bypass Prisma client limitations on custom schemas
    await prisma.$executeRawUnsafe(
      'UPDATE Leader SET name = ? WHERE id = ?',
      name.trim(),
      id
    );

    res.json({ success: true, message: 'Leader name updated successfully' });
  } catch (error: any) {
    console.error('Failed to update leader name via raw SQL:', error);
    if (error.code === 'P2002' || error.message?.includes('Duplicate entry')) {
      return res.status(400).json({ error: 'A leader with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to update leader' });
  }
});

// DELETE /api/leaders/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if leader exists via raw SQL
    const rows = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
      'SELECT id, name FROM Leader WHERE id = ?',
      id
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Leader not found' });
    }

    const leaderName = rows[0].name;

    // Set leaderId = null for all brokers under this leader via raw SQL
    await prisma.$executeRawUnsafe(
      'UPDATE Broker SET leaderId = NULL WHERE leaderId = ?',
      id
    );

    // Delete leader via raw SQL
    await prisma.$executeRawUnsafe(
      'DELETE FROM Leader WHERE id = ?',
      id
    );

    res.json({ success: true, message: `Leader "${leaderName}" deleted successfully` });
  } catch (error: any) {
    console.error('Failed to delete leader via raw SQL:', error);
    res.status(500).json({ error: error.message || 'Failed to delete leader' });
  }
});

export default router;
