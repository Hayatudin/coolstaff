import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getSession } from '../lib/auth-helper';


const router = Router();

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

    res.json(brokers);
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

    res.json(broker);
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

    const newLockState = !broker.isLocked;

    // Toggle the lock status
    const updated = await prisma.broker.update({
      where: { id },
      data: { isLocked: newLockState },
      include: {
        _count: { select: { candidates: true } }
      }
    });

    console.log(`[BROKER-LOCK] Broker "${updated.name}" ${updated.isLocked ? 'LOCKED' : 'UNLOCKED'}`);

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to toggle broker lock:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle broker lock' });
  }
});

export default router;
