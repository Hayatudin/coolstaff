"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const router = (0, express_1.Router)();
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
exports.default = router;
