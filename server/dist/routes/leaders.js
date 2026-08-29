"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const router = (0, express_1.Router)();
// GET /api/leaders
router.get('/', async (req, res) => {
    try {
        const [leaders] = await db_1.pool.query('SELECT id, name, createdAt FROM Leader ORDER BY name ASC');
        const [brokers] = await db_1.pool.query('SELECT id, name, leaderId, createdAt FROM Broker ORDER BY name ASC');
        const [lockRows] = await db_1.pool.query('SELECT id, isLocked FROM Broker');
        const lockMap = {};
        (lockRows || []).forEach((row) => {
            lockMap[row.id] = row.isLocked === 1 || row.isLocked === true;
        });
        const [countRows] = await db_1.pool.query('SELECT brokerId, COUNT(*) as count FROM Candidate WHERE brokerId IS NOT NULL GROUP BY brokerId');
        const countMap = {};
        (countRows || []).forEach((row) => {
            if (row.brokerId) {
                countMap[row.brokerId] = Number(row.count);
            }
        });
        const augmented = (leaders || []).map((leader) => {
            const leaderBrokers = (brokers || [])
                .filter((b) => b.leaderId === leader.id)
                .map((b) => ({
                id: b.id,
                name: b.name,
                leaderId: b.leaderId,
                isLocked: lockMap[b.id] ?? false,
                createdAt: typeof b.createdAt === 'string' ? b.createdAt : b.createdAt.toISOString(),
                _count: {
                    candidates: countMap[b.id] || 0
                }
            }));
            const totalCandidates = leaderBrokers.reduce((sum, b) => sum + b._count.candidates, 0);
            return {
                id: leader.id,
                name: leader.name,
                createdAt: typeof leader.createdAt === 'string' ? leader.createdAt : leader.createdAt.toISOString(),
                brokers: leaderBrokers,
                _count: {
                    brokers: leaderBrokers.length
                },
                totalCandidates
            };
        });
        res.json(augmented);
    }
    catch (error) {
        console.error('Error fetching leaders:', error);
        res.status(500).json({
            error: 'Failed to fetch leaders',
            message: error?.message || String(error)
        });
    }
});
// POST /api/leaders
router.post('/', async (req, res) => {
    try {
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Leader name is required' });
        }
        const id = 'cl' + (0, db_1.generateId)().slice(0, 23);
        await db_1.pool.query('INSERT INTO Leader (id, name, createdAt) VALUES (?, ?, NOW(3))', [id, name.trim()]);
        const [rows] = await db_1.pool.query('SELECT id, name, createdAt FROM Leader WHERE id = ?', [id]);
        if (!rows || rows.length === 0) {
            throw new Error('Failed to retrieve newly created leader');
        }
        const createdLeader = rows[0];
        res.json({
            id: createdLeader.id,
            name: createdLeader.name,
            createdAt: typeof createdLeader.createdAt === 'string' ? createdLeader.createdAt : createdLeader.createdAt.toISOString(),
            brokers: [],
            _count: { brokers: 0 },
            totalCandidates: 0
        });
    }
    catch (error) {
        console.error('Error creating leader:', error);
        if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
            return res.status(400).json({ error: 'A leader with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to create leader' });
    }
});
// PATCH /api/leaders/:id
router.patch('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { name } = req.body;
        if (!name || !name.trim()) {
            return res.status(400).json({ error: 'Leader name is required' });
        }
        const [rows] = await db_1.pool.query('SELECT id FROM Leader WHERE id = ?', [id]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Leader not found' });
        }
        await db_1.db.update(db_1.leader).set({ name: name.trim() }).where((0, drizzle_orm_1.eq)(db_1.leader.id, id));
        res.json({ success: true, message: 'Leader name updated successfully' });
    }
    catch (error) {
        console.error('Failed to update leader name:', error);
        if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
            return res.status(400).json({ error: 'A leader with this name already exists' });
        }
        res.status(500).json({ error: 'Failed to update leader' });
    }
});
// DELETE /api/leaders/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const [rows] = await db_1.pool.query('SELECT id, name FROM Leader WHERE id = ?', [id]);
        if (!rows || rows.length === 0) {
            return res.status(404).json({ error: 'Leader not found' });
        }
        const leaderName = rows[0].name;
        await db_1.db.update(db_1.broker).set({ leaderId: null }).where((0, drizzle_orm_1.eq)(db_1.broker.leaderId, id));
        await db_1.db.delete(db_1.leader).where((0, drizzle_orm_1.eq)(db_1.leader.id, id));
        res.json({ success: true, message: `Leader "${leaderName}" deleted successfully` });
    }
    catch (error) {
        console.error('Failed to delete leader:', error);
        res.status(500).json({ error: error.message || 'Failed to delete leader' });
    }
});
exports.default = router;
