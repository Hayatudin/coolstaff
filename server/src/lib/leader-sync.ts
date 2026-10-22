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
 * Checks if a SINGLE candidate has both image and video updated.
 * If the candidate is currently in DAERA OFFICE:
 *   - Move ONLY this specific candidate to DAERA OFFICE 2 (not all candidates under the broker).
 *   - If broker still has other (non-updated) candidates in DAERA OFFICE, the broker is
 *     duplicated: original stays in DAERA OFFICE, a copy is created in DAERA OFFICE 2.
 *   - If broker has NO more candidates left in DAERA OFFICE after the move, clean up
 *     the empty broker from DAERA OFFICE.
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

    // Find or create a matching broker in DAERA OFFICE 2 for this candidate
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
        // If unique constraint prevents duplicate, find existing
        const [byName]: any = await pool.query(
          'SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1',
          [brokerName, daera2LeaderId]
        );
        if (byName && byName.length > 0) {
          targetBrokerId = byName[0].id;
        } else {
          throw insertErr;
        }
      }
    }

    // Move ONLY THIS candidate to the broker in DAERA OFFICE 2
    await pool.query('UPDATE Candidate SET brokerId = ? WHERE id = ?', [targetBrokerId, candidateId]);
    console.log(`[LEADER-SYNC] Moved candidate ${candidateId} to broker "${brokerName}" in DAERA OFFICE 2 (${targetBrokerId})`);

    // Also update QuickRegistration for this specific candidate if applicable
    try {
      const [qrRows]: any = await pool.query(
        'SELECT id FROM QuickRegistration WHERE promotedCandidateId = ?',
        [candidateId]
      );
      for (const qr of qrRows || []) {
        await pool.query('UPDATE QuickRegistration SET brokerId = ? WHERE id = ?', [targetBrokerId, qr.id]);
      }
    } catch (_) {}

    // Cleanup: Check if the original broker in DAERA OFFICE now has 0 candidates
    const [remainingInOld]: any = await pool.query(
      'SELECT COUNT(id) as count FROM Candidate WHERE brokerId = ?',
      [currentBrokerId]
    );
    if (remainingInOld && remainingInOld[0]?.count === 0) {
      // No candidates left in the original broker — check if QR references exist
      const [qrCount]: any = await pool.query(
        'SELECT COUNT(id) as count FROM QuickRegistration WHERE brokerId = ? AND promotedCandidateId IS NULL',
        [currentBrokerId]
      );
      if (!qrCount || qrCount[0]?.count === 0) {
        // Safe to remove empty broker from DAERA OFFICE
        await pool.query('DELETE FROM Broker WHERE id = ?', [currentBrokerId]);
        console.log(`[LEADER-SYNC] Cleaned up empty broker "${brokerName}" (${currentBrokerId}) from DAERA OFFICE`);
      }
    }
  } catch (err) {
    console.error('[LEADER-SYNC] Error in checkAndMoveCandidateToDaera2:', err);
  }
}

/**
 * Scans DAERA OFFICE 2 and moves any candidate who does NOT have BOTH
 * photo (face or full body) AND video (Youtube_URL or quickVideoUrl)
 * back to DAERA OFFICE under their broker.
 * Then cleans up any brokers in DAERA OFFICE 2 that are left with 0 candidates.
 */
export async function rebalanceDaeraOfficeCandidates(): Promise<{ movedBackCount: number }> {
  try {
    const { daeraLeaderId, daera2LeaderId } = await getOrCreateDaeraLeaders();

    // 1. Fetch all candidates under brokers assigned to DAERA OFFICE 2
    const [d2Cands]: any = await pool.query(
      `SELECT c.id, c.brokerId, c.facePhotoUrl, c.fullBodyPhotoUrl, c.Youtube_URL, c.quickVideoUrl,
              b.name as brokerName, b.isLocked
       FROM Candidate c
       JOIN Broker b ON c.brokerId = b.id
       WHERE b.leaderId = ?`,
      [daera2LeaderId]
    );

    let movedBackCount = 0;

    for (const cand of d2Cands || []) {
      const hasPhoto = Boolean((cand.facePhotoUrl && cand.facePhotoUrl.trim()) || (cand.fullBodyPhotoUrl && cand.fullBodyPhotoUrl.trim()));
      const hasVideo = Boolean((cand.Youtube_URL && cand.Youtube_URL.trim()) || (cand.quickVideoUrl && cand.quickVideoUrl.trim()));

      if (hasPhoto && hasVideo) {
        // This candidate genuinely belongs in DAERA OFFICE 2!
        continue;
      }

      // Candidate does NOT have both photo and video — MUST move back to DAERA OFFICE
      const brokerName = cand.brokerName;

      // Find or create broker with same name in DAERA OFFICE
      let targetD1BrokerId: string;
      const [existingD1]: any = await pool.query(
        'SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1',
        [brokerName, daeraLeaderId]
      );

      if (existingD1 && existingD1.length > 0) {
        targetD1BrokerId = existingD1[0].id;
      } else {
        targetD1BrokerId = 'cb' + generateId().slice(0, 23);
        try {
          await pool.query(
            'INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, ?, NOW(3), ?)',
            [targetD1BrokerId, brokerName, daeraLeaderId, cand.isLocked ? 1 : 0]
          );
        } catch (insertErr) {
          const [byName]: any = await pool.query(
            'SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1',
            [brokerName, daeraLeaderId]
          );
          if (byName && byName.length > 0) {
            targetD1BrokerId = byName[0].id;
          } else {
            console.error('[LEADER-SYNC] Could not insert broker into DAERA OFFICE:', insertErr);
            continue;
          }
        }
      }

      // Move candidate back to DAERA OFFICE
      await pool.query('UPDATE Candidate SET brokerId = ? WHERE id = ?', [targetD1BrokerId, cand.id]);
      try {
        await pool.query('UPDATE QuickRegistration SET brokerId = ? WHERE promotedCandidateId = ?', [targetD1BrokerId, cand.id]);
      } catch (_) {}

      movedBackCount++;
    }

    // 2. Clean up any brokers in DAERA OFFICE 2 that now have 0 candidates
    const [d2Brokers]: any = await pool.query(
      'SELECT id, name FROM Broker WHERE leaderId = ?',
      [daera2LeaderId]
    );

    for (const b of d2Brokers || []) {
      const [countRes]: any = await pool.query(
        'SELECT COUNT(id) as count FROM Candidate WHERE brokerId = ?',
        [b.id]
      );
      if (countRes && countRes[0]?.count === 0) {
        const [qrCount]: any = await pool.query(
          'SELECT COUNT(id) as count FROM QuickRegistration WHERE brokerId = ? AND promotedCandidateId IS NULL',
          [b.id]
        );
        if (!qrCount || qrCount[0]?.count === 0) {
          await pool.query('DELETE FROM Broker WHERE id = ?', [b.id]);
          console.log(`[LEADER-SYNC] Cleaned up empty broker "${b.name}" (${b.id}) from DAERA OFFICE 2`);
        }
      }
    }

    console.log(`[LEADER-SYNC] Rebalanced DAERA OFFICE 2: moved ${movedBackCount} non-updated candidates back to DAERA OFFICE.`);
    return { movedBackCount };
  } catch (err) {
    console.error('[LEADER-SYNC] Rebalancing error:', err);
    return { movedBackCount: 0 };
  }
}

