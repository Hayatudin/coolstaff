import { pool, generateId } from '../db';

/**
 * Ensures that both 'DAERA OFFICE' and 'DAERA OFFICE 2' leaders exist in the database.
 */
export async function getOrCreateDaeraLeaders(): Promise<{ daeraLeaderId: string; daera2LeaderId: string }> {
  // 1. Leader: DAERA OFFICE
  const [l1Rows]: any = await pool.query(
    "SELECT id FROM Leader WHERE UPPER(name) IN ('DAERA OFFICE', 'DAIRA OFFICE') LIMIT 1"
  );
  let daeraLeaderId: string = l1Rows?.[0]?.id;
  if (!daeraLeaderId) {
    daeraLeaderId = 'cl' + generateId().slice(0, 23);
    await pool.query(
      "INSERT INTO Leader (id, name, createdAt) VALUES (?, 'DAERA OFFICE', NOW(3))",
      [daeraLeaderId]
    );
  }

  // 2. Leader: DAERA OFFICE 2
  const [l2Rows]: any = await pool.query(
    "SELECT id FROM Leader WHERE UPPER(name) IN ('DAERA OFFICE 2', 'DAIRA OFFICE 2') LIMIT 1"
  );
  let daera2LeaderId: string = l2Rows?.[0]?.id;
  if (!daera2LeaderId) {
    daera2LeaderId = 'cl' + generateId().slice(0, 23);
    await pool.query(
      "INSERT INTO Leader (id, name, createdAt) VALUES (?, 'DAERA OFFICE 2', NOW(3))",
      [daera2LeaderId]
    );
  }

  return { daeraLeaderId, daera2LeaderId };
}

/**
 * Ensures that for newly registered candidates (or during quick registration),
 * the candidate's broker belongs to 'DAERA OFFICE' (not 'DAERA OFFICE 2').
 */
export async function ensureBrokerInDaera1(brokerId: string): Promise<string> {
  if (!brokerId) return brokerId;
  try {
    const { daeraLeaderId, daera2LeaderId } = await getOrCreateDaeraLeaders();
    const [bRows]: any = await pool.query(
      'SELECT id, name, leaderId, isLocked FROM Broker WHERE id = ? LIMIT 1',
      [brokerId]
    );
    if (!bRows || bRows.length === 0) return brokerId;
    const b = bRows[0];

    // If broker has no leader, assign to DAERA OFFICE
    if (!b.leaderId) {
      await pool.query('UPDATE Broker SET leaderId = ? WHERE id = ?', [daeraLeaderId, brokerId]);
      return brokerId;
    }

    // If the broker is assigned to DAERA OFFICE 2, this is a NEW non-updated candidate,
    // so this candidate belongs in DAERA OFFICE:
    if (b.leaderId === daera2LeaderId) {
      const [d1Brokers]: any = await pool.query(
        'SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1',
        [b.name, daeraLeaderId]
      );
      if (d1Brokers && d1Brokers.length > 0) {
        return d1Brokers[0].id;
      } else {
        const newD1BrokerId = 'cb' + generateId().slice(0, 23);
        try {
          await pool.query(
            'INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, ?, NOW(3), ?)',
            [newD1BrokerId, b.name, daeraLeaderId, b.isLocked ? 1 : 0]
          );
          return newD1BrokerId;
        } catch (dupErr) {
          // Fallback if unique constraint on name alone prevents duplicate name
          return brokerId;
        }
      }
    }

    return brokerId;
  } catch (e) {
    console.warn('[LEADER-SYNC] Failed to ensure broker in DAERA OFFICE:', e);
    return brokerId;
  }
}

/**
 * Checks if a candidate has both image and video updated.
 * If the candidate is currently in DAERA OFFICE:
 * 1. Move the candidate to DAERA OFFICE 2 with their broker.
 * 2. If the current broker has NO other non-updated candidates in DAERA OFFICE,
 *    move the entire broker to DAERA OFFICE 2 (not duplicated).
 * 3. If the current broker STILL HAS non-updated candidates in DAERA OFFICE,
 *    keep the original broker in DAERA OFFICE and find/create a matching broker
 *    with the same name in DAERA OFFICE 2, moving this updated candidate to it.
 * 4. Cleans up any redundant empty brokers in DAERA OFFICE.
 */
export async function checkAndMoveCandidateToDaera2(candidateId: string): Promise<void> {
  if (!candidateId) return;

  try {
    // 1. Fetch candidate with broker and leader details
    const [cands]: any = await pool.query(
      `SELECT c.id, c.brokerId, c.facePhotoUrl, c.fullBodyPhotoUrl, c.Youtube_URL, c.quickVideoUrl,
              b.name as brokerName, b.leaderId, b.isLocked,
              l.name as leaderName
       FROM Candidate c
       LEFT JOIN Broker b ON c.brokerId = b.id
       LEFT JOIN Leader l ON b.leaderId = l.id
       WHERE c.id = ? LIMIT 1`,
      [candidateId]
    );

    if (!cands || cands.length === 0) return;
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

    // Check if the current broker has other candidates in DAERA OFFICE that are NOT updated
    const [otherCands]: any = await pool.query(
      `SELECT id, facePhotoUrl, fullBodyPhotoUrl, Youtube_URL, quickVideoUrl 
       FROM Candidate 
       WHERE brokerId = ? AND id != ?`,
      [currentBrokerId, candidateId]
    );

    const nonUpdatedOthers = (otherCands || []).filter((other: any) => {
      const img = Boolean(other.facePhotoUrl || other.fullBodyPhotoUrl);
      const vid = Boolean(other.Youtube_URL || other.quickVideoUrl);
      return !(img && vid);
    });

    if (nonUpdatedOthers.length === 0) {
      // Case A: All other candidates in this broker are updated (or this was the only candidate)!
      // The broker should not be duplicated; it should only exist in DAERA OFFICE 2.
      const [existingBrokerInD2]: any = await pool.query(
        `SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1`,
        [brokerName, daera2LeaderId]
      );

      if (existingBrokerInD2 && existingBrokerInD2.length > 0) {
        const targetBrokerId = existingBrokerInD2[0].id;
        // Move all candidates of currentBroker to the existing broker in DAERA OFFICE 2
        await pool.query('UPDATE Candidate SET brokerId = ? WHERE brokerId = ?', [targetBrokerId, currentBrokerId]);
        await pool.query('UPDATE QuickRegistration SET brokerId = ? WHERE brokerId = ?', [targetBrokerId, currentBrokerId]);
        // Delete redundant empty broker from DAERA OFFICE
        await pool.query('DELETE FROM Broker WHERE id = ?', [currentBrokerId]);
        console.log(`[LEADER-SYNC] Merged broker "${brokerName}" into DAERA OFFICE 2 (${targetBrokerId})`);
      } else {
        // Move the broker itself to DAERA OFFICE 2
        await pool.query('UPDATE Broker SET leaderId = ? WHERE id = ?', [daera2LeaderId, currentBrokerId]);
        console.log(`[LEADER-SYNC] Moved broker "${brokerName}" (${currentBrokerId}) to DAERA OFFICE 2`);
      }
    } else {
      // Case B: The current broker STILL HAS non-updated candidates in DAERA OFFICE.
      // "the broker will be in both leader folders only if it has both updated and non-updated candidates."
      let targetBrokerId: string;
      const [existingBrokerInD2]: any = await pool.query(
        `SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1`,
        [brokerName, daera2LeaderId]
      );

      if (existingBrokerInD2 && existingBrokerInD2.length > 0) {
        targetBrokerId = existingBrokerInD2[0].id;
      } else {
        targetBrokerId = 'cb' + generateId().slice(0, 23);
        try {
          await pool.query(
            'INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, ?, NOW(3), ?)',
            [targetBrokerId, brokerName, daera2LeaderId, cand.isLocked ? 1 : 0]
          );
        } catch (insertErr: any) {
          // If unique constraint on `name` prevents duplicate name across leaders,
          // find existing broker by name
          const [byName]: any = await pool.query('SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) LIMIT 1', [brokerName]);
          if (byName && byName.length > 0) {
            targetBrokerId = byName[0].id;
            await pool.query('UPDATE Broker SET leaderId = ? WHERE id = ?', [daera2LeaderId, targetBrokerId]);
          } else {
            throw insertErr;
          }
        }
      }

      // Move this updated candidate to the broker in DAERA OFFICE 2
      await pool.query('UPDATE Candidate SET brokerId = ? WHERE id = ?', [targetBrokerId, candidateId]);
      console.log(`[LEADER-SYNC] Moved candidate ${candidateId} to broker "${brokerName}" in DAERA OFFICE 2 (${targetBrokerId})`);
    }

    // Extra safety cleanup: Check if the original broker in DAERA OFFICE now has 0 candidates
    const [remainingInOld]: any = await pool.query(
      'SELECT COUNT(id) as count FROM Candidate WHERE brokerId = ?',
      [currentBrokerId]
    );
    if (remainingInOld && remainingInOld[0]?.count === 0) {
      // Check if a broker with the same name exists in DAERA OFFICE 2
      const [hasD2]: any = await pool.query(
        `SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1`,
        [brokerName, daera2LeaderId]
      );
      if (hasD2 && hasD2.length > 0 && hasD2[0].id !== currentBrokerId) {
        await pool.query('UPDATE QuickRegistration SET brokerId = ? WHERE brokerId = ?', [hasD2[0].id, currentBrokerId]);
        await pool.query('DELETE FROM Broker WHERE id = ?', [currentBrokerId]);
        console.log(`[LEADER-SYNC] Cleaned up empty duplicate broker "${brokerName}" (${currentBrokerId}) from DAERA OFFICE`);
      }
    }
  } catch (err) {
    console.error('[LEADER-SYNC] Error in checkAndMoveCandidateToDaera2:', err);
  }
}
