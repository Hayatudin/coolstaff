"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const auth_1 = require("../lib/auth");
const router = (0, express_1.Router)();
// Helper to get session in Express
const getSession = async (req) => {
    return await auth_1.auth.api.getSession({
        headers: req.headers,
    });
};
// PATCH /api/account/profile
router.patch('/profile', async (req, res) => {
    try {
        const session = await getSession(req);
        if (!session || !session.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Name is required' });
        await db_1.db.update(db_1.user).set({ name }).where((0, drizzle_orm_1.eq)(db_1.user.id, session.user.id));
        const [updatedUser] = await db_1.db.select().from(db_1.user).where((0, drizzle_orm_1.eq)(db_1.user.id, session.user.id));
        res.json(updatedUser);
    }
    catch (error) {
        console.error('[PROFILE_UPDATE_ERROR]', error);
        res.status(500).json({ error: error.message || 'Failed to update profile' });
    }
});
// POST /api/account/password
router.post('/password', async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        if (!currentPassword || !newPassword) {
            return res.status(400).json({ error: 'Current and new passwords are required' });
        }
        try {
            await auth_1.auth.api.changePassword({
                body: {
                    currentPassword,
                    newPassword,
                    revokeOtherSessions: true,
                },
                headers: req.headers,
            });
            res.json({ success: true });
        }
        catch (authError) {
            console.error('[AUTH_CHANGE_PASSWORD_ERROR]', authError);
            return res.status(401).json({ error: authError.message || 'Unauthorized or invalid password' });
        }
    }
    catch (error) {
        console.error('[PASSWORD_UPDATE_ERROR]', error);
        res.status(400).json({ error: error.message || 'Failed to change password' });
    }
});
exports.default = router;
