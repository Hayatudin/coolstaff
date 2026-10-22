"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOrCreateDaeraLeaders = getOrCreateDaeraLeaders;
exports.ensureBrokerInDaera1 = ensureBrokerInDaera1;
exports.checkAndMoveCandidateToDaera2 = checkAndMoveCandidateToDaera2;
const db_1 = require("../db");
/**
 * Ensures that both 'DAERA OFFICE' and 'DAERA OFFICE 2' leaders exist in the database.
 */
async function getOrCreateDaeraLeaders() {
    // 1. Leader: DAERA OFFICE
    const [l1Rows] = await db_1.pool.query("SELECT id FROM Leader WHERE UPPER(name) IN ('DAERA OFFICE', 'DAIRA OFFICE') LIMIT 1");
    let daeraLeaderId = l1Rows?.[0]?.id;
    if (!daeraLeaderId) {
        daeraLeaderId = 'cl' + (0, db_1.generateId)().slice(0, 23);
        await db_1.pool.query("INSERT INTO Leader (id, name, createdAt) VALUES (?, 'DAERA OFFICE', NOW(3))", [daeraLeaderId]);
    }
    // 2. Leader: DAERA OFFICE 2
    const [l2Rows] = await db_1.pool.query("SELECT id FROM Leader WHERE UPPER(name) IN ('DAERA OFFICE 2', 'DAIRA OFFICE 2') LIMIT 1");
    let daera2LeaderId = l2Rows?.[0]?.id;
    if (!daera2LeaderId) {
        daera2LeaderId = 'cl' + (0, db_1.generateId)().slice(0, 23);
        await db_1.pool.query("INSERT INTO Leader (id, name, createdAt) VALUES (?, 'DAERA OFFICE 2', NOW(3))", [daera2LeaderId]);
    }
    return { daeraLeaderId, daera2LeaderId };
}
/**
 * Ensures that for newly registered candidates (or during quick registration),
 * the candidate's broker belongs to 'DAERA OFFICE' (not 'DAERA OFFICE 2').
 */
async function ensureBrokerInDaera1(brokerId) {
    if (!brokerId)
        return brokerId;
    try {
        const { daeraLeaderId, daera2LeaderId } = await getOrCreateDaeraLeaders();
        const [bRows] = await db_1.pool.query('SELECT id, name, leaderId, isLocked FROM Broker WHERE id = ? LIMIT 1', [brokerId]);
        if (!bRows || bRows.length === 0)
            return brokerId;
        const b = bRows[0];
        // If broker has no leader, assign to DAERA OFFICE
        if (!b.leaderId) {
            await db_1.pool.query('UPDATE Broker SET leaderId = ? WHERE id = ?', [daeraLeaderId, brokerId]);
            return brokerId;
        }
        // If the broker is assigned to DAERA OFFICE 2, this is a NEW non-updated candidate,
        // so this candidate belongs in DAERA OFFICE:
        if (b.leaderId === daera2LeaderId) {
            const [d1Brokers] = await db_1.pool.query('SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1', [b.name, daeraLeaderId]);
            if (d1Brokers && d1Brokers.length > 0) {
                return d1Brokers[0].id;
            }
            else {
                const newD1BrokerId = 'cb' + (0, db_1.generateId)().slice(0, 23);
                try {
                    await db_1.pool.query('INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, ?, NOW(3), ?)', [newD1BrokerId, b.name, daeraLeaderId, b.isLocked ? 1 : 0]);
                    return newD1BrokerId;
                }
                catch (dupErr) {
                    // Fallback if unique constraint on name alone prevents duplicate name
                    return brokerId;
                }
            }
        }
        return brokerId;
    }
    catch (e) {
        console.warn('[LEADER-SYNC] Failed to ensure broker in DAERA OFFICE:', e);
        return brokerId;
    }
}
/**
 * Checks if a SINGLE candidate has both image and video updated.
 * If the candidate is currently in DAERA OFFICE:
 *   - Move ONLY this specific candidate to DAERA OFFICE 2 (not all candidates under the broker).
 *   - If broker still has other (non-updated) candidates in DAERA OFFICE, the broker is
 *     duplicated: original stays in DAERA OFFICE, a copy is created in DAERA OFFICE 2.
 *   - If broker has NO more candidates left in DAERA OFFICE after the move, clean up
 *     the empty broker from DAERA OFFICE.
 */
async function checkAndMoveCandidateToDaera2(candidateId) {
    if (!candidateId)
        return;
    try {
        // 1. Fetch candidate with broker and leader details
        const [cands] = await db_1.pool.query(`SELECT c.id, c.brokerId, c.facePhotoUrl, c.fullBodyPhotoUrl, c.Youtube_URL, c.quickVideoUrl,
              b.name as brokerName, b.leaderId, b.isLocked,
              l.name as leaderName
       FROM Candidate c
       LEFT JOIN Broker b ON c.brokerId = b.id
       LEFT JOIN Leader l ON b.leaderId = l.id
       WHERE c.id = ? LIMIT 1`, [candidateId]);
        if (!cands || cands.length === 0)
            return;
        const cand = cands[0];
        // Check if candidate has both image and video
        const hasImage = Boolean(cand.facePhotoUrl || cand.fullBodyPhotoUrl);
        const hasVideo = Boolean(cand.Youtube_URL || cand.quickVideoUrl);
        if (!hasImage || !hasVideo) {
            // Must have both image and video updated to be moved to DAERA OFFICE 2
            return;
        }
        if (!cand.brokerId || !cand.leaderId) {
            return;
        }
        const currentLeaderName = (cand.leaderName || '').toUpperCase().trim();
        const isDaeraOffice1 = currentLeaderName === 'DAERA OFFICE' || currentLeaderName === 'DAIRA OFFICE';
        if (!isDaeraOffice1) {
            // Only candidates in DAERA OFFICE are moved to DAERA OFFICE 2
            return;
        }
        const { daera2LeaderId } = await getOrCreateDaeraLeaders();
        const currentBrokerId = cand.brokerId;
        const brokerName = cand.brokerName;
        // Find or create a matching broker in DAERA OFFICE 2 for this candidate
        let targetBrokerId;
        const [existingBrokerInD2] = await db_1.pool.query(`SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1`, [brokerName, daera2LeaderId]);
        if (existingBrokerInD2 && existingBrokerInD2.length > 0) {
            targetBrokerId = existingBrokerInD2[0].id;
        }
        else {
            targetBrokerId = 'cb' + (0, db_1.generateId)().slice(0, 23);
            try {
                await db_1.pool.query('INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, ?, NOW(3), ?)', [targetBrokerId, brokerName, daera2LeaderId, cand.isLocked ? 1 : 0]);
            }
            catch (insertErr) {
                // If unique constraint prevents duplicate, find existing
                const [byName] = await db_1.pool.query('SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1', [brokerName, daera2LeaderId]);
                if (byName && byName.length > 0) {
                    targetBrokerId = byName[0].id;
                }
                else {
                    throw insertErr;
                }
            }
        }
        // Move ONLY THIS candidate to the broker in DAERA OFFICE 2
        await db_1.pool.query('UPDATE Candidate SET brokerId = ? WHERE id = ?', [targetBrokerId, candidateId]);
        console.log(`[LEADER-SYNC] Moved candidate ${candidateId} to broker "${brokerName}" in DAERA OFFICE 2 (${targetBrokerId})`);
        // Also update QuickRegistration for this specific candidate if applicable
        try {
            const [qrRows] = await db_1.pool.query('SELECT id FROM QuickRegistration WHERE promotedCandidateId = ?', [candidateId]);
            for (const qr of qrRows || []) {
                await db_1.pool.query('UPDATE QuickRegistration SET brokerId = ? WHERE id = ?', [targetBrokerId, qr.id]);
            }
        }
        catch (_) { }
        // Cleanup: Check if the original broker in DAERA OFFICE now has 0 candidates
        const [remainingInOld] = await db_1.pool.query('SELECT COUNT(id) as count FROM Candidate WHERE brokerId = ?', [currentBrokerId]);
        if (remainingInOld && remainingInOld[0]?.count === 0) {
            // No candidates left in the original broker — check if QR references exist
            const [qrCount] = await db_1.pool.query('SELECT COUNT(id) as count FROM QuickRegistration WHERE brokerId = ? AND promotedCandidateId IS NULL', [currentBrokerId]);
            if (!qrCount || qrCount[0]?.count === 0) {
                // Safe to remove empty broker from DAERA OFFICE
                await db_1.pool.query('DELETE FROM Broker WHERE id = ?', [currentBrokerId]);
                console.log(`[LEADER-SYNC] Cleaned up empty broker "${brokerName}" (${currentBrokerId}) from DAERA OFFICE`);
            }
        }
    }
    catch (err) {
        console.error('[LEADER-SYNC] Error in checkAndMoveCandidateToDaera2:', err);
    }
}
