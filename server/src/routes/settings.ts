import { Router, Request, Response } from 'express';
import { pool } from '../db';
import { getSession } from '../lib/auth-helper';

const router = Router();

// Helper to verify super admin role
async function checkSuperAdmin(req: Request): Promise<boolean> {
  try {
    const session = await getSession(req);
    const userRole = (session?.user as any)?.role;
    if (userRole === 'super_admin') return true;

    // Upstream middleware check
    if ((req as any).user?.role === 'super_admin') return true;

    return false;
  } catch (err) {
    console.warn('[SETTINGS] Error verifying super_admin session:', err);
    return false;
  }
}

// GET /api/settings/prices
router.get('/prices', async (req: Request, res: Response) => {
  try {
    const [rawRows]: any = await pool.query(
      `SELECT templateId, price, updatedAt FROM \`TemplatePrice\``
    );
    res.json(rawRows || []);
  } catch (error) {
    res.json([]);
  }
});

// POST /api/settings/prices
router.post('/prices', async (req: Request, res: Response) => {
  try {
    const { prices } = req.body;

    if (!prices || typeof prices !== 'object') {
      return res.status(400).json({ error: 'Invalid prices payload' });
    }

    for (const [templateId, price] of Object.entries(prices)) {
      if (typeof price !== 'string' && typeof price !== 'number') continue;
      const formattedPrice = String(price).trim();
      
      await pool.query(
        `INSERT INTO \`TemplatePrice\` (templateId, price, updatedAt) 
         VALUES (?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE price = VALUES(price), updatedAt = NOW()`,
        [templateId, formattedPrice]
      );
    }

    res.json({ success: true, message: 'Prices updated successfully' });
  } catch (error: any) {
    console.error('Failed to update template prices:', error);
    res.status(500).json({ error: error.message || 'Failed to update prices' });
  }
});

// GET /api/settings/role-permissions
// Returns stored role permissions from MySQL
router.get('/role-permissions', async (req: Request, res: Response) => {
  try {
    const [rawRows]: any = await pool.query(
      'SELECT `role`, `allowedRoutes`, `updatedAt` FROM `RolePermission`'
    );
    const permissions: Record<string, string[]> = {};
    if (Array.isArray(rawRows)) {
      for (const row of rawRows) {
        let routes: string[] = [];
        if (typeof row.allowedRoutes === 'string') {
          try {
            routes = JSON.parse(row.allowedRoutes);
          } catch {
            routes = [];
          }
        } else if (Array.isArray(row.allowedRoutes)) {
          routes = row.allowedRoutes;
        }
        permissions[row.role] = routes;
      }
    }
    res.json({ permissions });
  } catch (error: any) {
    console.error('Failed to get role permissions:', error);
    res.json({ permissions: {} });
  }
});

// PUT /api/settings/role-permissions
// Super admins only: updates allowed routes for roles
router.put('/role-permissions', async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = await checkSuperAdmin(req);
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Super admin privileges required' });
    }

    const { permissions, role, allowedRoutes } = req.body;

    // Batch update multiple roles
    if (permissions && typeof permissions === 'object') {
      for (const [r, routes] of Object.entries(permissions)) {
        if (!Array.isArray(routes)) continue;
        // Super admin permissions cannot be restricted to avoid lockout
        if (r === 'super_admin') continue;

        const jsonStr = JSON.stringify(routes);
        await pool.query(
          `INSERT INTO \`RolePermission\` (\`role\`, \`allowedRoutes\`, \`updatedAt\`)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE \`allowedRoutes\` = VALUES(\`allowedRoutes\`), \`updatedAt\` = NOW()`,
          [r, jsonStr]
        );
      }
      return res.json({ success: true, message: 'Role permissions updated successfully' });
    }

    // Single role update
    if (role && Array.isArray(allowedRoutes)) {
      if (role === 'super_admin') {
        return res.status(400).json({ error: 'Super Admin permissions cannot be restricted' });
      }

      const jsonStr = JSON.stringify(allowedRoutes);
      await pool.query(
        `INSERT INTO \`RolePermission\` (\`role\`, \`allowedRoutes\`, \`updatedAt\`)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE \`allowedRoutes\` = VALUES(\`allowedRoutes\`), \`updatedAt\` = NOW()`,
        [role, jsonStr]
      );
      return res.json({ success: true, message: `Permissions for role '${role}' updated successfully` });
    }

    return res.status(400).json({ error: 'Invalid payload: provide permissions object or role with allowedRoutes array' });
  } catch (error: any) {
    console.error('Failed to update role permissions:', error);
    res.status(500).json({ error: error.message || 'Failed to update role permissions' });
  }
});

// POST /api/settings/role-permissions/reset
// Super admins only: resets role permissions to system defaults
router.post('/role-permissions/reset', async (req: Request, res: Response) => {
  try {
    const isSuperAdmin = await checkSuperAdmin(req);
    if (!isSuperAdmin) {
      return res.status(403).json({ error: 'Forbidden: Super admin privileges required' });
    }

    const { role } = req.body;
    if (role) {
      await pool.query('DELETE FROM `RolePermission` WHERE `role` = ?', [role]);
      return res.json({ success: true, message: `Role '${role}' permissions reset to system default` });
    } else {
      await pool.query('DELETE FROM `RolePermission`');
      return res.json({ success: true, message: 'All role permissions reset to system defaults' });
    }
  } catch (error: any) {
    console.error('Failed to reset role permissions:', error);
    res.status(500).json({ error: error.message || 'Failed to reset role permissions' });
  }
});

export default router;

