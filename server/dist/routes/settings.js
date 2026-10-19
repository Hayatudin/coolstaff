"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const auth_helper_1 = require("../lib/auth-helper");
const router = (0, express_1.Router)();
// Helper to verify super admin role
async function checkSuperAdmin(req) {
    try {
        const session = await (0, auth_helper_1.getSession)(req);
        const userRole = session?.user?.role;
        if (userRole === 'super_admin')
            return true;
        // Upstream middleware check
        if (req.user?.role === 'super_admin')
            return true;
        return false;
    }
    catch (err) {
        console.warn('[SETTINGS] Error verifying super_admin session:', err);
        return false;
    }
}
// GET /api/settings/prices
router.get('/prices', async (req, res) => {
    try {
        const [rawRows] = await db_1.pool.query(`SELECT templateId, price, updatedAt FROM \`TemplatePrice\``);
        res.json(rawRows || []);
    }
    catch (error) {
        res.json([]);
    }
});
// POST /api/settings/prices
router.post('/prices', async (req, res) => {
    try {
        const { prices } = req.body;
        if (!prices || typeof prices !== 'object') {
            return res.status(400).json({ error: 'Invalid prices payload' });
        }
        for (const [templateId, price] of Object.entries(prices)) {
            if (typeof price !== 'string' && typeof price !== 'number')
                continue;
            const formattedPrice = String(price).trim();
            await db_1.pool.query(`INSERT INTO \`TemplatePrice\` (templateId, price, updatedAt) 
         VALUES (?, ?, NOW()) 
         ON DUPLICATE KEY UPDATE price = VALUES(price), updatedAt = NOW()`, [templateId, formattedPrice]);
        }
        res.json({ success: true, message: 'Prices updated successfully' });
    }
    catch (error) {
        console.error('Failed to update template prices:', error);
        res.status(500).json({ error: error.message || 'Failed to update prices' });
    }
});
// GET /api/settings/role-permissions
// Returns stored role permissions from MySQL
router.get('/role-permissions', async (req, res) => {
    try {
        const [rawRows] = await db_1.pool.query('SELECT `role`, `allowedRoutes`, `updatedAt` FROM `RolePermission`');
        const permissions = {};
        if (Array.isArray(rawRows)) {
            for (const row of rawRows) {
                let routes = [];
                if (typeof row.allowedRoutes === 'string') {
                    try {
                        routes = JSON.parse(row.allowedRoutes);
                    }
                    catch {
                        routes = [];
                    }
                }
                else if (Array.isArray(row.allowedRoutes)) {
                    routes = row.allowedRoutes;
                }
                permissions[row.role] = routes;
            }
        }
        res.json({ permissions });
    }
    catch (error) {
        console.error('Failed to get role permissions:', error);
        res.json({ permissions: {} });
    }
});
// PUT /api/settings/role-permissions
// Super admins only: updates allowed routes for roles
router.put('/role-permissions', async (req, res) => {
    try {
        const isSuperAdmin = await checkSuperAdmin(req);
        if (!isSuperAdmin) {
            return res.status(403).json({ error: 'Forbidden: Super admin privileges required' });
        }
        const { permissions, role, allowedRoutes } = req.body;
        // Batch update multiple roles
        if (permissions && typeof permissions === 'object') {
            for (const [r, routes] of Object.entries(permissions)) {
                if (!Array.isArray(routes))
                    continue;
                // Super admin permissions cannot be restricted to avoid lockout
                if (r === 'super_admin')
                    continue;
                const jsonStr = JSON.stringify(routes);
                await db_1.pool.query(`INSERT INTO \`RolePermission\` (\`role\`, \`allowedRoutes\`, \`updatedAt\`)
           VALUES (?, ?, NOW())
           ON DUPLICATE KEY UPDATE \`allowedRoutes\` = VALUES(\`allowedRoutes\`), \`updatedAt\` = NOW()`, [r, jsonStr]);
            }
            return res.json({ success: true, message: 'Role permissions updated successfully' });
        }
        // Single role update
        if (role && Array.isArray(allowedRoutes)) {
            if (role === 'super_admin') {
                return res.status(400).json({ error: 'Super Admin permissions cannot be restricted' });
            }
            const jsonStr = JSON.stringify(allowedRoutes);
            await db_1.pool.query(`INSERT INTO \`RolePermission\` (\`role\`, \`allowedRoutes\`, \`updatedAt\`)
         VALUES (?, ?, NOW())
         ON DUPLICATE KEY UPDATE \`allowedRoutes\` = VALUES(\`allowedRoutes\`), \`updatedAt\` = NOW()`, [role, jsonStr]);
            return res.json({ success: true, message: `Permissions for role '${role}' updated successfully` });
        }
        return res.status(400).json({ error: 'Invalid payload: provide permissions object or role with allowedRoutes array' });
    }
    catch (error) {
        console.error('Failed to update role permissions:', error);
        res.status(500).json({ error: error.message || 'Failed to update role permissions' });
    }
});
// POST /api/settings/role-permissions/reset
// Super admins only: resets role permissions to system defaults
router.post('/role-permissions/reset', async (req, res) => {
    try {
        const isSuperAdmin = await checkSuperAdmin(req);
        if (!isSuperAdmin) {
            return res.status(403).json({ error: 'Forbidden: Super admin privileges required' });
        }
        const { role } = req.body;
        if (role) {
            await db_1.pool.query('DELETE FROM `RolePermission` WHERE `role` = ?', [role]);
            return res.json({ success: true, message: `Role '${role}' permissions reset to system default` });
        }
        else {
            await db_1.pool.query('DELETE FROM `RolePermission`');
            return res.json({ success: true, message: 'All role permissions reset to system defaults' });
        }
    }
    catch (error) {
        console.error('Failed to reset role permissions:', error);
        res.status(500).json({ error: error.message || 'Failed to reset role permissions' });
    }
});
exports.default = router;
