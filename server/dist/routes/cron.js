"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// GET /api/cron/check-deadlines
router.get('/check-deadlines', async (req, res) => {
    try {
        const today = new Date();
        const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999);
        const candidates = await db_1.db
            .select()
            .from(db_1.candidate)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.gte)(db_1.candidate.cvDeadline, startOfDay), (0, drizzle_orm_1.lte)(db_1.candidate.cvDeadline, endOfDay)));
        if (candidates.length === 0) {
            return res.json({ success: true, message: 'No deadlines today.' });
        }
        const token = process.env.TELEGRAM_BOT_TOKEN;
        const chatId = process.env.TELEGRAM_CHAT_ID;
        if (!token || !chatId) {
            return res.status(500).json({ error: 'Telegram credentials missing' });
        }
        let successCount = 0;
        const errors = [];
        for (const candidate of candidates) {
            const message = `🚨 *COOLSTAFF ALERT: CV Deadline Today!* 🚨\n\n` +
                `*Candidate:* ${candidate.givenNames} ${candidate.surname}\n` +
                `*Passport:* ${candidate.passportNumber}\n` +
                `*Job:* ${candidate.job || 'Not specified'}\n\n` +
                `_Please ensure the final document has been exported and sent to the agency._`;
            try {
                await db_1.db.insert(db_1.notification).values({
                    id: (0, db_1.generateId)(),
                    title: 'CV Deadline Reached',
                    message: `The 30-day CV deadline for ${candidate.givenNames} ${candidate.surname} (${candidate.passportNumber}) has been reached.`,
                    candidateId: candidate.id
                });
                const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ chat_id: chatId, text: message, parse_mode: 'Markdown' }),
                });
                if (response.ok)
                    successCount++;
                else
                    errors.push(`Failed for ${candidate.id}`);
            }
            catch (err) {
                errors.push(`Network error for ${candidate.id}`);
            }
        }
        res.json({ success: true, notified: successCount, errors: errors.length > 0 ? errors : undefined });
    }
    catch (error) {
        console.error('Error in check-deadlines cron:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
exports.default = router;
