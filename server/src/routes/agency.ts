import { Router, Request, Response } from 'express';
import {
  db,
  pool,
  candidate as candidateTable,
  generatedCv as generatedCvTable,
  invoice as invoiceTable,
  broker as brokerTable,
  user as userTable,
  notification as notificationTable,
} from '../db';
import { eq, count, inArray } from 'drizzle-orm';
import { getSession } from '../lib/auth-helper';
import { encryptPath } from '../lib/crypto';

const router = Router();

// Auto-verify and create missing columns in Candidate table to prevent crashes on stale databases
async function ensureCandidateColumns() {
  try {
    const [columns]: any = await pool.query('SHOW COLUMNS FROM `Candidate`');
    const existingFields = new Set(columns.map((c: any) => c.Field.toLowerCase()));
    
    const requiredColumns = [
      { name: 'embassyIssue', definition: "VARCHAR(191) DEFAULT 'No'" },
      { name: 'cocStatus', definition: "VARCHAR(191) DEFAULT 'No'" },
      { name: 'tasheerStatus', definition: "VARCHAR(191) DEFAULT 'No'" },
      { name: 'wakalaStatus', definition: "VARCHAR(191) DEFAULT 'Unpaid'" },
      { name: 'qrCodeStatus', definition: "VARCHAR(191) DEFAULT 'No'" },
      { name: 'selectedType', definition: "VARCHAR(191) DEFAULT 'Private'" },
      { name: 'travelDate', definition: "DATETIME(3) NULL" },
      { name: 'agencyStatus', definition: "VARCHAR(191) DEFAULT 'Under Process'" }
    ];

    for (const col of requiredColumns) {
      if (!existingFields.has(col.name.toLowerCase())) {
        console.log(`[DATABASE SETUP] Column '${col.name}' is missing in Candidate table. Adding it...`);
        await pool.query(`ALTER TABLE \`Candidate\` ADD COLUMN \`${col.name}\` ${col.definition}`);
      }
    }
  } catch (err) {
    console.error('[DATABASE SETUP] Failed to verify/add Candidate columns:', err);
  }
}

// Kick off checking asynchronously
ensureCandidateColumns();

// Email-to-agency template ID resolver fallback mapping
function inferAgencyFromEmail(email: string): string | null {
  const e = email.toLowerCase();
  if (e.includes('ussus')) return 'ussus';
  if (e.includes('khuzam') || e.includes('ku2')) return 'ku2';
  if (e.includes('kafaat') || e.includes('ka7')) return 'ka7';
  if (e.includes('almersah') || e.includes('alaalam') || e.includes('alm')) return 'alm';
  if (e.includes('almala')) return 'almala';
  if (e.includes('rayaat') || e.includes('ra')) return 'ra';
  if (e.includes('shablan')) return 'al-shablan';
  if (e.includes('vision')) return 'vision';
  if (e.includes('ma')) return 'ma';
  return null;
}

// Check and auto-heal agency value in database
async function resolveAndHealAgency(user: any): Promise<string | null> {
  if (user.agency) return user.agency;
  
  if (user.email) {
    const inferred = inferAgencyFromEmail(user.email);
    if (inferred) {
      console.log(`[AUTH-HEAL] Inferred agency '${inferred}' for user '${user.email}'. Auto-healing user record in DB...`);
      try {
        await db.update(userTable).set({ agency: inferred }).where(eq(userTable.id, user.id));
      } catch (err) {
        console.error('[AUTH-HEAL] Failed to update user agency in DB:', err);
      }
      return inferred;
    }
  }
  return null;
}

// GET /api/agency/debug-info
router.get('/debug-info', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.json({ error: 'No session found on server headers' });
    }

    const role = session.user.role;
    const agencyName = await resolveAndHealAgency(session.user);

    const candCountRes = await db.select({ value: count() }).from(candidateTable);
    const cvCountRes = await db.select({ value: count() }).from(generatedCvTable);
    
    const uniqueTemplates = await db
      .select({
        templateId: generatedCvTable.templateId,
        count: count(generatedCvTable.id),
      })
      .from(generatedCvTable)
      .groupBy(generatedCvTable.templateId);

    const sampleCandidates = await db
      .select({
        id: candidateTable.id,
        givenNames: candidateTable.givenNames,
        surname: candidateTable.surname,
        agency: candidateTable.agency,
      })
      .from(candidateTable)
      .limit(5);

    res.json({
      sessionUser: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: role,
        agency: agencyName
      },
      databaseStats: {
        totalCandidates: candCountRes[0]?.value || 0,
        totalCVs: cvCountRes[0]?.value || 0,
        uniqueTemplates: uniqueTemplates.map(t => ({ templateId: t.templateId, count: t.count })),
        sampleCandidates
      }
    });
  } catch (err: any) {
    res.json({ error: err.message || String(err) });
  }
});

// GET /api/agency/candidates
router.get('/candidates', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = session.user.role;
    if (role !== 'agency' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const agencyName = await resolveAndHealAgency(session.user);
    if (role === 'agency' && !agencyName) {
      return res.status(400).json({ error: 'User is not assigned to any agency' });
    }

    const { agency } = req.query;
    
    let sqlQuery = 'SELECT c.*, b.name as brokerName FROM `Candidate` c LEFT JOIN `Broker` b ON c.brokerId = b.id';
    const sqlParams: any[] = [];
    const whereClauses: string[] = ['c.`agencySelected` = 1'];
    
    if (role === 'agency') {
      const agencyStr = agencyName!.toLowerCase();
      whereClauses.push('(LOWER(c.`agency`) = ? OR c.`id` IN (SELECT `candidateId` FROM `GeneratedCV` WHERE LOWER(`templateId`) LIKE ?))');
      whereClauses.push('(c.`isFlagged` IS NULL OR c.`isFlagged` = 0)');
      whereClauses.push('(b.`isLocked` IS NULL OR b.`isLocked` = 0)');
      sqlParams.push(agencyStr, `%${agencyStr}%`);
    } else {
      if (agency && agency !== 'all') {
        const agencyStr = String(agency).toLowerCase();
        whereClauses.push('(LOWER(c.`agency`) = ? OR c.`id` IN (SELECT `candidateId` FROM `GeneratedCV` WHERE LOWER(`templateId`) LIKE ?))');
        sqlParams.push(agencyStr, `%${agencyStr}%`);
      }
    }
    
    if (whereClauses.length > 0) {
      sqlQuery += ' WHERE ' + whereClauses.join(' AND ');
    }
    
    sqlQuery += ' ORDER BY c.`registeredAt` DESC';
    
    const [rawCands]: any = await pool.query(sqlQuery, sqlParams);
    let dbCandidates: any[] = [];
    
    if (rawCands.length > 0) {
      const candidateIds = rawCands.map((c: any) => c.id);
      const allCVs = await db
        .select({ id: generatedCvTable.id, templateId: generatedCvTable.templateId, candidateId: generatedCvTable.candidateId })
        .from(generatedCvTable)
        .where(inArray(generatedCvTable.candidateId, candidateIds));
      
      const allInvoices = await db
        .select({ candidateId: invoiceTable.candidateId, lmisQrCodeUrl: invoiceTable.lmisQrCodeUrl })
        .from(invoiceTable)
        .where(inArray(invoiceTable.candidateId, candidateIds));
      
      dbCandidates = rawCands.map((c: any) => ({
        ...c,
        generatedCVs: allCVs.filter(cv => cv.candidateId === c.id),
        invoices: allInvoices.filter(i => i.candidateId === c.id),
        broker: c.brokerName ? { name: c.brokerName } : null
      }));
    }

    res.json(dbCandidates.map((c: any) => {
      const invoicesList = c.invoices || [];
      const hasQrCode = invoicesList.some((inv: any) => inv.lmisQrCodeUrl && inv.lmisQrCodeUrl.trim() !== '');
      return {
        id: c.id,
        givenNames: c.givenNames,
        surname: c.surname,
        passportNumber: c.passportNumber,
        embassyIssue: c.embassyIssue || 'No',
        cocStatus: c.cocStatus || 'No',
        medicalStatus: c.medicalStatus || 'Pending',
        tasheerStatus: c.tasheerStatus || 'No',
        wakalaStatus: c.wakalaStatus || 'Unpaid',
        qrCodeStatus: hasQrCode ? 'Yes' : 'No',
        selectedType: c.selectedType || 'Private',
        travelDate: c.deployedDate ? new Date(c.deployedDate).toISOString() : null,
        agencyStatus: c.agencyStatus || 'Under Process',
        latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
        broker: c.broker,
        agency: c.agency,
        religion: c.religion,
        job: c.job,
        city: c.city,
        dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth).toISOString() : null,
        videoUrl: encryptPath(c.videoUrl || (c as any).Youtube_URL || null) || null,
        registeredAt: c.registeredAt ? new Date(c.registeredAt).toISOString() : null,
        allowVideo: c.allowVideo ?? false,
        visaDate: c.visaDate ? new Date(c.visaDate).toISOString() : null
      };
    }));

  } catch (err) {
    console.error('[AGENCY] Failed to fetch candidates', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// GET /api/agency/available-candidates
router.get('/available-candidates', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = session.user.role;
    if (role !== 'agency' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const agencyName = await resolveAndHealAgency(session.user);
    if (role === 'agency' && !agencyName) {
      return res.status(400).json({ error: 'User is not assigned to any agency' });
    }

    const { agency } = req.query;
    
    let sqlQuery = 'SELECT c.*, b.name as brokerName FROM `Candidate` c LEFT JOIN `Broker` b ON c.brokerId = b.id WHERE c.`agencySelected` = 0 AND (c.`id` IN (SELECT DISTINCT `candidateId` FROM `GeneratedCV`) OR UPPER(c.`passportNumber`) IN (SELECT DISTINCT UPPER(`passportNumber`) FROM `UploadedVideoProfile` WHERE `videoUrl` IS NOT NULL AND `videoUrl` != \'\'))';
    const sqlParams: any[] = [];
    const whereClauses: string[] = [];
    
    if (role === 'agency') {
      const agencyStr = agencyName!.toLowerCase();
      whereClauses.push('(LOWER(c.`agency`) = ? OR c.`id` IN (SELECT `candidateId` FROM `GeneratedCV` WHERE LOWER(`templateId`) LIKE ?))');
      whereClauses.push('(c.`isFlagged` IS NULL OR c.`isFlagged` = 0)');
      whereClauses.push('(b.`isLocked` IS NULL OR b.`isLocked` = 0)');
      sqlParams.push(agencyStr, `%${agencyStr}%`);
    } else {
      if (agency && agency !== 'all') {
        const agencyStr = String(agency).toLowerCase();
        whereClauses.push('(LOWER(c.`agency`) = ? OR c.`id` IN (SELECT `candidateId` FROM `GeneratedCV` WHERE LOWER(`templateId`) LIKE ?))');
        sqlParams.push(agencyStr, `%${agencyStr}%`);
      }
    }
    
    if (whereClauses.length > 0) {
      sqlQuery += ' AND ' + whereClauses.join(' AND ');
    }
    
    sqlQuery += ' ORDER BY c.`registeredAt` DESC';
    
    const [rawCands]: any = await pool.query(sqlQuery, sqlParams);
    let dbCandidates: any[] = [];
    
    if (rawCands.length > 0) {
      const candidateIds = rawCands.map((c: any) => c.id);
      const allCVs = await db
        .select({ id: generatedCvTable.id, templateId: generatedCvTable.templateId, candidateId: generatedCvTable.candidateId })
        .from(generatedCvTable)
        .where(inArray(generatedCvTable.candidateId, candidateIds));
      
      dbCandidates = rawCands.map((c: any) => ({
        ...c,
        generatedCVs: allCVs.filter(cv => cv.candidateId === c.id),
        broker: c.brokerName ? { name: c.brokerName } : null
      }));
    }

    let videoProfileMap = new Map<string, any>();
    try {
      const [profiles]: any = await pool.query(
        'SELECT passportNumber, videoUrl, facePhotoUrl, fullBodyPhotoUrl FROM `UploadedVideoProfile` WHERE `videoUrl` IS NOT NULL AND `videoUrl` != \'\''
      );
      for (const p of profiles) {
        videoProfileMap.set(p.passportNumber.trim().toUpperCase(), p);
      }
    } catch (_) {}

    res.json(dbCandidates.map((c: any) => {
      const pNum = (c.passportNumber || '').trim().toUpperCase();
      const profile = videoProfileMap.get(pNum);
      
      const videoUrlVal = profile ? profile.videoUrl : (c.videoUrl || (c as any).Youtube_URL || null);
      const facePhotoUrlVal = profile ? (profile.facePhotoUrl || c.facePhotoUrl) : c.facePhotoUrl;
      const fullBodyPhotoUrlVal = profile ? (profile.fullBodyPhotoUrl || c.fullBodyPhotoUrl) : c.fullBodyPhotoUrl;
      const allowVideoVal = profile ? true : (c.allowVideo === 1 || c.allowVideo === true || !!c.videoUrl);

      return {
        id: c.id,
        givenNames: c.givenNames,
        surname: c.surname,
        passportNumber: c.passportNumber,
        embassyIssue: c.embassyIssue || 'No',
        cocStatus: c.cocStatus || 'No',
        medicalStatus: c.medicalStatus || 'Pending',
        tasheerStatus: c.tasheerStatus || 'No',
        wakalaStatus: c.wakalaStatus || 'Unpaid',
        qrCodeStatus: 'No',
        selectedType: c.selectedType || 'Private',
        travelDate: c.deployedDate ? new Date(c.deployedDate).toISOString() : null,
        agencyStatus: c.agencyStatus || 'Under Process',
        latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
        broker: c.broker,
        agency: c.agency,
        religion: c.religion,
        job: c.job,
        city: c.city,
        dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth).toISOString() : null,
        videoUrl: encryptPath(videoUrlVal) || null,
        registeredAt: c.registeredAt ? new Date(c.registeredAt).toISOString() : null,
        facePhotoUrl: encryptPath(facePhotoUrlVal) || null,
        fullBodyPhotoUrl: encryptPath(fullBodyPhotoUrlVal) || null,
        passportImageUrl: encryptPath(c.passportImageUrl) || null,
        nationality: c.nationality,
        gender: c.gender,
        educationLevel: c.educationLevel,
        maritalStatus: c.maritalStatus,
        workExperience: c.workExperience,
        skills: c.skills,
        allowVideo: allowVideoVal,
        visaDate: c.visaDate ? new Date(c.visaDate).toISOString() : null
      };
    }));

  } catch (err) {
    console.error('[AGENCY] Failed to fetch available candidates', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/agency/candidates/:id/select
router.post('/candidates/:id/select', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = session.user.role;
    if (role !== 'agency' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const agencyName = await resolveAndHealAgency(session.user);
    if (role === 'agency' && !agencyName) {
      return res.status(400).json({ error: 'User is not assigned to any agency' });
    }

    const [candRow]: any = await pool.query('SELECT * FROM `Candidate` WHERE `id` = ? LIMIT 1', [id]);
    if (!candRow) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const candidate = candRow;

    if (role === 'agency') {
      if (candidate.isFlagged) {
        return res.status(403).json({ error: 'Forbidden: Candidate is flagged' });
      }

      if (candidate.brokerId) {
        const [brokerRow]: any = await pool.query('SELECT `isLocked` FROM `Broker` WHERE `id` = ? LIMIT 1', [candidate.brokerId]);
        if (brokerRow && (brokerRow.isLocked === 1 || brokerRow.isLocked === true)) {
          return res.status(403).json({ error: 'Forbidden: Candidate is locked or their broker is locked' });
        }
      }

      if (candidate.isLocked === 1 || candidate.isLocked === true) {
        return res.status(403).json({ error: 'Forbidden: Candidate is locked' });
      }
    }

    const agencyLabel = agencyName ? agencyName.toUpperCase() : 'AGENCY';

    await db.update(candidateTable).set({ agencySelected: true }).where(eq(candidateTable.id, id));

    await db.insert(notificationTable).values({
      title: 'Candidate Selected',
      message: `Candidate ${candidate.givenNames} ${candidate.surname} (${candidate.passportNumber}) has been selected by agency ${agencyLabel}.`,
      candidateId: candidate.id
    });

    const [updated]: any = await pool.query('SELECT * FROM `Candidate` WHERE `id` = ? LIMIT 1', [id]);
    res.json(updated);

  } catch (err) {
    console.error('[AGENCY] Failed to select candidate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// POST /api/agency/candidates/:id/deselect
router.post('/candidates/:id/deselect', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = session.user.role;
    if (role !== 'agency' && role !== 'super_admin') {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const agencyName = await resolveAndHealAgency(session.user);
    if (role === 'agency' && !agencyName) {
      return res.status(400).json({ error: 'User is not assigned to any agency' });
    }

    const [candRow]: any = await pool.query('SELECT * FROM `Candidate` WHERE `id` = ? LIMIT 1', [id]);
    if (!candRow) {
      return res.status(404).json({ error: 'Candidate not found' });
    }
    const candidate = candRow;

    const agencyLabel = agencyName ? agencyName.toUpperCase() : 'AGENCY';

    await db.update(candidateTable).set({ agencySelected: false }).where(eq(candidateTable.id, id));

    await db.insert(notificationTable).values({
      title: 'Candidate Deselected',
      message: `Candidate ${candidate.givenNames} ${candidate.surname} (${candidate.passportNumber}) has been deselected by agency ${agencyLabel} and returned to available candidates.`,
      candidateId: candidate.id
    });

    const [updated]: any = await pool.query('SELECT * FROM `Candidate` WHERE `id` = ? LIMIT 1', [id]);
    res.json(updated);

  } catch (err) {
    console.error('[AGENCY] Failed to deselect candidate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// PATCH /api/agency/candidates/:id
router.patch('/candidates/:id', async (req: Request, res: Response) => {
  try {
    const session = await getSession(req);
    if (!session || !session.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const role = session.user.role;
    if (!['super_admin', 'agency', 'processor', 'coordinator', 'accountant', 'genaral'].includes(role)) {
      return res.status(403).json({ error: 'Forbidden' });
    }

    const { id } = req.params;
    const { 
      embassyIssue, 
      cocStatus, 
      medicalStatus, 
      tasheerStatus, 
      wakalaStatus, 
      qrCodeStatus, 
      selectedType, 
      travelDate, 
      agencyStatus 
    } = req.body;

    const updateData: any = {};
    if (embassyIssue !== undefined) updateData.embassyIssue = embassyIssue;
    if (cocStatus !== undefined) updateData.cocStatus = cocStatus;
    if (medicalStatus !== undefined) updateData.medicalStatus = medicalStatus;
    if (tasheerStatus !== undefined) updateData.tasheerStatus = tasheerStatus;
    if (wakalaStatus !== undefined) updateData.wakalaStatus = wakalaStatus;
    if (qrCodeStatus !== undefined) updateData.qrCodeStatus = qrCodeStatus;
    if (selectedType !== undefined) updateData.selectedType = selectedType;
    if (travelDate !== undefined) {
      updateData.travelDate = travelDate ? new Date(travelDate) : null;
    }
    if (agencyStatus !== undefined) updateData.agencyStatus = agencyStatus;

    if (Object.keys(updateData).length > 0) {
      await db.update(candidateTable).set(updateData).where(eq(candidateTable.id, id));
    }

    const [rawCands]: any = await pool.query('SELECT * FROM `Candidate` WHERE `id` = ? LIMIT 1', [id]);
    if (rawCands[0]) {
      const c = rawCands[0];
      res.json({
        id: c.id,
        givenNames: c.givenNames,
        surname: c.surname,
        passportNumber: c.passportNumber,
        embassyIssue: c.embassyIssue,
        cocStatus: c.cocStatus,
        medicalStatus: c.medicalStatus,
        tasheerStatus: c.tasheerStatus,
        wakalaStatus: c.wakalaStatus,
        qrCodeStatus: c.qrCodeStatus,
        selectedType: c.selectedType,
        travelDate: c.travelDate ? new Date(c.travelDate).toISOString() : null,
        agencyStatus: c.agencyStatus
      });
    } else {
      res.status(404).json({ error: 'Candidate not found' });
    }

  } catch (err) {
    console.error('[AGENCY] Failed to patch candidate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
