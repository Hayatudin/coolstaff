import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getSession } from '../lib/auth-helper';


const router = Router();

// Helper: fetch isLocked values for all brokers via raw SQL
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
    console.warn('[BROKER] Could not fetch isLocked column via raw SQL, defaulting all to false:', e);
    return {};
  }
}

// Helper: fetch single broker isLocked via raw SQL
async function getBrokerIsLocked(id: string): Promise<boolean> {
  try {
    const rows = await prisma.$queryRawUnsafe<{ isLocked: number | boolean }[]>(
      'SELECT isLocked FROM Broker WHERE id = ?', id
    );
    if (rows.length === 0) return false;
    return rows[0].isLocked === 1 || rows[0].isLocked === true;
  } catch (e) {
    console.warn('[BROKER] Could not fetch isLocked for broker', id, e);
    return false;
  }
}

// Helper: set broker isLocked via raw SQL
async function setBrokerIsLocked(id: string, locked: boolean): Promise<void> {
  await prisma.$executeRawUnsafe(
    'UPDATE Broker SET isLocked = ? WHERE id = ?',
    locked ? 1 : 0,
    id
  );
}

// GET /api/brokers
router.get('/', async (req: Request, res: Response) => {
  try {
    const brokers = await prisma.broker.findMany({
      include: {
        candidates: {
          select: {
            id: true,
            givenNames: true,
            surname: true,
            passportNumber: true
          }
        },
        _count: {
          select: { candidates: true }
        }
      },
      orderBy: { name: 'asc' }
    });

    // Fetch leaders via raw SQL to bypass stale Prisma Client
    const leaders = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
      'SELECT id, name FROM Leader'
    );
    const leaderMap = new Map<string, { id: string; name: string }>();
    leaders.forEach(l => leaderMap.set(l.id, l));

    // Fetch leaderId values via raw SQL
    const brokerLeaders = await prisma.$queryRawUnsafe<{ id: string; leaderId: string | null }[]>(
      'SELECT id, leaderId FROM Broker'
    );
    const brokerLeaderIdMap: Record<string, string | null> = {};
    brokerLeaders.forEach(row => {
      brokerLeaderIdMap[row.id] = row.leaderId;
    });

    // Augment each broker with isLocked from raw SQL
    const lockMap = await getBrokerLockMap();
    const augmented = brokers.map((b: any) => {
      const leaderId = brokerLeaderIdMap[b.id] || null;
      const leader = leaderId ? leaderMap.get(leaderId) : null;
      return {
        ...b,
        leaderId,
        leader,
        isLocked: lockMap[b.id] ?? false,
      };
    });

    res.json(augmented);
  } catch (error: any) {
    console.error('Error fetching brokers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch brokers',
      message: error?.message || String(error),
      code: error?.code,
      meta: error?.meta,
      stack: error?.stack
    });
  }
});

// POST /api/brokers
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name } = req.body;
    
    if (!name) return res.status(400).json({ error: 'Broker name is required' });

    const broker = await prisma.broker.create({
      data: { name: name.trim() },
      include: {
        _count: {
          select: { candidates: true }
        }
      }
    });
    
    res.json(broker);
  } catch (error: any) {
    console.error('Error creating broker:', error);
    if (error.code === 'P2002') {
      return res.status(400).json({ error: 'A broker with this name already exists' });
    }
    res.status(500).json({ error: 'Failed to create broker. Please try again.' });
  }
});

// POST /api/brokers/move-candidates-bulk — Move specific candidates to another broker in bulk
router.post('/move-candidates-bulk', async (req: Request, res: Response) => {
  try {
    const { candidateIds, targetBrokerId } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'Candidate IDs array is required' });
    }

    if (!targetBrokerId) {
      return res.status(400).json({ error: 'Target broker ID is required' });
    }

    // Verify target broker exists
    const targetBroker = await prisma.broker.findUnique({ where: { id: targetBrokerId } });
    if (!targetBroker) {
      return res.status(404).json({ error: 'Target broker not found' });
    }

    // Move candidates
    const result = await prisma.candidate.updateMany({
      where: { id: { in: candidateIds } },
      data: { brokerId: targetBrokerId }
    });

    console.log(`[BROKER-MOVE-BULK] Moved ${result.count} candidate(s) to "${targetBroker.name}"`);

    res.json({
      success: true,
      movedCount: result.count,
      message: `Successfully moved ${result.count} candidate(s) to "${targetBroker.name}"`
    });
  } catch (error: any) {
    console.error('Failed to move candidates in bulk:', error);
    res.status(500).json({ error: error.message || 'Failed to move candidates' });
  }
});

// GET /api/brokers/:id/candidates
router.get('/:id/candidates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { search, interval, startDate, endDate } = req.query;

    let registeredAtFilter: any = {};
    if (interval && interval !== 'ALL') {
      const now = new Date();
      let from = new Date(now);
      if (interval === '1D') from.setDate(from.getDate() - 1);
      else if (interval === '1W') from.setDate(from.getDate() - 7);
      else if (interval === '1M') from.setMonth(from.getMonth() - 1);
      else if (interval === '1Y') from.setFullYear(from.getFullYear() - 1);
      registeredAtFilter.gte = from;
    }
    if (startDate) registeredAtFilter.gte = new Date(startDate as string);
    if (endDate) registeredAtFilter.lte = new Date(endDate as string);

    const searchFilter = search
      ? {
          OR: [
            { givenNames: { contains: search as string } },
            { surname: { contains: search as string } },
            { passportNumber: { contains: search as string } },
          ],
        }
      : {};

    const broker = await prisma.broker.findUnique({
      where: { id },
      include: {
        candidates: {
          where: {
            ...searchFilter,
            ...(Object.keys(registeredAtFilter).length > 0 ? { registeredAt: registeredAtFilter } : {}),
          },
          orderBy: { registeredAt: 'desc' },
          select: {
            id: true,
            givenNames: true,
            surname: true,
            passportNumber: true,
            job: true,
            facePhotoUrl: true,
            fullBodyPhotoUrl: true,
            isRequested: true,
            registeredAt: true,
            visaSelected: true,
            religion: true,
            isFlagged: true,
            medicalStatus: true,
            visaOrContractNumber: true,
            generatedCVs: {
              select: {
                id: true,
                templateId: true,
                facePhotoUrl: true,
                fullBodyPhotoUrl: true,
                createdAt: true,
              }
            }
          },
        },
      },
    });

    if (!broker) return res.status(404).json({ error: 'Broker not found' });

    // Augment with isLocked status via raw SQL
    const isLocked = await getBrokerIsLocked(id);

    // Fetch per-candidate isLocked via raw SQL
    let candidateIsLockedMap: Record<string, boolean> = {};
    try {
      const candidateIds = broker.candidates.map((c: any) => c.id);
      if (candidateIds.length > 0) {
        const placeholders = candidateIds.map(() => '?').join(',');
        const rows = await prisma.$queryRawUnsafe<{ id: string; isLocked: number | boolean }[]>(
          `SELECT id, isLocked FROM Candidate WHERE id IN (${placeholders})`,
          ...candidateIds
        );
        for (const row of rows) {
          candidateIsLockedMap[row.id] = row.isLocked === 1 || row.isLocked === true;
        }
      }
    } catch (_) { /* isLocked column may not exist yet */ }

    const augmentedBroker = {
      ...broker,
      isLocked,
      candidates: broker.candidates.map((c: any) => ({
        ...c,
        isLocked: candidateIsLockedMap[c.id] ?? false,
      })),
    };

    res.json(augmentedBroker);
  } catch (error) {
    console.error('Error fetching broker candidates:', error);
    res.status(500).json({ error: 'Failed to fetch broker candidates' });
  }
});

// POST /api/brokers/:id/move-candidates — Move all candidates to another broker
router.post('/:id/move-candidates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetBrokerId } = req.body;

    if (!targetBrokerId) {
      return res.status(400).json({ error: 'Target broker ID is required' });
    }

    if (id === targetBrokerId) {
      return res.status(400).json({ error: 'Cannot move candidates to the same broker' });
    }

    // Verify source broker exists
    const sourceBroker = await prisma.broker.findUnique({
      where: { id },
      include: { _count: { select: { candidates: true } } }
    });
    if (!sourceBroker) {
      return res.status(404).json({ error: 'Source broker not found' });
    }

    // Verify target broker exists
    const targetBroker = await prisma.broker.findUnique({ where: { id: targetBrokerId } });
    if (!targetBroker) {
      return res.status(404).json({ error: 'Target broker not found' });
    }

    // Move all candidates
    const result = await prisma.candidate.updateMany({
      where: { brokerId: id },
      data: { brokerId: targetBrokerId }
    });

    // Also move quick registrations
    await prisma.quickRegistration.updateMany({
      where: { brokerId: id },
      data: { brokerId: targetBrokerId }
    });

    console.log(`[BROKER-MOVE] Moved ${result.count} candidates from "${sourceBroker.name}" to "${targetBroker.name}"`);

    res.json({
      success: true,
      movedCount: result.count,
      message: `Successfully moved ${result.count} candidate(s) from "${sourceBroker.name}" to "${targetBroker.name}"`
    });
  } catch (error: any) {
    console.error('Failed to move candidates:', error);
    res.status(500).json({ error: error.message || 'Failed to move candidates' });
  }
});

// DELETE /api/brokers/:id — Delete broker directly
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Check if broker exists
    const broker = await prisma.broker.findUnique({
      where: { id },
      include: {
        _count: {
          select: { candidates: true, quickRegistrations: true }
        }
      }
    });

    if (!broker) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    // Disconnect all candidates (set brokerId to null)
    await prisma.candidate.updateMany({
      where: { brokerId: id },
      data: { brokerId: null }
    });

    // Disconnect all quick registrations
    await prisma.quickRegistration.updateMany({
      where: { brokerId: id },
      data: { brokerId: null }
    });

    // Delete the broker
    await prisma.broker.delete({
      where: { id }
    });

    console.log(`[BROKER-DELETE] Broker "${broker.name}" deleted. ${broker._count.candidates} candidates disconnected.`);

    res.json({ success: true, message: `Broker "${broker.name}" deleted successfully` });
  } catch (error: any) {
    console.error('Failed to delete broker:', error);
    res.status(500).json({ error: error.message || 'Failed to delete broker' });
  }
});

// PATCH /api/brokers/:id/toggle-lock — Lock/Unlock broker (hides/shows CVs)
router.patch('/:id/toggle-lock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Find the broker
    const broker = await prisma.broker.findUnique({ where: { id } });
    if (!broker) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    const currentLockState = await getBrokerIsLocked(id);
    const newLockState = !currentLockState;

    // Toggle the lock status using raw SQL
    await setBrokerIsLocked(id, newLockState);

    // Re-fetch to get candidate count and name cleanly
    const updated = await prisma.broker.findUnique({
      where: { id },
      include: {
        _count: { select: { candidates: true } }
      }
    });

    if (!updated) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    const responseObj = {
      ...updated,
      isLocked: newLockState
    };

    console.log(`[BROKER-LOCK] Broker "${updated.name}" ${newLockState ? 'LOCKED' : 'UNLOCKED'}`);

    res.json(responseObj);
  } catch (error: any) {
    console.error('Failed to toggle broker lock:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle broker lock' });
  }
});

// POST /api/brokers/move-bulk — Move multiple brokers to a leader
router.post('/move-bulk', async (req: Request, res: Response) => {
  try {
    const { brokerIds, leaderId } = req.body; // leaderId can be string or null

    if (!brokerIds || !Array.isArray(brokerIds) || brokerIds.length === 0) {
      return res.status(400).json({ error: 'Broker IDs array is required' });
    }

    // If leaderId is provided, verify it exists
    if (leaderId !== null && leaderId !== undefined && leaderId !== '') {
      const leaderRows = await prisma.$queryRawUnsafe<{ id: string }[]>(
        'SELECT id FROM Leader WHERE id = ?',
        leaderId
      );
      if (leaderRows.length === 0) {
        return res.status(404).json({ error: 'Target leader not found' });
      }
    }

    // Update the leaderId of all specified brokers via raw SQL
    const placeholders = brokerIds.map(() => '?').join(',');
    await prisma.$executeRawUnsafe(
      `UPDATE Broker SET leaderId = ? WHERE id IN (${placeholders})`,
      leaderId || null,
      ...brokerIds
    );

    console.log(`[BROKER-MOVE-BULK] Moved ${brokerIds.length} brokers to leader: ${leaderId || 'None'}`);

    res.json({ success: true, movedCount: brokerIds.length });
  } catch (error: any) {
    console.error('Failed to move brokers in bulk via raw SQL:', error);
    res.status(500).json({ error: error.message || 'Failed to move brokers in bulk' });
  }
});

// PATCH /api/brokers/:id/leader — Assign or change broker's leader
router.patch('/:id/leader', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { leaderId } = req.body; // Can be string or null

    // Find the broker using raw SQL to be safe
    const brokerRows = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
      'SELECT id, name FROM Broker WHERE id = ?',
      id
    );
    if (brokerRows.length === 0) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    const brokerName = brokerRows[0].name;

    // If leaderId is provided, make sure the leader exists
    if (leaderId !== null && leaderId !== undefined && leaderId !== '') {
      const leaderRows = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
        'SELECT id, name FROM Leader WHERE id = ?',
        leaderId
      );
      if (leaderRows.length === 0) {
        return res.status(404).json({ error: 'Target leader not found' });
      }
    }

    // Update the broker's leaderId via raw SQL
    await prisma.$executeRawUnsafe(
      'UPDATE Broker SET leaderId = ? WHERE id = ?',
      leaderId || null,
      id
    );

    // Fetch broker count and info cleanly from Prisma (relation-free models)
    const updated = await prisma.broker.findUnique({
      where: { id },
      include: {
        _count: {
          select: { candidates: true }
        }
      }
    });

    if (!updated) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    // Fetch leader details using raw SQL
    let leaderObj = null;
    if (leaderId) {
      const leaderRows = await prisma.$queryRawUnsafe<{ id: string; name: string }[]>(
        'SELECT id, name FROM Leader WHERE id = ?',
        leaderId
      );
      if (leaderRows.length > 0) {
        leaderObj = leaderRows[0];
      }
    }

    const responseObj = {
      ...updated,
      leaderId: leaderId || null,
      leader: leaderObj
    };

    console.log(`[BROKER-LEADER] Moved broker "${brokerName}" to leader: ${leaderObj?.name || 'None'}`);

    res.json(responseObj);
  } catch (error: any) {
    console.error('Failed to update broker leader via raw SQL:', error);
    res.status(500).json({ error: error.message || 'Failed to update broker leader' });
  }
});

export default router;
