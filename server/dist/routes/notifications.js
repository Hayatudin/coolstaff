"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// GET /api/notifications
router.get('/', async (req, res) => {
    try {
        const notifications = await db_1.db
            .select()
            .from(db_1.notification)
            .orderBy((0, drizzle_orm_1.desc)(db_1.notification.createdAt))
            .limit(50);
        res.json(notifications);
    }
    catch (error) {
        console.error('Error fetching notifications:', error);
        res.status(500).json({ error: 'Failed to fetch notifications' });
    }
});
// PATCH /api/notifications
router.patch('/', async (req, res) => {
    try {
        const body = req.body;
        if (body.markAllRead) {
            await db_1.db
                .update(db_1.notification)
                .set({ isRead: true })
                .where((0, drizzle_orm_1.eq)(db_1.notification.isRead, false));
            return res.json({ success: true });
        }
        if (body.id) {
            await db_1.db
                .update(db_1.notification)
                .set({ isRead: true })
                .where((0, drizzle_orm_1.eq)(db_1.notification.id, body.id));
            const [updated] = await db_1.db
                .select()
                .from(db_1.notification)
                .where((0, drizzle_orm_1.eq)(db_1.notification.id, body.id));
            return res.json(updated);
        }
        res.status(400).json({ error: 'Invalid request' });
    }
    catch (error) {
        console.error('Error updating notification:', error);
        res.status(500).json({ error: 'Failed to update notification' });
    }
});
exports.default = router;
