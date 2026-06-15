import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getSession } from '../lib/auth-helper';

const router = Router();

// Auto-verify and create missing columns in Candidate table to prevent crashes on stale databases
async function ensureCandidateColumns() {
  try {
    const columns: any[] = await prisma.$queryRawUnsafe('SHOW COLUMNS FROM `Candidate`');
    const existingFields = new Set(columns.map(c => c.Field.toLowerCase()));
    
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
        await prisma.$executeRawUnsafe(`ALTER TABLE \`Candidate\` ADD COLUMN \`${col.name}\` ${col.definition}`);
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
  if (e.includes('alaalam') || e.includes('alm')) return 'alm';
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
        await prisma.$executeRawUnsafe(
          'UPDATE `User` SET `agency` = ? WHERE `id` = ?',
          inferred,
          user.id
        );
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

    // Get stats from database
    const totalCandidates = await prisma.candidate.count();
    const totalCVs = await prisma.generatedCV.count();
    
    // Get unique template IDs in GeneratedCV
    const uniqueTemplates = await prisma.generatedCV.groupBy({
      by: ['templateId'],
      _count: { id: true }
    });

    const sampleCandidates = await prisma.candidate.findMany({
      take: 5,
      select: {
        id: true,
        givenNames: true,
        surname: true,
        agency: true
      }
    });

    res.json({
      sessionUser: {
        id: session.user.id,
        name: session.user.name,
        email: session.user.email,
        role: role,
        agency: agencyName
      },
      databaseStats: {
        totalCandidates,
        totalCVs,
        uniqueTemplates: uniqueTemplates.map(t => ({ templateId: t.templateId, count: t._count.id })),
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

    const agencyName = await resolveAndHealAgency(session.user); // e.g. 'ussus'
    if (role === 'agency' && !agencyName) {
      return res.status(400).json({ error: 'User is not assigned to any agency' });
    }

    const { agency } = req.query;
    const queryConditions: any = {
      agencySelected: true
    };
 
    if (role === 'agency') {
      const agencyStr = agencyName!.toLowerCase();
      queryConditions.OR = [
        { agency: agencyStr },
        {
          generatedCVs: {
            some: {
              templateId: {
                contains: agencyStr
              }
            }
          }
        }
      ];
    } else {
      // super_admin
      if (agency && agency !== 'all') {
        const agencyStr = String(agency).toLowerCase();
        queryConditions.OR = [
          { agency: agencyStr },
          {
            generatedCVs: {
              some: {
                templateId: {
                  contains: agencyStr
                }
              }
            }
          }
        ];
      }
    }

    let dbCandidates: any[] = [];
    try {
      dbCandidates = await prisma.candidate.findMany({
        where: queryConditions,
        orderBy: { registeredAt: 'desc' },
        include: {
          generatedCVs: { select: { id: true, templateId: true } },
          broker: { select: { name: true } },
          invoices: { select: { id: true, lmisQrCodeUrl: true } }
        }
      });
    } catch (findErr: any) {
      console.warn('[AGENCY] prisma.candidate.findMany failed, trying raw SQL fallback:', findErr.message || findErr);
      
      let sqlQuery = 'SELECT c.*, b.name as brokerName FROM `Candidate` c LEFT JOIN `Broker` b ON c.brokerId = b.id';
      const sqlParams: any[] = [];
      const whereClauses: string[] = [];
      
      if (role === 'agency') {
        const agencyStr = agencyName!.toLowerCase();
        whereClauses.push('c.`agencySelected` = 1');
        whereClauses.push('(LOWER(c.`agency`) = ? OR c.`id` IN (SELECT `candidateId` FROM `GeneratedCV` WHERE LOWER(`templateId`) LIKE ?))');
        sqlParams.push(agencyStr, `%${agencyStr}%`);
      } else {
        if (agency && agency !== 'all') {
          const agencyStr = String(agency).toLowerCase();
          whereClauses.push('c.`agencySelected` = 1');
          whereClauses.push('(LOWER(c.`agency`) = ? OR c.`id` IN (SELECT `candidateId` FROM `GeneratedCV` WHERE LOWER(`templateId`) LIKE ?))');
          sqlParams.push(agencyStr, `%${agencyStr}%`);
        } else {
          whereClauses.push('c.`agencySelected` = 1');
        }
      }
      
      if (whereClauses.length > 0) {
        sqlQuery += ' WHERE ' + whereClauses.join(' AND ');
      }
      
      sqlQuery += ' ORDER BY c.`registeredAt` DESC';
      
      const rawCands: any[] = await prisma.$queryRawUnsafe(sqlQuery, ...sqlParams);
      
      if (rawCands.length > 0) {
        const candidateIds = rawCands.map(c => c.id);
        const allCVs = await prisma.generatedCV.findMany({
          where: { candidateId: { in: candidateIds } },
          select: { id: true, templateId: true, candidateId: true }
        });
        
        const allInvoices = await prisma.invoice.findMany({
          where: { candidateId: { in: candidateIds } },
          select: { candidateId: true, lmisQrCodeUrl: true }
        });
        
        dbCandidates = rawCands.map(c => ({
          ...c,
          generatedCVs: allCVs.filter(cv => cv.candidateId === c.id),
          invoices: allInvoices.filter(i => i.candidateId === c.id),
          broker: c.brokerName ? { name: c.brokerName } : null
        }));
      }
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
        dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth).toISOString() : null,
        videoUrl: c.Youtube_URL || c.quickVideoUrl || null,
        registeredAt: c.registeredAt ? new Date(c.registeredAt).toISOString() : null
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
    const queryConditions: any = {
      agencySelected: false,
      generatedCVs: {
        some: {}
      }
    };
 
    if (role === 'agency') {
      const agencyStr = agencyName!.toLowerCase();
      queryConditions.OR = [
        { agency: agencyStr },
        {
          generatedCVs: {
            some: {
              templateId: {
                contains: agencyStr
              }
            }
          }
        }
      ];
    } else {
      // super_admin
      if (agency && agency !== 'all') {
        const agencyStr = String(agency).toLowerCase();
        queryConditions.OR = [
          { agency: agencyStr },
          {
            generatedCVs: {
              some: {
                templateId: {
                  contains: agencyStr
                }
              }
            }
          }
        ];
      }
    }

    let dbCandidates: any[] = [];
    try {
      dbCandidates = await prisma.candidate.findMany({
        where: queryConditions,
        orderBy: { registeredAt: 'desc' },
        include: {
          generatedCVs: { select: { id: true, templateId: true } },
          broker: { select: { name: true } }
        }
      });
    } catch (findErr: any) {
      console.warn('[AGENCY] prisma.candidate.findMany failed for available candidates, trying raw SQL fallback:', findErr.message || findErr);
      
      let sqlQuery = 'SELECT c.*, b.name as brokerName FROM `Candidate` c LEFT JOIN `Broker` b ON c.brokerId = b.id WHERE c.`agencySelected` = 0 AND c.`id` IN (SELECT DISTINCT `candidateId` FROM `GeneratedCV`)';
      const sqlParams: any[] = [];
      const whereClauses: string[] = [];
      
      if (role === 'agency') {
        const agencyStr = agencyName!.toLowerCase();
        whereClauses.push('(LOWER(c.`agency`) = ? OR c.`id` IN (SELECT `candidateId` FROM `GeneratedCV` WHERE LOWER(`templateId`) LIKE ?))');
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
      
      const rawCands: any[] = await prisma.$queryRawUnsafe(sqlQuery, ...sqlParams);
      
      if (rawCands.length > 0) {
        const candidateIds = rawCands.map(c => c.id);
        const allCVs = await prisma.generatedCV.findMany({
          where: { candidateId: { in: candidateIds } },
          select: { id: true, templateId: true, candidateId: true }
        });
        
        dbCandidates = rawCands.map(c => ({
          ...c,
          generatedCVs: allCVs.filter(cv => cv.candidateId === c.id),
          broker: c.brokerName ? { name: c.brokerName } : null
        }));
      }
    }

    res.json(dbCandidates.map((c: any) => {
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
        dateOfBirth: c.dateOfBirth ? new Date(c.dateOfBirth).toISOString() : null,
        videoUrl: c.Youtube_URL || c.quickVideoUrl || null,
        registeredAt: c.registeredAt ? new Date(c.registeredAt).toISOString() : null,
        facePhotoUrl: c.facePhotoUrl,
        fullBodyPhotoUrl: c.fullBodyPhotoUrl,
        passportImageUrl: c.passportImageUrl,
        nationality: c.nationality,
        educationLevel: c.educationLevel,
        maritalStatus: c.maritalStatus,
        workExperience: c.workExperience,
        skills: c.skills
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

    // Verify candidate belongs to agency if updating as agency
    if (role === 'agency') {
      const candidate = await prisma.candidate.findFirst({
        where: {
          id,
          generatedCVs: {
            some: {
              templateId: {
                contains: agencyName!.toLowerCase()
              }
            }
          }
        }
      });
      if (!candidate) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this candidate' });
      }
    }

    const candidate = await prisma.candidate.findUnique({
      where: { id }
    });

    if (!candidate) {
      return res.status(404).json({ error: 'Candidate not found' });
    }

    const agencyLabel = agencyName ? agencyName.toUpperCase() : 'AGENCY';

    try {
      const updated = await prisma.candidate.update({
        where: { id },
        data: {
          agencySelected: true
        }
      });
      
      await prisma.notification.create({
        data: {
          title: 'Candidate Selected',
          message: `Candidate ${candidate.givenNames} ${candidate.surname} (${candidate.passportNumber}) has been selected by agency ${agencyLabel}.`,
          candidateId: candidate.id
        }
      });
      
      res.json(updated);
    } catch (updateErr: any) {
      console.warn('[AGENCY] Select candidate update failed, trying raw SQL fallback:', updateErr.message || updateErr);
      
      await prisma.$executeRawUnsafe(
        'UPDATE `Candidate` SET `agencySelected` = 1 WHERE `id` = ?',
        id
      );

      // Create notification
      await prisma.notification.create({
        data: {
          title: 'Candidate Selected',
          message: `Candidate ${candidate.givenNames} ${candidate.surname} (${candidate.passportNumber}) has been selected by agency ${agencyLabel}.`,
          candidateId: candidate.id
        }
      });

      // Fetch the updated candidate to return
      const rawCands: any[] = await prisma.$queryRawUnsafe(
        'SELECT * FROM `Candidate` WHERE `id` = ? LIMIT 1',
        id
      );
      res.json(rawCands[0]);
    }

  } catch (err) {
    console.error('[AGENCY] Failed to select candidate', err);
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
    // Allow super_admin, agency, processor, coordinator to update
    if (!['super_admin', 'agency', 'processor', 'coordinator'].includes(role)) {
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

    const agencyName = await resolveAndHealAgency(session.user);

    // Verify candidate belongs to agency if updating as agency
    if (role === 'agency') {
      if (!agencyName) {
        return res.status(400).json({ error: 'User is not assigned to any agency' });
      }
      const candidate = await prisma.candidate.findFirst({
        where: {
          id,
          generatedCVs: {
            some: {
              templateId: {
                contains: agencyName.toLowerCase()
              }
            }
          }
        }
      });
      if (!candidate) {
        return res.status(403).json({ error: 'Forbidden: You do not have access to this candidate' });
      }
    }

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

    try {
      const updated = await prisma.candidate.update({
        where: { id },
        data: updateData
      });
      res.json(updated);
    } catch (updateErr: any) {
      console.warn('[AGENCY] prisma.candidate.update failed, trying raw SQL fallback:', updateErr.message || updateErr);
      
      const fieldsToUpdate: string[] = [];
      const values: any[] = [];
      
      if (embassyIssue !== undefined) {
        fieldsToUpdate.push('`embassyIssue` = ?');
        values.push(embassyIssue);
      }
      if (cocStatus !== undefined) {
        fieldsToUpdate.push('`cocStatus` = ?');
        values.push(cocStatus);
      }
      if (medicalStatus !== undefined) {
        fieldsToUpdate.push('`medicalStatus` = ?');
        values.push(medicalStatus);
      }
      if (tasheerStatus !== undefined) {
        fieldsToUpdate.push('`tasheerStatus` = ?');
        values.push(tasheerStatus);
      }
      if (wakalaStatus !== undefined) {
        fieldsToUpdate.push('`wakalaStatus` = ?');
        values.push(wakalaStatus);
      }
      if (qrCodeStatus !== undefined) {
        fieldsToUpdate.push('`qrCodeStatus` = ?');
        values.push(qrCodeStatus);
      }
      if (selectedType !== undefined) {
        fieldsToUpdate.push('`selectedType` = ?');
        values.push(selectedType);
      }
      if (travelDate !== undefined) {
        fieldsToUpdate.push('`travelDate` = ?');
        values.push(travelDate ? new Date(travelDate) : null);
      }
      if (agencyStatus !== undefined) {
        fieldsToUpdate.push('`agencyStatus` = ?');
        values.push(agencyStatus);
      }

      if (fieldsToUpdate.length > 0) {
        values.push(id);
        const query = `UPDATE \`Candidate\` SET ${fieldsToUpdate.join(', ')} WHERE \`id\` = ?`;
        await prisma.$executeRawUnsafe(query, ...values);
      }

      // Fetch the updated candidate to return
      const rawCands: any[] = await prisma.$queryRawUnsafe(
        'SELECT * FROM `Candidate` WHERE `id` = ? LIMIT 1',
        id
      );
      
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
        res.status(404).json({ error: 'Candidate not found after raw SQL update' });
      }
    }
  } catch (err) {
    console.error('[AGENCY] Failed to patch candidate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
