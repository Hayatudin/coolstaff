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
 * the candidate's broker belongs to 'DAERA OFFICE 2' (the 'new' category).
 */
export async function ensureBrokerInDaera2(brokerId: string): Promise<string> {
  if (!brokerId) return brokerId;
  try {
    const { daera2LeaderId } = await getOrCreateDaeraLeaders();
    const [bRows]: any = await pool.query(
      'SELECT id, name, leaderId, isLocked FROM Broker WHERE id = ? LIMIT 1',
      [brokerId]
    );
    if (!bRows || bRows.length === 0) return brokerId;
    const b = bRows[0];

    // If broker is already in DAERA OFFICE 2, return directly
    if (b.leaderId === daera2LeaderId) {
      return brokerId;
    }

    // Find or create matching broker under DAERA OFFICE 2 (never mutate existing broker in-place)
    const [d2Brokers]: any = await pool.query(
      'SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1',
      [b.name, daera2LeaderId]
    );
    if (d2Brokers && d2Brokers.length > 0) {
      return d2Brokers[0].id;
    }

    const newD2BrokerId = 'cb' + generateId().slice(0, 23);
    try {
      await pool.query(
        'INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, ?, NOW(3), ?)',
        [newD2BrokerId, b.name, daera2LeaderId, b.isLocked ? 1 : 0]
      );
      return newD2BrokerId;
    } catch (dupErr) {
      const [byName]: any = await pool.query(
        'SELECT id FROM Broker WHERE UPPER(name) = UPPER(?) AND leaderId = ? LIMIT 1',
        [b.name, daera2LeaderId]
      );
      if (byName && byName.length > 0) {
        return byName[0].id;
      }
      return brokerId;
    }
  } catch (e) {
    console.warn('[LEADER-SYNC] Failed to ensure broker in DAERA OFFICE 2:', e);
    return brokerId;
  }
}

/**
 * Ensures that a broker belongs to 'DAERA OFFICE' (for legacy backward compatibility).
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

    if (!b.leaderId) {
      await pool.query('UPDATE Broker SET leaderId = ? WHERE id = ?', [daeraLeaderId, brokerId]);
      return brokerId;
    }

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
 * Moves a candidate to DAERA OFFICE 2 (the "New" category) and ensures their
 * GeneratedCV record is present under their assigned agency.
 */
export async function checkAndMoveCandidateToDaera2(candidateId: string): Promise<void> {
  if (!candidateId) return;

  try {
    // 1. Fetch candidate with broker and leader details
    const [cands]: any = await pool.query(
      `SELECT c.id, c.brokerId, c.facePhotoUrl, c.fullBodyPhotoUrl, c.Youtube_URL, c.quickVideoUrl, c.agency, c.passportNumber,
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

    if (!cand.brokerId) {
      return;
    }

    const { daera2LeaderId } = await getOrCreateDaeraLeaders();
    const currentLeaderName = (cand.leaderName || '').toUpperCase().trim();
    const isAlreadyInD2 = currentLeaderName === 'DAERA OFFICE 2' || currentLeaderName === 'DAIRA OFFICE 2' || cand.leaderId === daera2LeaderId;

    let targetBrokerId = cand.brokerId;
    const currentBrokerId = cand.brokerId;
    const brokerName = cand.brokerName || 'Independent';

    if (!isAlreadyInD2) {
      // Find or create matching broker in DAERA OFFICE 2
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

      // Update QuickRegistration if applicable
      try {
        await pool.query('UPDATE QuickRegistration SET brokerId = ? WHERE promotedCandidateId = ?', [targetBrokerId, candidateId]);
      } catch (_) {}

      // Clean up original broker in DAERA OFFICE if now empty
      const [remainingInOld]: any = await pool.query(
        'SELECT COUNT(id) as count FROM Candidate WHERE brokerId = ?',
        [currentBrokerId]
      );
      if (remainingInOld && remainingInOld[0]?.count === 0) {
        const [qrCount]: any = await pool.query(
          'SELECT COUNT(id) as count FROM QuickRegistration WHERE brokerId = ? AND promotedCandidateId IS NULL',
          [currentBrokerId]
        );
        if (!qrCount || qrCount[0]?.count === 0) {
          await pool.query('DELETE FROM Broker WHERE id = ?', [currentBrokerId]);
          console.log(`[LEADER-SYNC] Cleaned up empty broker "${brokerName}" (${currentBrokerId}) from DAERA OFFICE`);
        }
      }
    }

    // 2. Ensure GeneratedCV record exists for this candidate under their own agency
    try {
      const [existingCvs]: any = await pool.query(
        'SELECT id, templateId FROM GeneratedCV WHERE candidateId = ? LIMIT 1',
        [candidateId]
      );

      const validTemplates = ['ussus', 'al-shablan', 'alm', 'almala', 'ka7', 'ku2', 'ma', 'ra', 'vision'];
      let targetAgency = cand.agency;
      
      if (!targetAgency || !validTemplates.includes(targetAgency.toLowerCase())) {
        const [qr]: any = await pool.query(
          'SELECT office, agency FROM QuickRegistration WHERE promotedCandidateId = ? OR UPPER(TRIM(passportNumber)) = UPPER(TRIM(?)) LIMIT 1',
          [candidateId, cand.passportNumber || '']
        );
        if (qr && qr.length > 0) {
          const qrOffice = qr[0].office || qr[0].agency;
          if (qrOffice && validTemplates.includes(qrOffice.toLowerCase())) {
            targetAgency = qrOffice.toLowerCase();
          }
        }
      }

      const finalAgency = (targetAgency && validTemplates.includes(targetAgency.toLowerCase())) ? targetAgency.toLowerCase() : 'alm';

      if (!existingCvs || existingCvs.length === 0) {
        const newCvId = 'cv' + generateId().slice(0, 23);
        await pool.query(
          'INSERT INTO GeneratedCV (id, candidateId, templateId, facePhotoUrl, fullBodyPhotoUrl, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, NOW(3), NOW(3))',
          [newCvId, candidateId, finalAgency, cand.facePhotoUrl || null, cand.fullBodyPhotoUrl || null]
        );
        console.log(`[LEADER-SYNC] Created GeneratedCV for candidate ${candidateId} under template "${finalAgency}"`);
      } else {
        await pool.query(
          'UPDATE GeneratedCV SET facePhotoUrl = COALESCE(?, facePhotoUrl), fullBodyPhotoUrl = COALESCE(?, fullBodyPhotoUrl), updatedAt = NOW(3) WHERE candidateId = ?',
          [cand.facePhotoUrl || null, cand.fullBodyPhotoUrl || null, candidateId]
        );
      }

      // Ensure candidate.agency matches
      await pool.query('UPDATE Candidate SET agency = ? WHERE id = ?', [finalAgency, candidateId]);
    } catch (cvErr) {
      console.warn('[LEADER-SYNC] Error ensuring GeneratedCV:', cvErr);
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

    // 1. Fetch all candidates under brokers assigned to ANY DAERA OFFICE 2 leader
    const [d2Cands]: any = await pool.query(
      `SELECT c.id, c.brokerId, c.facePhotoUrl, c.fullBodyPhotoUrl, c.Youtube_URL, c.quickVideoUrl, c.passportNumber,
              b.name as brokerName, b.isLocked
       FROM Candidate c
       JOIN Broker b ON c.brokerId = b.id
       JOIN Leader l ON b.leaderId = l.id
       WHERE UPPER(l.name) IN ('DAERA OFFICE 2', 'DAIRA OFFICE 2')`
    );

    let movedBackCount = 0;

    for (const cand of d2Cands || []) {
      const pNum = (cand.passportNumber || '').trim().toUpperCase();
      let hasVp = false;
      if (pNum) {
        try {
          const [vp]: any = await pool.query(
            'SELECT videoUrl, facePhotoUrl, fullBodyPhotoUrl FROM `UploadedVideoProfile` WHERE UPPER(`passportNumber`) = ? LIMIT 1',
            [pNum]
          );
          if (vp && vp.length > 0) {
            hasVp = Boolean(vp[0].videoUrl || vp[0].facePhotoUrl || vp[0].fullBodyPhotoUrl);
          }
        } catch (_) {}
      }

      const hasPhoto = Boolean(
        (cand.facePhotoUrl && cand.facePhotoUrl.trim() !== '') ||
        (cand.fullBodyPhotoUrl && cand.fullBodyPhotoUrl.trim() !== '')
      );
      const hasVideo = Boolean(
        (cand.Youtube_URL && cand.Youtube_URL.trim() !== '') ||
        (cand.quickVideoUrl && cand.quickVideoUrl.trim() !== '')
      );

      // Only candidates with photo or video stay in DAERA OFFICE 2
      if (hasPhoto || hasVideo || hasVp) {
        continue;
      }

      // Candidate does NOT have updated photo or video — MUST move back to DAERA OFFICE
      const brokerName = cand.brokerName || 'Independent';

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
      `SELECT b.id, b.name 
       FROM Broker b 
       JOIN Leader l ON b.leaderId = l.id 
       WHERE UPPER(l.name) IN ('DAERA OFFICE 2', 'DAIRA OFFICE 2')`
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

