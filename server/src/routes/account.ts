import { Router, Request, Response } from 'express';
import { db, user as userTable } from '../db';
import { eq } from 'drizzle-orm';
import { auth } from '../lib/auth';

const router = Router();

// Helper to get session in Express
const getSession = async (req: Request) => {
  return await auth.api.getSession({
    headers: req.headers as any,
  });
};

// PATCH /api/account/profile
router.patch('/profile', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Name is required' });

    await db.update(userTable).set({ name }).where(eq(userTable.id, session.user.id));
    const [updatedUser] = await db.select().from(userTable).where(eq(userTable.id, session.user.id));

    res.json(updatedUser);
  } catch (error: any) {
    console.error('[PROFILE_UPDATE_ERROR]', error);
    res.status(500).json({ error: error.message || 'Failed to update profile' });
  }
});

// POST /api/account/password
router.post('/password', async (req: Request, res: Response) => {
  try {
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ error: 'Current and new passwords are required' });
    }

    try {
      await auth.api.changePassword({
        body: {
          currentPassword,
          newPassword,
          revokeOtherSessions: true,
        },
        headers: req.headers as any,
      });
      
      res.json({ success: true });
    } catch (authError: any) {
      console.error('[AUTH_CHANGE_PASSWORD_ERROR]', authError);
      return res.status(401).json({ error: authError.message || 'Unauthorized or invalid password' });
    }
  } catch (error: any) {
    console.error('[PASSWORD_UPDATE_ERROR]', error);
    res.status(400).json({ error: error.message || 'Failed to change password' });
  }
});

export default router;
