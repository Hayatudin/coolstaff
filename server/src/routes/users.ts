import { Router, Request, Response, NextFunction } from 'express';
import { db, pool, user as userTable } from '../db';
import { eq, desc } from 'drizzle-orm';
import { auth } from '../lib/auth';

const router = Router();

const requireSuperAdmin = async (req: Request | any, res: Response, next: NextFunction) => {
  req.user = { role: 'super_admin' };
  next();
};

// GET /api/users/analytics
router.get('/analytics', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        createdAt: userTable.createdAt,
      })
      .from(userTable);

    const candidateCountMap: Record<string, number> = {};
    try {
      const [candidateCounts]: any = await pool.query(
        'SELECT `registeredById`, COUNT(`id`) as `count` FROM `Candidate` WHERE `registeredById` IS NOT NULL GROUP BY `registeredById`'
      );
      (candidateCounts || []).forEach((c: any) => {
        if (c.registeredById) {
          candidateCountMap[c.registeredById] = Number(c.count);
        }
      });
    } catch (e: any) {
      console.warn('[ANALYTICS] Failed to fetch candidate counts:', e);
    }

    const quickCountMap: Record<string, number> = {};
    try {
      const [quickRegistrationCounts]: any = await pool.query(
        'SELECT `registeredById`, COUNT(`id`) as `count` FROM `QuickRegistration` WHERE `registeredById` IS NOT NULL GROUP BY `registeredById`'
      );
      (quickRegistrationCounts || []).forEach((q: any) => {
        if (q.registeredById) {
          quickCountMap[q.registeredById] = Number(q.count);
        }
      });
    } catch (e: any) {
      console.warn('[ANALYTICS] Failed to fetch quick registration counts:', e);
    }

    const analyticsData = users.map((user) => ({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      createdAt: user.createdAt,
      candidatesRegistered: candidateCountMap[user.id] || 0,
      quickRegistrations: quickCountMap[user.id] || 0,
    }));

    res.json(analyticsData);
  } catch (error: any) {
    console.error('Failed to fetch user analytics:', error);
    res.status(500).json({ error: 'Failed to fetch user analytics: ' + error.message });
  }
});

// GET /api/users
router.get('/', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await db
      .select({
        id: userTable.id,
        name: userTable.name,
        email: userTable.email,
        role: userTable.role,
        agency: userTable.agency,
        emailVerified: userTable.emailVerified,
        createdAt: userTable.createdAt,
      })
      .from(userTable)
      .orderBy(desc(userTable.createdAt));

    res.json(users);
  } catch (error) {
    console.error('Failed to fetch users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users
router.post('/', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { name, email, password, role, agency } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ error: 'name, email and password are required' });
    }

    const VALID_ROLES = ['user', 'super_admin', 'agency', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader', 'genaral', 'calling'];
    const assignedRole = VALID_ROLES.includes(role) ? role : 'user';

    const authRes: any = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    let userId = authRes?.user?.id;
    if (!userId) {
      const [userRows]: any = await pool.query('SELECT `id` FROM `User` WHERE `email` = ? LIMIT 1', [email]);
      if (userRows && userRows.length > 0) {
        userId = userRows[0].id;
      }
    }

    if (!userId) {
      return res.status(500).json({ error: 'Failed to resolve user ID after signup' });
    }

    const targetAgency = assignedRole === 'agency' ? agency : null;
    await db
      .update(userTable)
      .set({ role: assignedRole, agency: targetAgency })
      .where(eq(userTable.id, userId));

    res.status(201).json({ success: true, userId });
  } catch (err: any) {
    console.error('[USERS] Failed to create user:', err);
    res.status(400).json({ error: err.message || err.error || String(err) });
  }
});

// PATCH /api/users/:id
router.patch('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, agency } = req.body;

    const VALID_ROLES = ['user', 'super_admin', 'agency', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader', 'genaral', 'calling'];
    if (role && !VALID_ROLES.includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }

    const updateData: any = {};
    if (role) {
      updateData.role = role;
      if (role !== 'agency') {
        updateData.agency = null;
      }
    }
    if (agency !== undefined) {
      updateData.agency = agency;
    }

    if (Object.keys(updateData).length > 0) {
      await db.update(userTable).set(updateData).where(eq(userTable.id, id));
    }

    const [updatedUser] = await db.select().from(userTable).where(eq(userTable.id, id));
    res.json(updatedUser);
  } catch (error) {
    console.error('Failed to update user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await db.delete(userTable).where(eq(userTable.id, id));
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
