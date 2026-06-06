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

// DELETE /api/brokers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reassignBrokerId } = req.body;

    // 1. Resolve and verify session
    let isSuperAdmin = false;
    try {
      const session = await getSession(req);

      if (session?.user?.role === 'super_admin') {
        isSuperAdmin = true;
      }
    } catch (sessionError) {
      console.error('Session verification failed in delete broker:', sessionError);
    }

    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Access denied: Only Super Admin can delete brokers' });
    }

    // 2. Check if broker exists
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

    // 3. Handle reassign/merge or disconnect
    if (reassignBrokerId && reassignBrokerId !== 'none') {
      // Reassign to another broker
      const targetBroker = await prisma.broker.findUnique({
        where: { id: reassignBrokerId }
      });
      if (!targetBroker) {
        return res.status(400).json({ error: 'Target broker for reassignment does not exist' });
      }

      // Reassign candidates
      await prisma.candidate.updateMany({
        where: { brokerId: id },
        data: { brokerId: reassignBrokerId }
      });

      // Reassign quick registrations
      await prisma.quickRegistration.updateMany({
        where: { brokerId: id },
        data: { brokerId: reassignBrokerId }
      });
    } else {
      // Disconnect - set brokerId to null
      await prisma.candidate.updateMany({
        where: { brokerId: id },
        data: { brokerId: null }
      });

      await prisma.quickRegistration.updateMany({
        where: { brokerId: id },
        data: { brokerId: null }
      });
    }

    // 4. Finally delete the broker
    await prisma.broker.delete({
      where: { id }
    });

    res.json({ success: true, message: 'Broker deleted and candidates reassigned/disconnected successfully' });
  } catch (error: any) {
    console.error('Failed to delete broker:', error);
    res.status(500).json({ error: error.message || 'Failed to delete broker' });
  }
});

// PATCH /api/brokers/:id/toggle-lock
router.patch('/:id/toggle-lock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // Verify session and role
    let userRole = '';
    let sessionDetails = 'No Session';
    try {
      const session = await getSession(req);
      if (session) {
        userRole = (session.user as any)?.role || '';
        sessionDetails = `User ID: ${session.user.id}, Role: ${userRole}`;
      } else {
        sessionDetails = `Session is null. Cookies present: ${req.headers.cookie ? 'Yes' : 'No'}`;
      }
    } catch (sessionError: any) {
      console.error('Session verification failed in toggle-lock:', sessionError);
      sessionDetails = `Error: ${sessionError.message || String(sessionError)}`;
    }

    if (userRole !== 'super_admin' && userRole !== 'accountant') {
      return res.status(403).json({ 
        error: `Access denied. Resolved Role: "${userRole}". Details: ${sessionDetails}` 
      });
    }

    // Find the broker
    const broker = await prisma.broker.findUnique({ where: { id } });
    if (!broker) {
      return res.status(404).json({ error: 'Broker not found' });
    }

    // Toggle the lock status
    const updated = await prisma.broker.update({
      where: { id },
      data: { isLocked: !broker.isLocked },
      include: {
        _count: { select: { candidates: true } }
      }
    });

    console.log(`[BROKER-LOCK] Broker "${updated.name}" ${updated.isLocked ? 'LOCKED' : 'UNLOCKED'} by ${userRole}`);

    res.json(updated);
  } catch (error: any) {
    console.error('Failed to toggle broker lock:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle broker lock' });
  }
});

export default router;
