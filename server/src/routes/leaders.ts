import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// Helper: fetch isLocked values for all brokers via raw SQL (fail-safe)
async function getBrokerLockMap(): Promise<Record<string, boolean>> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ id: string; isLocked: number | boolean }[]>(
      'SELECT id, isLocked FROM Broker'
    );
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      map[row.id] = row.isLocked === 1 || row.isLocked === true;
    }
    return map;
  } catch (e) {
    return {};
  }
}

// GET /api/leaders
router.get('/', async (req: Request, res: Response) => {
  try {
    const leaders = await prisma.leader.findMany({
      include: {
        brokers: {
          include: {
            _count: {
              select: { candidates: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });

    const lockMap = await getBrokerLockMap();

    const augmented = leaders.map((leader: any) => {
      const totalCandidates = leader.brokers.reduce(
        (sum: number, b: any) => sum + (b._count?.candidates || 0),
        0
      );

      return {
        id: leader.id,
        name: leader.name,
        createdAt: leader.createdAt,
        brokers: leader.brokers.map((b: any) => ({
          id: b.id,
          name: b.name,
          isLocked: lockMap[b.id] ?? (b.isLocked === 1 || b.isLocked === true),
          createdAt: b.createdAt,
          _count: b._count
        })),
        _count: {
          brokers: leader.brokers.length
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

    const leader = await prisma.leader.create({
      data: { name: name.trim() },
      include: {
        brokers: true
      }
    });

    res.json({
      ...leader,
      _count: { brokers: 0 },
      totalCandidates: 0
    });
  } catch (error: any) {
    console.error('Error creating leader:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A leader with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create leader' });
  }
});

// DELETE /api/leaders/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify leader exists
    const leader = await prisma.leader.findUnique({
      where: { id }
    });

    if (!leader) {
      return res.status(404).json({ error: 'Leader not found' });
    }

    // Set leaderId = null for all brokers under this leader (redundancy fallback)
    await prisma.broker.updateMany({
      where: { leaderId: id },
      data: { leaderId: null }
    });

    // Delete leader
    await prisma.leader.delete({
      where: { id }
    });

    res.json({ success: true, message: `Leader "${leader.name}" deleted successfully` });
  } catch (error: any) {
    console.error('Failed to delete leader:', error);
    res.status(500).json({ error: error.message || 'Failed to delete leader' });
  }
});

export default router;
