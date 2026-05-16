import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

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
  } catch (error) {
    console.error('Error fetching brokers:', error);
    res.status(500).json({ error: 'Failed to fetch brokers' });
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
            isRequested: true,
            registeredAt: true,
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

export default router;
