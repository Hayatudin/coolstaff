import { Router, Request, Response } from 'express';
import prisma from '../lib/prisma';
import { getSession } from '../lib/auth-helper';

const router = Router();

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

    const agencyName = (session.user as any).agency; // e.g. 'ussus'
    if (role === 'agency' && !agencyName) {
      return res.status(400).json({ error: 'User is not assigned to any agency' });
    }

    const queryConditions: any = {};
 
     // If role is agency, only fetch candidates with generated CV for this agency template
     if (role === 'agency') {
       queryConditions.generatedCVs = {
         some: {
           templateId: {
             contains: agencyName.toLowerCase()
           }
         }
       };
     } else {
       // Filter by visaSelected = true (Contracts are candidate selections) for super_admin
       queryConditions.visaSelected = true;
     }

    const dbCandidates = await prisma.candidate.findMany({
      where: queryConditions,
      orderBy: { registeredAt: 'desc' },
      include: {
        generatedCVs: { select: { id: true, templateId: true } },
        broker: { select: { name: true } }
      }
    });

    res.json(dbCandidates.map((c: any) => ({
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
      agencyStatus: c.agencyStatus,
      latestCVTemplate: c.generatedCVs?.[0]?.templateId || null,
      broker: c.broker
    })));

  } catch (err) {
    console.error('[AGENCY] Failed to fetch candidates', err);
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

    // Verify candidate belongs to agency if updating as agency
    if (role === 'agency') {
      const agencyName = (session.user as any).agency;
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

    const updated = await prisma.candidate.update({
      where: { id },
      data: updateData
    });

    res.json(updated);
  } catch (err) {
    console.error('[AGENCY] Failed to patch candidate', err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
