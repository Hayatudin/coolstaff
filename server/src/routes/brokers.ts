import { Router, Request, Response } from 'express';
import {
  db,
  pool,
  broker as brokerTable,
  leader as leaderTable,
  candidate as candidateTable,
  quickRegistration as quickRegistrationTable,
  generatedCv as generatedCvTable,
  generateId,
} from '../db';
import { eq, inArray, count } from 'drizzle-orm';
import { getSession } from '../lib/auth-helper';

const router = Router();

// Helper: fetch isLocked values for all brokers via raw SQL
async function getBrokerLockMap(): Promise<Record<string, boolean>> {
  try {
    const [rows]: any = await pool.query('SELECT id, isLocked FROM Broker');
    const map: Record<string, boolean> = {};
    for (const row of rows) {
      map[row.id] = row.isLocked === 1 || row.isLocked === true;
    }
    return map;
  } catch (e) {
    console.warn('[BROKER] Could not fetch isLocked column via raw SQL:', e);
    return {};
  }
}

// Helper: fetch single broker isLocked via raw SQL
async function getBrokerIsLocked(id: string): Promise<boolean> {
  try {
    const [rows]: any = await pool.query('SELECT isLocked FROM Broker WHERE id = ?', [id]);
    if (!rows || rows.length === 0) return false;
    return rows[0].isLocked === 1 || rows[0].isLocked === true;
  } catch (e) {
    console.warn('[BROKER] Could not fetch isLocked for broker', id, e);
    return false;
  }
}

// Helper: set broker isLocked via raw SQL
async function setBrokerIsLocked(id: string, locked: boolean): Promise<void> {
  await pool.query('UPDATE Broker SET isLocked = ? WHERE id = ?', [locked ? 1 : 0, id]);
}

// GET /api/brokers
router.get('/', async (req: Request, res: Response) => {
  try {
    const brokersList = await db.select().from(brokerTable);
    const leadersList = await db.select().from(leaderTable);
    
    const leaderMap = new Map<string, any>();
    leadersList.forEach(l => leaderMap.set(l.id, l));

    const candidateCountsList = await db
      .select({
        brokerId: candidateTable.brokerId,
        count: count(candidateTable.id),
      })
      .from(candidateTable)
      .groupBy(candidateTable.brokerId);

    const candCountMap = new Map<string, number>();
    candidateCountsList.forEach(c => {
      if (c.brokerId) candCountMap.set(c.brokerId, c.count);
    });

    const lockMap = await getBrokerLockMap();

    const augmented = [];
    for (const b of brokersList) {
      const candidates = await db
        .select({
          id: candidateTable.id,
          givenNames: candidateTable.givenNames,
          surname: candidateTable.surname,
          passportNumber: candidateTable.passportNumber,
          facePhotoUrl: candidateTable.facePhotoUrl,
          fullBodyPhotoUrl: candidateTable.fullBodyPhotoUrl,
        })
        .from(candidateTable)
        .where(eq(candidateTable.brokerId, b.id));

      const candidatesWithCVs = [];
      for (const cand of candidates) {
        const cvs = await db
          .select({
            id: generatedCvTable.id,
            templateId: generatedCvTable.templateId,
          })
          .from(generatedCvTable)
          .where(eq(generatedCvTable.candidateId, cand.id));

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
  } catch (error: any) {
    console.error('Error fetching brokers:', error);
    res.status(500).json({ 
      error: 'Failed to fetch brokers',
      message: error?.message || String(error)
    });
  }
});

// POST /api/brokers
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, leaderId } = req.body;
    if (!name) return res.status(400).json({ error: 'Broker name is required' });

    const brokerId = 'cb' + generateId().slice(0, 23);

    await pool.query(
      'INSERT INTO Broker (id, name, leaderId, createdAt, isLocked) VALUES (?, ?, ?, NOW(3), 0)',
      [brokerId, name.trim(), leaderId || null]
    );

    const [brokerRows]: any = await pool.query(
      'SELECT id, name, leaderId, createdAt, isLocked FROM Broker WHERE id = ?',
      [brokerId]
    );

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
        const [leaderRows]: any = await pool.query(
          "SELECT id FROM Leader WHERE name = 'DAERA OFFICE' LIMIT 1"
        );
        let daeraLeaderId = null;
        if (leaderRows && leaderRows.length > 0) {
          daeraLeaderId = leaderRows[0].id;
        } else {
          const generatedLeaderId = 'cl' + generateId().slice(0, 23);
          await pool.query(
            'INSERT INTO Leader (id, name, createdAt) VALUES (?, ?, NOW(3))',
            [generatedLeaderId, 'DAERA OFFICE']
          );
          daeraLeaderId = generatedLeaderId;
        }
        
        if (daeraLeaderId) {
          await pool.query(
            'UPDATE Broker SET leaderId = ? WHERE id = ?',
            [daeraLeaderId, brokerObj.id]
          );
          brokerObj.leaderId = daeraLeaderId;
        }
      } catch (e) {
        console.warn('[BROKER-CREATE] Failed to auto-assign/create DAERA OFFICE leader:', e);
      }
    }
    
    res.json(brokerObj);
  } catch (error: any) {
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
router.post('/move-candidates-bulk', async (req: Request, res: Response) => {
  try {
    const { candidateIds, targetBrokerId } = req.body;

    if (!candidateIds || !Array.isArray(candidateIds) || candidateIds.length === 0) {
      return res.status(400).json({ error: 'Candidate IDs array is required' });
    }
    if (!targetBrokerId) {
      return res.status(400).json({ error: 'Target broker ID is required' });
    }

    const targetBroker = await db.select().from(brokerTable).where(eq(brokerTable.id, targetBrokerId));
    if (targetBroker.length === 0) {
      return res.status(404).json({ error: 'Target broker not found' });
    }

    await db
      .update(candidateTable)
      .set({ brokerId: targetBrokerId })
      .where(inArray(candidateTable.id, candidateIds));

    res.json({
      success: true,
      movedCount: candidateIds.length,
      message: `Successfully moved ${candidateIds.length} candidate(s) to "${targetBroker[0].name}"`
    });
  } catch (error: any) {
    console.error('Failed to move candidates in bulk:', error);
    res.status(500).json({ error: error.message || 'Failed to move candidates' });
  }
});

// GET /api/brokers/:id/candidates
router.get('/:id/candidates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { search, interval, startDate, endDate } = req.query;

    const [brokerRows]: any = await pool.query('SELECT * FROM Broker WHERE id = ? LIMIT 1', [id]);
    if (!brokerRows || brokerRows.length === 0) {
      return res.status(404).json({ error: 'Broker not found' });
    }
    const brokerObj = brokerRows[0];

    let sqlQuery = 'SELECT * FROM Candidate WHERE brokerId = ?';
    const sqlParams: any[] = [id];

    if (interval && interval !== 'ALL') {
      const now = new Date();
      let from = new Date(now);
      if (interval === '1D') from.setDate(from.getDate() - 1);
      else if (interval === '1W') from.setDate(from.getDate() - 7);
      else if (interval === '1M') from.setMonth(from.getMonth() - 1);
      else if (interval === '1Y') from.setFullYear(from.getFullYear() - 1);
      sqlQuery += ' AND registeredAt >= ?';
      sqlParams.push(from);
    }
    if (startDate) {
      sqlQuery += ' AND registeredAt >= ?';
      sqlParams.push(new Date(startDate as string));
    }
    if (endDate) {
      sqlQuery += ' AND registeredAt <= ?';
      sqlParams.push(new Date(endDate as string));
    }
    if (search) {
      sqlQuery += ' AND (givenNames LIKE ? OR surname LIKE ? OR passportNumber LIKE ?)';
      const s = `%${search}%`;
      sqlParams.push(s, s, s);
    }

    sqlQuery += ' ORDER BY registeredAt DESC';

    const [candidates]: any = await pool.query(sqlQuery, sqlParams);

    const candidatesWithCVs = [];
    for (const cand of candidates) {
      const cvs = await db
        .select({
          id: generatedCvTable.id,
          templateId: generatedCvTable.templateId,
          facePhotoUrl: generatedCvTable.facePhotoUrl,
          fullBodyPhotoUrl: generatedCvTable.fullBodyPhotoUrl,
          createdAt: generatedCvTable.createdAt,
        })
        .from(generatedCvTable)
        .where(eq(generatedCvTable.candidateId, cand.id));

      candidatesWithCVs.push({
        ...cand,
        generatedCVs: cvs,
      });
    }

    const isLocked = await getBrokerIsLocked(id);
    const session = await getSession(req);
    const role = (session?.user as any)?.role;
    const isSuperAdmin = role === 'super_admin';

    const augmentedBroker = {
      ...brokerObj,
      leaderId: brokerObj.leaderId || null,
      isLocked,
      candidates: candidatesWithCVs.map((c: any) => ({
        ...c,
        isLocked: c.isLocked === 1 || c.isLocked === true,
        cvDownloaded: c.cvDownloaded === 1 || c.cvDownloaded === true,
        price: isSuperAdmin ? (c.price || null) : null,
      })),
    };

    res.json(augmentedBroker);
  } catch (error) {
    console.error('Error fetching broker candidates:', error);
    res.status(500).json({ error: 'Failed to fetch broker candidates' });
  }
});

// POST /api/brokers/:id/move-candidates
router.post('/:id/move-candidates', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { targetBrokerId } = req.body;

    if (!targetBrokerId) {
      return res.status(400).json({ error: 'Target broker ID is required' });
    }
    if (id === targetBrokerId) {
      return res.status(400).json({ error: 'Cannot move candidates to the same broker' });
    }

    const sourceBroker = await db.select().from(brokerTable).where(eq(brokerTable.id, id));
    if (sourceBroker.length === 0) return res.status(404).json({ error: 'Source broker not found' });

    const targetBroker = await db.select().from(brokerTable).where(eq(brokerTable.id, targetBrokerId));
    if (targetBroker.length === 0) return res.status(404).json({ error: 'Target broker not found' });

    await db.update(candidateTable).set({ brokerId: targetBrokerId }).where(eq(candidateTable.brokerId, id));
    await db.update(quickRegistrationTable).set({ brokerId: targetBrokerId }).where(eq(quickRegistrationTable.brokerId, id));

    res.json({
      success: true,
      message: `Successfully moved candidate(s) from "${sourceBroker[0].name}" to "${targetBroker[0].name}"`
    });
  } catch (error: any) {
    console.error('Failed to move candidates:', error);
    res.status(500).json({ error: error.message || 'Failed to move candidates' });
  }
});

// DELETE /api/brokers/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const broker = await db.select().from(brokerTable).where(eq(brokerTable.id, id));
    if (broker.length === 0) return res.status(404).json({ error: 'Broker not found' });

    await db.update(candidateTable).set({ brokerId: null }).where(eq(candidateTable.brokerId, id));
    await db.update(quickRegistrationTable).set({ brokerId: null }).where(eq(quickRegistrationTable.brokerId, id));
    await db.delete(brokerTable).where(eq(brokerTable.id, id));

    res.json({ success: true, message: `Broker "${broker[0].name}" deleted successfully` });
  } catch (error: any) {
    console.error('Failed to delete broker:', error);
    res.status(500).json({ error: error.message || 'Failed to delete broker' });
  }
});

// PATCH /api/brokers/:id/toggle-lock
router.patch('/:id/toggle-lock', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const currentLockState = await getBrokerIsLocked(id);
    const newLockState = !currentLockState;

    await setBrokerIsLocked(id, newLockState);

    const broker = await db.select().from(brokerTable).where(eq(brokerTable.id, id));
    if (broker.length === 0) return res.status(404).json({ error: 'Broker not found' });

    res.json({
      ...broker[0],
      isLocked: newLockState
    });
  } catch (error: any) {
    console.error('Failed to toggle broker lock:', error);
    res.status(500).json({ error: error.message || 'Failed to toggle broker lock' });
  }
});

// POST /api/brokers/move-bulk
router.post('/move-bulk', async (req: Request, res: Response) => {
  try {
    const { brokerIds, leaderId } = req.body;

    if (!brokerIds || !Array.isArray(brokerIds) || brokerIds.length === 0) {
      return res.status(400).json({ error: 'Broker IDs array is required' });
    }

    if (leaderId) {
      const leaders = await db.select().from(leaderTable).where(eq(leaderTable.id, leaderId));
      if (leaders.length === 0) return res.status(404).json({ error: 'Target leader not found' });
    }

    await db
      .update(brokerTable)
      .set({ leaderId: leaderId || null })
      .where(inArray(brokerTable.id, brokerIds));

    res.json({ success: true, movedCount: brokerIds.length });
  } catch (error: any) {
    console.error('Failed to move brokers in bulk:', error);
    res.status(500).json({ error: error.message || 'Failed to move brokers in bulk' });
  }
});

// PATCH /api/brokers/:id/leader
router.patch('/:id/leader', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { leaderId } = req.body;

    const broker = await db.select().from(brokerTable).where(eq(brokerTable.id, id));
    if (broker.length === 0) return res.status(404).json({ error: 'Broker not found' });

    let leaderObj = null;
    if (leaderId) {
      const leaders = await db.select().from(leaderTable).where(eq(leaderTable.id, leaderId));
      if (leaders.length === 0) return res.status(404).json({ error: 'Target leader not found' });
      leaderObj = leaders[0];
    }

    await db.update(brokerTable).set({ leaderId: leaderId || null }).where(eq(brokerTable.id, id));

    res.json({
      ...broker[0],
      leaderId: leaderId || null,
      leader: leaderObj
    });
  } catch (error: any) {
    console.error('Failed to update broker leader:', error);
    res.status(500).json({ error: error.message || 'Failed to update broker leader' });
  }
});

// POST /api/brokers/:id/change-template
router.post('/:id/change-template', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { templateId } = req.body;

    if (!templateId) return res.status(400).json({ error: 'Template ID is required' });

    const brokerCandidates = await db.select().from(candidateTable).where(eq(candidateTable.brokerId, id));
    if (brokerCandidates.length === 0) {
      return res.json({ success: true, updatedCount: 0, message: 'No candidates found under broker' });
    }

    let updatedCount = 0;
    for (const cand of brokerCandidates) {
      const existingCvs = await db.select().from(generatedCvTable).where(eq(generatedCvTable.candidateId, cand.id));
      if (existingCvs.length > 0) {
        await db.update(generatedCvTable).set({ templateId }).where(eq(generatedCvTable.id, existingCvs[0].id));
      } else {
        await db.insert(generatedCvTable).values({
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
  } catch (error: any) {
    console.error('Failed to change broker templates:', error);
    res.status(500).json({ error: error.message || 'Failed to change broker templates' });
  }
});

export default router;
