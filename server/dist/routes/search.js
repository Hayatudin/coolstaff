"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// GET /api/search
router.get('/', async (req, res) => {
    try {
        const query = req.query.q;
        if (!query)
            return res.json([]);
        const pattern = `%${query}%`;
        const candidates = await db_1.db
            .select()
            .from(db_1.candidate)
            .where((0, drizzle_orm_1.or)((0, drizzle_orm_1.like)(db_1.candidate.givenNames, pattern), (0, drizzle_orm_1.like)(db_1.candidate.surname, pattern), (0, drizzle_orm_1.like)(db_1.candidate.passportNumber, pattern), (0, drizzle_orm_1.like)(db_1.candidate.idNumber, pattern)))
            .limit(10);
        res.json(candidates);
    }
    catch (error) {
        console.error('Search failed:', error);
        res.status(500).json({ error: 'Search failed' });
    }
});
exports.default = router;
