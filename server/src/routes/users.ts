import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../lib/prisma';
import { auth } from '../lib/auth';

const router = Router();

// Middleware to guard super_admin routes
const requireSuperAdmin = async (req: Request | any, res: Response, next: NextFunction) => {
  // In a real app, we would verify the session here.
  // For now, mirroring the "temporary bypass" from the original code
  req.user = { role: 'super_admin' };
  next();
};

// GET /api/users/analytics
router.get('/analytics', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });

    const candidateCountMap: Record<string, number> = {};
    try {
      // Use raw SQL to bypass stale Prisma Client generator issues on VPS
      const candidateCounts: any[] = await prisma.$queryRawUnsafe(
        'SELECT `registeredById`, COUNT(`id`) as `count` FROM `Candidate` WHERE `registeredById` IS NOT NULL GROUP BY `registeredById`'
      );
      candidateCounts.forEach((c) => {
        if (c.registeredById) {
          candidateCountMap[c.registeredById] = Number(c.count);
        }
      });
    } catch (e: any) {
      console.warn('[ANALYTICS] Failed to fetch candidate counts via raw SQL, trying Prisma fallback:', e.message || e);
      try {
        const candidateCounts = await prisma.candidate.groupBy({
          by: ['registeredById'],
          _count: { id: true },
          where: { registeredById: { not: null } },
        });
        candidateCounts.forEach((c) => {
          if (c.registeredById) {
            candidateCountMap[c.registeredById] = c._count.id;
          }
        });
      } catch (fallbackErr) {
        console.error('[ANALYTICS] Candidate count fallback also failed:', fallbackErr);
      }
    }

    const quickCountMap: Record<string, number> = {};
    try {
      // Use raw SQL to bypass stale Prisma Client generator issues on VPS
      const quickRegistrationCounts: any[] = await prisma.$queryRawUnsafe(
        'SELECT `registeredById`, COUNT(`id`) as `count` FROM `QuickRegistration` WHERE `registeredById` IS NOT NULL GROUP BY `registeredById`'
      );
      quickRegistrationCounts.forEach((q) => {
        if (q.registeredById) {
          quickCountMap[q.registeredById] = Number(q.count);
        }
      });
    } catch (e: any) {
      console.warn('[ANALYTICS] Failed to fetch quick registration counts via raw SQL, trying Prisma fallback:', e.message || e);
      try {
        const quickRegistrationCounts = await prisma.quickRegistration.groupBy({
          by: ['registeredById'],
          _count: { id: true },
          where: { registeredById: { not: null } },
        });
        quickRegistrationCounts.forEach((q) => {
          if (q.registeredById) {
            quickCountMap[q.registeredById] = q._count.id;
          }
        });
      } catch (fallbackErr) {
        console.error('[ANALYTICS] Quick registration count fallback also failed:', fallbackErr);
      }
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
    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        agency: true,
        emailVerified: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(users);
  } catch (error) {
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

    const VALID_ROLES = ['user', 'super_admin', 'agency', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader'];
    const assignedRole = VALID_ROLES.includes(role) ? role : 'user';

    // Use Better Auth's sign-up API
    const authRes: any = await auth.api.signUpEmail({
      body: { name, email, password },
    });

    if (!authRes?.user?.id) {
      return res.status(500).json({ error: 'Failed to create user' });
    }

    await prisma.user.update({
      where: { id: authRes.user.id },
      data: { 
        role: assignedRole,
        agency: assignedRole === 'agency' ? agency : null
      },
    });

    res.status(201).json({ success: true, userId: authRes.user.id });
  } catch (err: any) {
    res.status(400).json({ error: err.message ?? 'Failed to create user' });
  }
});

// PATCH /api/users/:id
router.patch('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role, agency } = req.body;

    const VALID_ROLES = ['user', 'super_admin', 'agency', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader'];
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

    const updated = await prisma.user.update({
      where: { id },
      data: updateData,
    });

    res.json(updated);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// DELETE /api/users/:id
router.delete('/:id', requireSuperAdmin, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // req.user.id would come from session if we weren't bypassing
    // if (req.user.id === id) return res.status(400).json({ error: 'You cannot delete your own account' });

    await prisma.user.delete({ where: { id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

export default router;
