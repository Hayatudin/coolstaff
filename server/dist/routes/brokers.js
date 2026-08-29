"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const db_1 = require("../db");
const drizzle_orm_1 = require("drizzle-orm");
const auth_helper_1 = require("../lib/auth-helper");
const router = (0, express_1.Router)();
// Helper: fetch isLocked values for all brokers via raw SQL
async function getBrokerLockMap() {
    try {
        const [rows] = await db_1.pool.query('SELECT id, isLocked FROM Broker');
        const map = {};
        for (const row of rows) {
            map[row.id] = row.isLocked === 1 || row.isLocked === true;
        }
        return map;
    }
    catch (e) {
        console.warn('[BROKER] Could not fetch isLocked column via raw SQL:', e);
        return {};
    }
}
// Helper: fetch single broker isLocked via raw SQL
async function getBrokerIsLocked(id) {
    try {
        const [rows] = await db_1.pool.query('SELECT isLocked FROM Broker WHERE id = ?', [id]);
        if (!rows || rows.length === 0)
            return false;
        return rows[0].isLocked === 1 || rows[0].isLocked === true;
    }
    catch (e) {
        console.warn('[BROKER] Could not fetch isLocked for broker', id, e);
        return false;
    }
}
// Helper: set broker isLocked via raw SQL
async function setBrokerIsLocked(id, locked) {
    await db_1.pool.query('UPDATE Broker SET isLocked = ? WHERE id = ?', [locked ? 1 : 0, id]);
}
// GET /api/brokers
router.get('/', async (req, res) => {
    try {
        const brokersList = await db_1.db.select().from(db_1.broker);
        const leadersList = await db_1.db.select().from(db_1.leader);
        const leaderMap = new Map();
        leadersList.forEach(l => leaderMap.set(l.id, l));
        const candidateCountsList = await db_1.db
            .select({
            brokerId: db_1.candidate.brokerId,
            count: (0, drizzle_orm_1.count)(db_1.candidate.id),
        })
            .from(db_1.candidate)
            .groupBy(db_1.candidate.brokerId);
        const candCountMap = new Map();
        candidateCountsList.forEach(c => {
            if (c.brokerId)
                candCountMap.set(c.brokerId, c.count);
        });
        const lockMap = await getBrokerLockMap();
        const augmented = [];
        for (const b of brokersList) {
            const candidates = await db_1.db
                .select({
                id: db_1.candidate.id,
                givenNames: db_1.candidate.givenNames,
                surname: db_1.candidate.surname,
                passportNumber: db_1.candidate.passportNumber,
                facePhotoUrl: db_1.candidate.facePhotoUrl,
                fullBodyPhotoUrl: db_1.candidate.fullBodyPhotoUrl,
            })
                .from(db_1.candidate)
                .where((0, drizzle_orm_1.eq)(db_1.candidate.brokerId, b.id));
            const candidatesWithCVs = [];
            for (const cand of candidates) {
                const cvs = await db_1.db
                    .select({
                    id: db_1.generatedCv.id,
                    templateId: db_1.generatedCv.templateId,
                })
                    .from(db_1.generatedCv)
                    .where((0, drizzle_orm_1.eq)(db_1.generatedCv.candidateId, cand.id));
                candidatesWithCVs.push({
                    ...cand,
                    generatedCVs: cvs,
                });
            }
            augmented.push({
                ...b,
                leaderId: b.leaderId,
                leader: b.leaderId ? leaderMap.get(b.leaderId) || null : null,
                isLocked: lockMap[b.id] ?? false,
                candidates: candidatesWithCVs,
                _count: {
                    candidates: candCountMap.get(b.id) || 0,
                },
            });
        }
        res.json(augmented);
    }
    catch (error) {
        console.error('Error fetching brokers:', error);
        res.status(500).json({
            error: 'Failed to fetch brokers',
            message: error?.message || String(error)
        });
    }
});
// POST /api/brokers
router.post('/', async (req, res) => {
    try {
        const { name, leaderId } = req.body;
        if (!name)
            return res.status(400).json({ error: 'Broker name is required' });
        const brokerId = 'cb' + (0, db_1.generateId)().slice(0, 23);
        await db_1.pool.query('INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, ?, NOW(3), 0)', [brokerId, name.trim(), leaderId || null]);
        const [brokerRows] = await db_1.pool.query('SELECT id, name, leaderId, createdAt, isLocked FROM Broker WHERE id = ?', [brokerId]);
        if (!brokerRows || brokerRows.length === 0) {
            throw new Error('Failed to retrieve newly created broker.');
        }
        const brokerObj = {
            ...brokerRows[0],
            isLocked: Boolean(brokerRows[0].isLocked),
            _count: { candidates: 0 }
        };
        if (!leaderId) {
            try {
                const [leaderRows] = await db_1.pool.query("SELECT id FROM Leader WHERE name = 'DAERA OFFICE' LIMIT 1");
                let daeraLeaderId = null;
                if (leaderRows && leaderRows.length > 0) {
                    daeraLeaderId = leaderRows[0].id;
                }
                else {
                    const generatedLeaderId = 'cl' + (0, db_1.generateId)().slice(0, 23);
                    await db_1.pool.query('INSERT INTO Leader (id, name, createdAt) VALUES (?, ?, NOW(3))', [generatedLeaderId, 'DAERA OFFICE']);
                    daeraLeaderId = generatedLeaderId;
                }
                if (daeraLeaderId) {
                    await db_1.pool.query('UPDATE Broker SET leaderId = ? WHERE id = ?', [daeraLeaderId, brokerObj.id]);
                    brokerObj.leaderId = daeraLeaderId;
                }
            }
            catch (e) {
                console.warn('[BROKER-CREATE] Failed to auto-assign/create DAERA OFFICE leader:', e);
            }
        }
        res.json(brokerObj);
    }
    catch (error) {
        console.error('Error creating broker:', error);
        if (error.code === 'ER_DUP_ENTRY' || error.message?.includes('Duplicate entry')) {
            return res.status(400).json({ error: 'A broker with this name already exists' });
        }
        res.status(500).json({
            error: 'Failed to create broker. Please try again.',
            details: error.message || String(error)
        });
    }
});
// POST /api/brokers/move-candidates-bulk
router.post('/move-candidates-bulk', async (req, res) => {
    try {
        const { candidateIds, targetBrokerId } = req.body;
        if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
            return res.status(400).json({ error: 'Candidate IDs array is required' });
        }
        if (!targetBrokerId) {
            return res.status(400).json({ error: 'Target broker ID is required' });
        }
        const targetBroker = await db_1.db.select().from(db_1.broker).where((0, drizzle_orm_1.eq)(db_1.broker.id, targetBrokerId));
        if (targetBroker.length === 0) {
            return res.status(404).json({ error: 'Target broker not found' });
        }
        await db_1.db
            .update(db_1.candidate)
            .set({ brokerId: targetBrokerId })
            .where((0, drizzle_orm_1.inArray)(db_1.candidate.id, candidateIds));
        res.json({
            success: true,
            movedCount: candidateIds.length,
            message: `Successfully moved ${candidateIds.length} candidate(s) to "${targetBroker[0].name}"`
        });
    }
    catch (error) {
        console.error('Failed to move candidates in bulk:', error);
        res.status(500).json({ error: error.message || 'Failed to move candidates' });
    }
});
// GET /api/brokers/:id/candidates
router.get('/:id/candidates', async (req, res) => {
    try {
        const { id } = req.params;
        const { search, interval, startDate, endDate } = req.query;
        const [brokerRows] = await db_1.pool.query('SELECT * FROM Broker WHERE id = ? LIMIT 1', [id]);
        if (!brokerRows || brokerRows.length === 0) {
            return res.status(404).json({ error: 'Broker not found' });
        }
        const brokerObj = brokerRows[0];
        let sqlQuery = 'SELECT * FROM Candidate WHERE brokerId = ?';
        const sqlParams = [id];
        if (interval && interval !== 'ALL') {
            const now = new Date();
            let from = new Date(now);
            if (interval === '1D')
                from.setDate(from.getDate() - 1);
            else if (interval === '1W')
                from.setDate(from.getDate() - 7);
            else if (interval === '1M')
                from.setMonth(from.getMonth() - 1);
            else if (interval === '1Y')
                from.setFullYear(from.getFullYear() - 1);
            sqlQuery += ' AND registeredAt >= ?';
            sqlParams.push(from);
        }
        if (startDate) {
            sqlQuery += ' AND registeredAt >= ?';
            sqlParams.push(new Date(startDate));
        }
        if (endDate) {
            sqlQuery += ' AND registeredAt <= ?';
            sqlParams.push(new Date(endDate));
        }
        if (search) {
            sqlQuery += ' AND (givenNames LIKE ? OR surname LIKE ? OR passportNumber LIKE ?)';
            const s = `%${search}%`;
            sqlParams.push(s, s, s);
        }
        sqlQuery += ' ORDER BY registeredAt DESC';
        const [candidates] = await db_1.pool.query(sqlQuery, sqlParams);
        const candidatesWithCVs = [];
        for (const cand of candidates) {
            const cvs = await db_1.db
                .select({
                id: db_1.generatedCv.id,
                templateId: db_1.generatedCv.templateId,
                facePhotoUrl: db_1.generatedCv.facePhotoUrl,
                fullBodyPhotoUrl: db_1.generatedCv.fullBodyPhotoUrl,
                createdAt: db_1.generatedCv.createdAt,
            })
                .from(db_1.generatedCv)
                .where((0, drizzle_orm_1.eq)(db_1.generatedCv.candidateId, cand.id));
            candidatesWithCVs.push({
                ...cand,
                generatedCVs: cvs,
            });
        }
        const isLocked = await getBrokerIsLocked(id);
        const session = await (0, auth_helper_1.getSession)(req);
        const role = session?.user?.role;
        const isSuperAdmin = role === 'super_admin';
        const augmentedBroker = {
            ...brokerObj,
            leaderId: brokerObj.leaderId || null,
            isLocked,
            candidates: candidatesWithCVs.map((c) => ({
                ...c,
                isLocked: c.isLocked === 1 || c.isLocked === true,
                cvDownloaded: c.cvDownloaded === 1 || c.cvDownloaded === true,
                price: isSuperAdmin ? (c.price || null) : null,
            })),
        };
        res.json(augmentedBroker);
    }
    catch (error) {
        console.error('Error fetching broker candidates:', error);
        res.status(500).json({ error: 'Failed to fetch broker candidates' });
    }
});
// POST /api/brokers/:id/move-candidates
router.post('/:id/move-candidates', async (req, res) => {
    try {
        const { id } = req.params;
        const { targetBrokerId } = req.body;
        if (!targetBrokerId) {
            return res.status(400).json({ error: 'Target broker ID is required' });
        }
        if (id === targetBrokerId) {
            return res.status(400).json({ error: 'Cannot move candidates to the same broker' });
        }
        const sourceBroker = await db_1.db.select().from(db_1.broker).where((0, drizzle_orm_1.eq)(db_1.broker.id, id));
        if (sourceBroker.length === 0)
            return res.status(404).json({ error: 'Source broker not found' });
        const targetBroker = await db_1.db.select().from(db_1.broker).where((0, drizzle_orm_1.eq)(db_1.broker.id, targetBrokerId));
        if (targetBroker.length === 0)
            return res.status(404).json({ error: 'Target broker not found' });
        await db_1.db.update(db_1.candidate).set({ brokerId: targetBrokerId }).where((0, drizzle_orm_1.eq)(db_1.candidate.brokerId, id));
        await db_1.db.update(db_1.quickRegistration).set({ brokerId: targetBrokerId }).where((0, drizzle_orm_1.eq)(db_1.quickRegistration.brokerId, id));
        res.json({
            success: true,
            message: `Successfully moved candidate(s) from "${sourceBroker[0].name}" to "${targetBroker[0].name}"`
        });
    }
    catch (error) {
        console.error('Failed to move candidates:', error);
        res.status(500).json({ error: error.message || 'Failed to move candidates' });
    }
});
// DELETE /api/brokers/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const broker = await db_1.db.select().from(db_1.broker).where((0, drizzle_orm_1.eq)(db_1.broker.id, id));
        if (broker.length === 0)
            return res.status(404).json({ error: 'Broker not found' });
        await db_1.db.update(db_1.candidate).set({ brokerId: null }).where((0, drizzle_orm_1.eq)(db_1.candidate.brokerId, id));
        await db_1.db.update(db_1.quickRegistration).set({ brokerId: null }).where((0, drizzle_orm_1.eq)(db_1.quickRegistration.brokerId, id));
        await db_1.db.delete(db_1.broker).where((0, drizzle_orm_1.eq)(db_1.broker.id, id));
        res.json({ success: true, message: `Broker "${broker[0].name}" deleted successfully` });
    }
    catch (error) {
        console.error('Failed to delete broker:', error);
        res.status(500).json({ error: error.message || 'Failed to delete broker' });
    }
});
// PATCH /api/brokers/:id/toggle-lock
router.patch('/:id/toggle-lock', async (req, res) => {
    try {
        const { id } = req.params;
        const currentLockState = await getBrokerIsLocked(id);
        const newLockState = !currentLockState;
        await setBrokerIsLocked(id, newLockState);
        const broker = await db_1.db.select().from(db_1.broker).where((0, drizzle_orm_1.eq)(db_1.broker.id, id));
        if (broker.length === 0)
            return res.status(404).json({ error: 'Broker not found' });
        res.json({
            ...broker[0],
            isLocked: newLockState
        });
    }
    catch (error) {
        console.error('Failed to toggle broker lock:', error);
        res.status(500).json({ error: error.message || 'Failed to toggle broker lock' });
    }
});
// POST /api/brokers/move-bulk
router.post('/move-bulk', async (req, res) => {
    try {
        const { brokerIds, leaderId } = req.body;
        if (!brokerIds || !Array.isArray(brokerIds) || brokerIds.length === 0) {
            return res.status(400).json({ error: 'Broker IDs array is required' });
        }
        if (leaderId) {
            const leaders = await db_1.db.select().from(db_1.leader).where((0, drizzle_orm_1.eq)(db_1.leader.id, leaderId));
            if (leaders.length === 0)
                return res.status(404).json({ error: 'Target leader not found' });
        }
        await db_1.db
            .update(db_1.broker)
            .set({ leaderId: leaderId || null })
            .where((0, drizzle_orm_1.inArray)(db_1.broker.id, brokerIds));
        res.json({ success: true, movedCount: brokerIds.length });
    }
    catch (error) {
        console.error('Failed to move brokers in bulk:', error);
        res.status(500).json({ error: error.message || 'Failed to move brokers in bulk' });
    }
});
// PATCH /api/brokers/:id/leader
router.patch('/:id/leader', async (req, res) => {
    try {
        const { id } = req.params;
        const { leaderId } = req.body;
        const broker = await db_1.db.select().from(db_1.broker).where((0, drizzle_orm_1.eq)(db_1.broker.id, id));
        if (broker.length === 0)
            return res.status(404).json({ error: 'Broker not found' });
        let leaderObj = null;
        if (leaderId) {
            const leaders = await db_1.db.select().from(db_1.leader).where((0, drizzle_orm_1.eq)(db_1.leader.id, leaderId));
            if (leaders.length === 0)
                return res.status(404).json({ error: 'Target leader not found' });
            leaderObj = leaders[0];
        }
        await db_1.db.update(db_1.broker).set({ leaderId: leaderId || null }).where((0, drizzle_orm_1.eq)(db_1.broker.id, id));
        res.json({
            ...broker[0],
            leaderId: leaderId || null,
            leader: leaderObj
        });
    }
    catch (error) {
        console.error('Failed to update broker leader:', error);
        res.status(500).json({ error: error.message || 'Failed to update broker leader' });
    }
});
// POST /api/brokers/:id/change-template
router.post('/:id/change-template', async (req, res) => {
    try {
        const { id } = req.params;
        const { templateId } = req.body;
        if (!templateId)
            return res.status(400).json({ error: 'Template ID is required' });
        const brokerCandidates = await db_1.db.select().from(db_1.candidate).where((0, drizzle_orm_1.eq)(db_1.candidate.brokerId, id));
        if (brokerCandidates.length === 0) {
            return res.json({ success: true, updatedCount: 0, message: 'No candidates found under broker' });
        }
        let updatedCount = 0;
        for (const cand of brokerCandidates) {
            const existingCvs = await db_1.db.select().from(db_1.generatedCv).where((0, drizzle_orm_1.eq)(db_1.generatedCv.candidateId, cand.id));
            if (existingCvs.length > 0) {
                await db_1.db.update(db_1.generatedCv).set({ templateId }).where((0, drizzle_orm_1.eq)(db_1.generatedCv.id, existingCvs[0].id));
            }
            else {
                await db_1.db.insert(db_1.generatedCv).values({
                    candidateId: cand.id,
                    templateId,
                    facePhotoUrl: cand.facePhotoUrl,
                    fullBodyPhotoUrl: cand.fullBodyPhotoUrl,
                });
            }
            updatedCount++;
        }
        res.json({
            success: true,
            updatedCount,
            message: `Successfully updated ${updatedCount} candidate(s) to template "${templateId.toUpperCase()}"`
        });
    }
    catch (error) {
        console.error('Failed to change broker templates:', error);
        res.status(500).json({ error: error.message || 'Failed to change broker templates' });
    }
});
exports.default = router;
