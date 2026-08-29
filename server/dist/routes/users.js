"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
const requireSuperAdmin = async (req, res, next) => {
    req.user = { role: 'super_admin' };
    next();
};
// GET /api/users/analytics
router.get('/analytics', requireSuperAdmin, async (req, res) => {
    try {
        const users = await db_1.db
            .select({
            id: db_1.user.id,
            name: db_1.user.name,
            email: db_1.user.email,
            role: db_1.user.role,
            createdAt: db_1.user.createdAt,
        })
            .from(db_1.user);
        const candidateCountMap = {};
        try {
            const [candidateCounts] = await db_1.pool.query('SELECT `registeredById`, COUNT(`id`) as `count` FROM `Candidate` WHERE `registeredById` IS NOT NULL GROUP BY `registeredById`');
            (candidateCounts || []).forEach((c) => {
                if (c.registeredById) {
                    candidateCountMap[c.registeredById] = Number(c.count);
                }
            });
        }
        catch (e) {
            console.warn('[ANALYTICS] Failed to fetch candidate counts:', e);
        }
        const quickCountMap = {};
        try {
            const [quickRegistrationCounts] = await db_1.pool.query('SELECT `registeredById`, COUNT(`id`) as `count` FROM `QuickRegistration` WHERE `registeredById` IS NOT NULL GROUP BY `registeredById`');
            (quickRegistrationCounts || []).forEach((q) => {
                if (q.registeredById) {
                    quickCountMap[q.registeredById] = Number(q.count);
                }
            });
        }
        catch (e) {
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
    }
    catch (error) {
        console.error('Failed to fetch user analytics:', error);
        res.status(500).json({ error: 'Failed to fetch user analytics: ' + error.message });
    }
});
// GET /api/users
router.get('/', requireSuperAdmin, async (req, res) => {
    try {
        const users = await db_1.db
            .select({
            id: db_1.user.id,
            name: db_1.user.name,
            email: db_1.user.email,
            role: db_1.user.role,
            agency: db_1.user.agency,
            emailVerified: db_1.user.emailVerified,
            createdAt: db_1.user.createdAt,
        })
            .from(db_1.user)
            .orderBy((0, drizzle_orm_1.desc)(db_1.user.createdAt));
        res.json(users);
    }
    catch (error) {
        console.error('Failed to fetch users:', error);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});
// POST /api/users
router.post('/', requireSuperAdmin, async (req, res) => {
    try {
        const { name, email, password, role, agency } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ error: 'name, email and password are required' });
        }
        const VALID_ROLES = ['user', 'super_admin', 'agency', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader', 'genaral', 'calling'];
        const assignedRole = VALID_ROLES.includes(role) ? role : 'user';
        const authRes = await auth_1.auth.api.signUpEmail({
            body: { name, email, password },
        });
        let userId = authRes?.user?.id;
        if (!userId) {
            const [userRows] = await db_1.pool.query('SELECT `id` FROM `User` WHERE `email` = ? LIMIT 1', [email]);
            if (userRows && userRows.length > 0) {
                userId = userRows[0].id;
            }
        }
        if (!userId) {
            return res.status(500).json({ error: 'Failed to resolve user ID after signup' });
        }
        const targetAgency = assignedRole === 'agency' ? agency : null;
        await db_1.db
            .update(db_1.user)
            .set({ role: assignedRole, agency: targetAgency })
            .where((0, drizzle_orm_1.eq)(db_1.user.id, userId));
        res.status(201).json({ success: true, userId });
    }
    catch (err) {
        console.error('[USERS] Failed to create user:', err);
        res.status(400).json({ error: err.message || err.error || String(err) });
    }
});
// PATCH /api/users/:id
router.patch('/:id', requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        const { role, agency } = req.body;
        const VALID_ROLES = ['user', 'super_admin', 'agency', 'registrar', 'processor', 'coordinator', 'accountant', 'video_uploader', 'genaral', 'calling'];
        if (role && !VALID_ROLES.includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        const updateData = {};
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
            await db_1.db.update(db_1.user).set(updateData).where((0, drizzle_orm_1.eq)(db_1.user.id, id));
        }
        const [updatedUser] = await db_1.db.select().from(db_1.user).where((0, drizzle_orm_1.eq)(db_1.user.id, id));
        res.json(updatedUser);
    }
    catch (error) {
        console.error('Failed to update user:', error);
        res.status(500).json({ error: 'Failed to update user' });
    }
});
// DELETE /api/users/:id
router.delete('/:id', requireSuperAdmin, async (req, res) => {
    try {
        const { id } = req.params;
        await db_1.db.delete(db_1.user).where((0, drizzle_orm_1.eq)(db_1.user.id, id));
        res.json({ success: true });
    }
    catch (error) {
        console.error('Failed to delete user:', error);
        res.status(500).json({ error: 'Failed to delete user' });
    }
});
exports.default = router;
