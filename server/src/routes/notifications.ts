import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';

const router = Router();

// GET /api/notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await prisma.notification.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

// PATCH /api/notifications
router.patch('/', async (req: Request, res: Response) => {
  try {
    const body = req.body;
    
    if (body.markAllRead) {
      await prisma.notification.updateMany({
        where: { isRead: false },
        data: { isRead: true },
      });
      return res.json({ success: true });
    }

    if (body.id) {
      const notification = await prisma.notification.update({
        where: { id: body.id },
        data: { isRead: true },
      });
      return res.json(notification);
    }

    res.status(400).json({ error: 'Invalid request' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
