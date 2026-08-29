import { Router, Request, Response } from 'express';
import { db, notification as notificationTable } from '../db';
import { eq, desc } from 'drizzle-orm';

const router = Router();

// GET /api/notifications
router.get('/', async (req: Request, res: Response) => {
  try {
    const notifications = await db
      .select()
      .from(notificationTable)
      .orderBy(desc(notificationTable.createdAt))
      .limit(50);
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
      await db
        .update(notificationTable)
        .set({ isRead: true })
        .where(eq(notificationTable.isRead, false));
      return res.json({ success: true });
    }

    if (body.id) {
      await db
        .update(notificationTable)
        .set({ isRead: true })
        .where(eq(notificationTable.id, body.id));
      
      const [updated] = await db
        .select()
        .from(notificationTable)
        .where(eq(notificationTable.id, body.id));
      return res.json(updated);
    }

    res.status(400).json({ error: 'Invalid request' });
  } catch (error) {
    console.error('Error updating notification:', error);
    res.status(500).json({ error: 'Failed to update notification' });
  }
});

export default router;
